import { ref } from "vue";
import { defineStore } from "pinia";
import {
  chooseAsgRoot,
  clearAsgRoot,
  detectDefaultAsgRoot,
  getDesktopAppState,
  inTauri,
  setAsgRoot,
  setDesktopOnboardingCompleted,
} from "../services/desktop";
import type {
  DesktopAppState,
  RootSelection,
  ThemePreference,
} from "../types/cli";

export const useSessionStore = defineStore("session", () => {
  const hydrated = ref(false);
  const bridgeAvailable = ref(inTauri);
  const root = ref<string | null>(null);
  const rootValid = ref(false);
  const invalidReason = ref<string | null>(null);
  const platform = ref<DesktopAppState["platform"]>("unknown");
  const guiVersion = ref("0.1.0");
  const onboardingCompleted = ref(true);

  function applyAppState(state: DesktopAppState): void {
    root.value = state.root;
    rootValid.value = state.rootValid;
    invalidReason.value = state.invalidReason ?? null;
    platform.value = state.platform;
    guiVersion.value = state.version;
    onboardingCompleted.value = state.onboardingCompleted;
  }

  function applySelection(selection: RootSelection): void {
    root.value = selection.path || null;
    rootValid.value = selection.valid;
    invalidReason.value = selection.reason ?? null;
  }

  async function initialize(): Promise<ThemePreference | null> {
    if (!inTauri) {
      hydrated.value = true;
      return null;
    }
    try {
      const state = await getDesktopAppState();
      applyAppState(state);
      if (!state.rootValid) {
        const detected = await detectDefaultAsgRoot();
        if (detected?.valid) {
          applySelection(detected);
          onboardingCompleted.value = false;
        }
      }
      return state.theme;
    } finally {
      hydrated.value = true;
    }
  }

  async function chooseRoot(): Promise<RootSelection | null> {
    try {
      const selection = await chooseAsgRoot();
      if (!selection) return null;
      applySelection(selection);
      return selection;
    } catch (error) {
      invalidReason.value = error instanceof Error ? error.message : String(error);
      rootValid.value = false;
      return null;
    }
  }

  async function chooseRootPath(path: string): Promise<RootSelection> {
    const selection = await setAsgRoot(path);
    applySelection(selection);
    return selection;
  }

  async function detectRoot(): Promise<RootSelection | null> {
    try {
      const selection = await detectDefaultAsgRoot();
      if (selection) applySelection(selection);
      return selection;
    } catch (error) {
      invalidReason.value = error instanceof Error ? error.message : String(error);
      rootValid.value = false;
      return null;
    }
  }

  async function setOnboardingCompleted(completed: boolean): Promise<void> {
    await setDesktopOnboardingCompleted(completed);
    onboardingCompleted.value = completed;
  }

  async function forgetRoot(): Promise<void> {
    await clearAsgRoot();
    root.value = null;
    rootValid.value = false;
    invalidReason.value = null;
  }

  return {
    hydrated,
    bridgeAvailable,
    root,
    rootValid,
    invalidReason,
    platform,
    guiVersion,
    onboardingCompleted,
    initialize,
    detectRoot,
    chooseRoot,
    chooseRootPath,
    setOnboardingCompleted,
    forgetRoot,
  };
});
