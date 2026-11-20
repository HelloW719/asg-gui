import { computed, onMounted, ref } from "vue";
import { useAppStatus } from "@/app/useAppStatus";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import { useSessionStore } from "@/stores/session";
import type {
  DoctorCheck,
  LifecycleAction,
  LogLine,
  ServiceProbe,
} from "@/types/cli";

export interface DashboardServiceCard {
  name: string;
  displayName: string;
  probe: ServiceProbe;
}

export function useDashboard() {
  const session = useSessionStore();
  const appStatus = useAppStatus();
  const jobs = useJobsStore();
  const serviceClient = useAsgServices();
  const pendingAction = ref<Exclude<LifecycleAction, "start"> | null>(null);
  const recentLogs = ref<LogLine[]>([]);
  const doctorChecks = ref<DoctorCheck[]>([]);
  const diagnosticsLoaded = ref(false);
  const actionError = ref<string | null>(null);

  const serviceCards = computed<DashboardServiceCard[]>(() => {
    const data = appStatus.status.value?.services;
    return [
      { name: "gateway", displayName: "Gateway", probe: data?.gateway },
      { name: "searxng", displayName: "SearXNG", probe: data?.searxng },
      {
        name: "flaresolverr",
        displayName: "FlareSolverr",
        probe: data?.flaresolverr,
      },
    ].filter((item): item is DashboardServiceCard => Boolean(item.probe));
  });

  async function loadRecentLogs(): Promise<void> {
    try {
      recentLogs.value = (await serviceClient.logs.read(8)).slice(-8);
    } catch {
      // The dashboard remains usable when logs are absent.
    }
  }

  async function runLifecycle(action: LifecycleAction): Promise<void> {
    actionError.value = null;
    try {
      await serviceClient.lifecycle.run(action);
      await appStatus.refresh();
      await loadRecentLogs();
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : String(error);
    }
  }

  async function runDoctor(): Promise<void> {
    actionError.value = null;
    try {
      doctorChecks.value = await serviceClient.maintenance.doctor();
      diagnosticsLoaded.value = true;
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : String(error);
    }
  }

  function requestLifecycle(action: Exclude<LifecycleAction, "start">): void {
    pendingAction.value = action;
  }

  function confirmPending(): void {
    if (!pendingAction.value) return;
    const action = pendingAction.value;
    pendingAction.value = null;
    void runLifecycle(action);
  }

  onMounted(loadRecentLogs);

  return {
    session,
    appStatus,
    jobs,
    pendingAction,
    recentLogs,
    doctorChecks,
    diagnosticsLoaded,
    actionError,
    serviceCards,
    runLifecycle,
    runDoctor,
    requestLifecycle,
    confirmPending,
  };
}
