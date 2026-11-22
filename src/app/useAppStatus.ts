import { computed } from "vue";
import { useAsgServices } from "./useAsgServices";
import { useJobsStore } from "../stores/jobs";
import { useSessionStore } from "../stores/session";
import { useStatusStore } from "../stores/status";
import type { VisualState } from "../types/cli";
import { deriveVisualState } from "../utils/state";

export function useAppStatus() {
  const session = useSessionStore();
  const statusStore = useStatusStore();
  const jobs = useJobsStore();
  const services = useAsgServices();

  const visualState = computed<VisualState>(() =>
    deriveVisualState({
      rootValid: session.rootValid,
      status: statusStore.status,
      statusPending: statusStore.pending,
      statusError: statusStore.error,
      operationState: jobs.operationVisualState,
    }),
  );

  const serviceOnlineCount = computed(() => {
    if (!statusStore.status) return 0;
    return Object.values(statusStore.status.services).filter((probe) => probe.up).length;
  });

  async function refresh(): Promise<void> {
    if (!session.rootValid || statusStore.pending) return;
    const revision = statusStore.beginRequest();
    try {
      const nextStatus = await services.status.get();
      statusStore.settleRequest(revision, nextStatus, null);
    } catch (error) {
      statusStore.settleRequest(
        revision,
        statusStore.status,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return {
    status: computed(() => statusStore.status),
    statusError: computed(() => statusStore.error),
    statusPending: computed(() => statusStore.pending),
    visualState,
    serviceOnlineCount,
    refresh,
  };
}
