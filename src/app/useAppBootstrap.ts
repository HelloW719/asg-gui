import { onBeforeUnmount, onMounted, watch } from "vue";
import { inTauri, listenNavigate, listenQuitBlocked } from "../services/desktop";
import {
  REDUCED_MOTION_QUERY,
  SYSTEM_THEME_QUERY,
  useAppearanceStore,
} from "../stores/appearance";
import { useSessionStore } from "../stores/session";
import { useStatusStore } from "../stores/status";
import { useAppStatus } from "./useAppStatus";

interface AppBootstrapOptions {
  onNavigate: (route: string) => void;
  onQuitBlocked: (message: string) => void;
}

export function useAppBootstrap(options: AppBootstrapOptions): void {
  const session = useSessionStore();
  const appearance = useAppearanceStore();
  const statusStore = useStatusStore();
  const appStatus = useAppStatus();
  const cleanups: Array<() => void> = [];

  function applyDocumentState(): void {
    document.documentElement.dataset.theme = appearance.resolvedTheme;
    document.documentElement.dataset.platform = session.platform;
    document.documentElement.dataset.reducedMotion = String(
      appearance.reducedMotion,
    );
    document.documentElement.dataset.reducedTransparency = String(
      appearance.reducedTransparency,
    );
  }

  watch(
    () => [
      appearance.resolvedTheme,
      appearance.reducedMotion,
      appearance.reducedTransparency,
      session.platform,
    ] as const,
    applyDocumentState,
    { immediate: true },
  );

  watch(
    () => [session.root, session.rootValid] as const,
    ([root, valid], [previousRoot]) => {
      if (!valid) {
        statusStore.clear();
        return;
      }
      if (root !== previousRoot) statusStore.clear();
      void appStatus.refresh();
    },
  );

  onMounted(async () => {
    appearance.initialize();
    const themeMedia = window.matchMedia(SYSTEM_THEME_QUERY);
    const motionMedia = window.matchMedia(REDUCED_MOTION_QUERY);
    const onThemeChange = (event: MediaQueryListEvent) => {
      appearance.setSystemDark(event.matches);
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      appearance.setReducedMotion(event.matches);
    };
    themeMedia.addEventListener("change", onThemeChange);
    motionMedia.addEventListener("change", onMotionChange);
    cleanups.push(() => {
      themeMedia.removeEventListener("change", onThemeChange);
      motionMedia.removeEventListener("change", onMotionChange);
    });

    const savedTheme = await session.initialize();
    if (savedTheme) appearance.applyPreference(savedTheme);
    applyDocumentState();

    if (!inTauri) return;

    cleanups.push(
      await listenNavigate((route) => {
        const destination =
          route.replace(/^\/+/, "") === "logs" ? "/logs" : "/status";
        options.onNavigate(destination);
      }),
    );
    cleanups.push(
      await listenQuitBlocked((payload) => {
        options.onQuitBlocked(
          payload.message ?? "写操作尚未完成，暂时不能退出 GUI。",
        );
      }),
    );

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && session.rootValid) {
        void appStatus.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    cleanups.push(() =>
      document.removeEventListener("visibilitychange", onVisibilityChange),
    );

  });

  onBeforeUnmount(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  });
}
