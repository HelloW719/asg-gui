import { ref } from "vue";
import { defineStore } from "pinia";
import type { StackStatus } from "../types/cli";

export const useStatusStore = defineStore("status", () => {
  const status = ref<StackStatus | null>(null);
  const error = ref<string | null>(null);
  const pending = ref(false);

  function clear(): void {
    status.value = null;
    error.value = null;
    pending.value = false;
  }

  return {
    status,
    error,
    pending,
    clear,
  };
});
