import { ref } from "vue";
import { defineStore } from "pinia";
import type { StackStatus } from "../types/cli";

export const useStatusStore = defineStore("status", () => {
  const status = ref<StackStatus | null>(null);
  const error = ref<string | null>(null);
  const pending = ref(false);
  let requestRevision = 0;

  function beginRequest(): number {
    const revision = ++requestRevision;
    pending.value = true;
    error.value = null;
    return revision;
  }

  function settleRequest(
    revision: number,
    nextStatus: StackStatus | null,
    nextError: string | null,
  ): boolean {
    if (revision !== requestRevision) return false;
    status.value = nextStatus;
    error.value = nextError;
    pending.value = false;
    return true;
  }

  function clear(): void {
    requestRevision += 1;
    status.value = null;
    error.value = null;
    pending.value = false;
  }

  return {
    status,
    error,
    pending,
    beginRequest,
    settleRequest,
    clear,
  };
});
