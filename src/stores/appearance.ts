import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { inTauri, setDesktopTheme } from "../services/desktop";
import type { ThemePreference } from "../types/cli";

const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_TRANSPARENCY_KEY = "asg-gui-reduced-transparency";

export const useAppearanceStore = defineStore("appearance", () => {
  const themePreference = ref<ThemePreference>("system");
  const systemDark = ref(window.matchMedia(SYSTEM_THEME_QUERY).matches);
  const reducedMotion = ref(false);
  const reducedTransparency = ref(false);
  let initialized = false;

  const resolvedTheme = computed<"dark" | "light">(() =>
    themePreference.value === "system"
      ? systemDark.value
        ? "dark"
        : "light"
      : themePreference.value,
  );

  function initialize(): void {
    if (initialized) return;
    initialized = true;

    const themeMedia = window.matchMedia(SYSTEM_THEME_QUERY);
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.value = motionMedia.matches;
    reducedTransparency.value =
      localStorage.getItem(REDUCED_TRANSPARENCY_KEY) === "true";

    themeMedia.addEventListener("change", (event) => {
      systemDark.value = event.matches;
    });
    motionMedia.addEventListener("change", (event) => {
      reducedMotion.value = event.matches;
    });
  }

  function applyPreference(theme: ThemePreference): void {
    themePreference.value = theme;
  }

  async function setTheme(theme: ThemePreference): Promise<void> {
    themePreference.value = theme;
    if (inTauri) await setDesktopTheme(theme);
  }

  function toggleTheme(): void {
    void setTheme(resolvedTheme.value === "dark" ? "light" : "dark");
  }

  function setReducedMotion(value: boolean): void {
    reducedMotion.value = value;
  }

  function setReducedTransparency(value: boolean): void {
    reducedTransparency.value = value;
    localStorage.setItem(REDUCED_TRANSPARENCY_KEY, String(value));
  }

  return {
    themePreference,
    resolvedTheme,
    reducedMotion,
    reducedTransparency,
    initialize,
    applyPreference,
    setTheme,
    toggleTheme,
    setReducedMotion,
    setReducedTransparency,
  };
});
