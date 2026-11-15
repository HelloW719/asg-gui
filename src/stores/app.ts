import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  chooseAsgRoot,
  clearAsgRoot,
  getDesktopAppState,
  inTauri,
  setAsgRoot,
  setDesktopTheme,
} from "../services/desktop";
import { jobClient } from "../services/desktop";
import type {
  CliResult,
  DesktopAppState,
  RootSelection,
  StackStatus,
  ThemePreference,
  VisualState,
} from "../types/cli";
import { deriveVisualState } from "../utils/state";
import { useJobsStore } from "./jobs";

const systemThemeQuery = "(prefers-color-scheme: dark)";

export const useAppStore = defineStore("app", () => {
  const hydrated = ref(false);
  const bridgeAvailable = ref(inTauri);
  const root = ref<string | null>(null);
  const rootValid = ref(false);
  const invalidReason = ref<string | null>(null);
  const platform = ref<DesktopAppState["platform"]>("unknown");
  const guiVersion = ref("0.1.0");
  const themePreference = ref<ThemePreference>("system");
  const systemDark = ref(window.matchMedia(systemThemeQuery).matches);
  const reducedMotion = ref(false);
  const reducedTransparency = ref(false);
  const status = ref<StackStatus | null>(null);
  const statusError = ref<string | null>(null);
  const statusPending = ref(false);
  let pollTimer: number | null = null;
  let inFlightStatus: Promise<void> | null = null;

  const jobs = useJobsStore();

  const resolvedTheme = computed<"dark" | "light">(() =>
    themePreference.value === "system"
      ? systemDark.value
        ? "dark"
        : "light"
      : themePreference.value,
  );

  const visualState = computed<VisualState>(() =>
    deriveVisualState({
      rootValid: rootValid.value,
      status: status.value,
      statusPending: statusPending.value,
      statusError: statusError.value,
      operationState: jobs.operationVisualState,
    }),
  );

  const serviceOnlineCount = computed(() => {
    if (!status.value) return 0;
    return Object.values(status.value.services).filter((probe) => probe.up).length;
  });

  function applyTheme(): void {
    document.documentElement.dataset.theme = resolvedTheme.value;
    document.documentElement.dataset.platform = platform.value;
    document.documentElement.dataset.reducedMotion = String(reducedMotion.value);
    document.documentElement.dataset.reducedTransparency = String(reducedTransparency.value);
  }

  async function initialize(): Promise<void> {
    const media = window.matchMedia(systemThemeQuery);
    media.addEventListener("change", (event) => {
      systemDark.value = event.matches;
      applyTheme();
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.value = motion.matches;
    motion.addEventListener("change", (event) => {
      reducedMotion.value = event.matches;
      applyTheme();
    });
    reducedTransparency.value =
      localStorage.getItem("asg-gui-reduced-transparency") === "true";

    if (!inTauri) {
      hydrated.value = true;
      applyTheme();
      return;
    }

    try {
      await jobClient.initialize();
      const state = await getDesktopAppState();
      applyAppState(state);
      if (state.rootValid) {
        await refreshStatus();
        startPolling();
      }
    } catch (error) {
      statusError.value = error instanceof Error ? error.message : String(error);
    } finally {
      hydrated.value = true;
      applyTheme();
    }
  }

  function applyAppState(state: DesktopAppState): void {
    root.value = state.root;
    rootValid.value = state.rootValid;
    invalidReason.value = state.invalidReason ?? null;
    platform.value = state.platform;
    guiVersion.value = state.version;
    themePreference.value = state.theme;
  }

  async function chooseRoot(): Promise<RootSelection | null> {
    try {
      const selection = await chooseAsgRoot();
      if (!selection) return null;
      applySelection(selection);
      if (selection.valid) {
        await refreshStatus();
        startPolling();
      }
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
    if (selection.valid) {
      await refreshStatus();
      startPolling();
    }
    return selection;
  }

  function applySelection(selection: RootSelection): void {
    root.value = selection.path || null;
    rootValid.value = selection.valid;
    invalidReason.value = selection.reason ?? null;
  }

  async function forgetRoot(): Promise<void> {
    stopPolling();
    await clearAsgRoot();
    root.value = null;
    rootValid.value = false;
    invalidReason.value = null;
    status.value = null;
    statusError.value = null;
  }

  async function setTheme(theme: ThemePreference): Promise<void> {
    themePreference.value = theme;
    applyTheme();
    if (inTauri) await setDesktopTheme(theme);
  }

  function toggleTheme(): void {
    const next = resolvedTheme.value === "dark" ? "light" : "dark";
    void setTheme(next);
  }

  function setReducedMotion(value: boolean): void {
    reducedMotion.value = value;
    applyTheme();
  }

  function setReducedTransparency(value: boolean): void {
    reducedTransparency.value = value;
    localStorage.setItem("asg-gui-reduced-transparency", String(value));
    applyTheme();
  }

  async function refreshStatus(): Promise<void> {
    if (!rootValid.value || !inTauri) return;
    if (inFlightStatus) return inFlightStatus;
    statusPending.value = true;
    inFlightStatus = jobClient
      .start(["status"])
      .then((job) => job.done)
      .then((result) => {
        const typed = result as CliResult<StackStatus>;
        if (typed.ok && typed.data) {
          status.value = typed.data;
          statusError.value = null;
        } else {
          statusError.value =
            typed.error?.message ?? "状态命令未返回服务信息。";
        }
      })
      .catch((error) => {
        statusError.value = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        statusPending.value = false;
        inFlightStatus = null;
      });
    return inFlightStatus;
  }

  function startPolling(): void {
    stopPolling();
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !jobs.hasRunningOperation) {
        void refreshStatus();
      }
    }, 5_000);
  }

  function stopPolling(): void {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && rootValid.value) {
      void refreshStatus();
    }
  });

  return {
    hydrated,
    bridgeAvailable,
    root,
    rootValid,
    invalidReason,
    platform,
    guiVersion,
    themePreference,
    resolvedTheme,
    reducedMotion,
    reducedTransparency,
    status,
    statusError,
    statusPending,
    visualState,
    serviceOnlineCount,
    initialize,
    chooseRoot,
    chooseRootPath,
    forgetRoot,
    setTheme,
    toggleTheme,
    setReducedMotion,
    setReducedTransparency,
    refreshStatus,
    startPolling,
    stopPolling,
    applyTheme,
  };
});

