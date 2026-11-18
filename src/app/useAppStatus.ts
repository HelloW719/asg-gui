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
    statusStore.pending = true;
    statusStore.error = null;
    try {
      statusStore.status = await services.status.get();
    } catch (error) {
      statusStore.error = error instanceof Error ? error.message : String(error);
    } finally {
      statusStore.pending = false;
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
