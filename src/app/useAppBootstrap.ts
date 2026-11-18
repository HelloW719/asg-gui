import { onBeforeUnmount, onMounted, watch } from "vue";
import { inTauri, listenNavigate, listenQuitBlocked } from "../services/desktop";
import { useJobsStore } from "../stores/jobs";
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
  const jobs = useJobsStore();
  const appStatus = useAppStatus();
  const cleanups: Array<() => void> = [];
  let pollTimer: number | null = null;

  function stopPolling(): void {
    if (pollTimer !== null) window.clearInterval(pollTimer);
    pollTimer = null;
  }

  function startPolling(): void {
    stopPolling();
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !jobs.hasRunningOperation) {
        void appStatus.refresh();
      }
    }, 5_000);
  }

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
    () => session.rootValid,
    (valid) => {
      if (!valid) {
        stopPolling();
        statusStore.clear();
        return;
      }
      void appStatus.refresh();
      startPolling();
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
        options.onNavigate(route === "logs" ? "/logs" : "/status");
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

    if (session.rootValid) {
      await appStatus.refresh();
      startPolling();
    }
  });

  onBeforeUnmount(() => {
    stopPolling();
    for (const cleanup of cleanups.splice(0)) cleanup();
  });
}
