import { onBeforeUnmount, onMounted, watch } from "vue";
import { inTauri, listenNavigate, listenQuitBlocked } from "../services/desktop";
import { useAppearanceStore } from "../stores/appearance";
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
