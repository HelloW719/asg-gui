import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { jobClient } from "../services/desktop";
import type { CliResult, JobEvent, VisualState } from "../types/cli";

export interface ExecuteOptions {
  label: string;
  stdin?: string;
  mode?: "json" | "jsonl";
  visualState?: VisualState | null;
  onEvent?: (event: JobEvent) => void;
}

export const useJobsStore = defineStore("jobs", () => {
  const active = ref(0);
  const activeLabels = ref<string[]>([]);
  const operationVisualState = ref<VisualState | null>(null);
  const lastResult = ref<CliResult | null>(null);
  const lastError = ref<string | null>(null);

  const hasRunningOperation = computed(() => active.value > 0);
  const busyLabel = computed(() => activeLabels.value.at(-1) ?? "");

  async function execute<T = unknown>(
    args: string[],
    options: ExecuteOptions,
  ): Promise<CliResult<T>> {
    active.value += 1;
    activeLabels.value.push(options.label);
    operationVisualState.value = options.visualState ?? null;
    lastError.value = null;
    try {
      const job = await jobClient.start(args, {
        stdin: options.stdin,
        mode: options.mode,
        onEvent: options.onEvent,
      });
      const result = (await job.done) as CliResult<T>;
      lastResult.value = result;
      if (!result.ok) {
        lastError.value = result.error?.message ?? `${options.label}失败。`;
      }
      return result;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      active.value = Math.max(0, active.value - 1);
      activeLabels.value.pop();
      operationVisualState.value = active.value > 0 ? operationVisualState.value : null;
    }
  }

  async function stream<T = unknown>(
    args: string[],
    options: ExecuteOptions,
  ): Promise<{
    jobId: string;
    cancellable: boolean;
    done: Promise<CliResult<T>>;
    cancel: () => Promise<void>;
  }> {
    active.value += 1;
    activeLabels.value.push(options.label);
    operationVisualState.value = options.visualState ?? null;
    try {
      const job = await jobClient.start(args, {
        stdin: options.stdin,
        mode: options.mode ?? "jsonl",
        onEvent: options.onEvent,
      });
      const done = job.done
        .then((result) => {
          lastResult.value = result;
          if (!result.ok) lastError.value = result.error?.message ?? `${options.label}失败。`;
          return result as CliResult<T>;
        })
        .catch((error) => {
          lastError.value = error instanceof Error ? error.message : String(error);
          throw error;
        })
        .finally(() => {
          active.value = Math.max(0, active.value - 1);
          activeLabels.value.pop();
          operationVisualState.value =
            active.value > 0 ? operationVisualState.value : null;
        });
      return { jobId: job.jobId, cancellable: job.cancellable, done, cancel: job.cancel };
    } catch (error) {
      active.value -= 1;
      activeLabels.value.pop();
      operationVisualState.value = active.value > 0 ? operationVisualState.value : null;
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  function clearError(): void {
    lastError.value = null;
  }

  return {
    active,
    activeLabels,
    operationVisualState,
    lastResult,
    lastError,
    hasRunningOperation,
    busyLabel,
    execute,
    stream,
    clearError,
  };
});

