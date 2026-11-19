import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { jobClient } from "../services/desktop";
import {
  AsgCommandError,
  type AsgCommandRunner,
  type AsgRunOptions,
  type AsgStreamHandle,
} from "../services/asg";
import type { CliResult, VisualState } from "../types/cli";

type StoreVisualState = VisualState | null;

export const useJobsStore = defineStore("jobs", () => {
  const active = ref(0);
  const activeLabels = ref<string[]>([]);
  const operationVisualState = ref<StoreVisualState>(null);
  const lastResult = ref<CliResult | null>(null);
  const lastError = ref<string | null>(null);

  let lastVisualState: StoreVisualState = null;

  const hasRunningOperation = computed(() => active.value > 0);
  const busyLabel = computed(() => activeLabels.value.at(-1) ?? "");

  function startOperation(options: AsgRunOptions): void {
    active.value += 1;
    activeLabels.value.push(options.label);
    lastVisualState = options.visualState ?? null;
    operationVisualState.value = lastVisualState;
    lastError.value = null;
  }

  function finishOperation(): void {
    active.value = Math.max(0, active.value - 1);
    activeLabels.value.pop();
    operationVisualState.value = active.value > 0 ? lastVisualState : null;
    if (active.value === 0) lastVisualState = null;
  }

  async function run<T>(args: string[], options: AsgRunOptions): Promise<T> {
    startOperation(options);
    try {
      const job = await jobClient.start(args, {
        stdin: options.stdin,
        mode: options.mode,
        onEvent: options.onEvent,
      });
      const result = (await job.done) as CliResult<T>;
      lastResult.value = result;
      if (!result.ok) {
        const error = new AsgCommandError(
          result.error ?? { code: "unknown", message: `${options.label}失败。` },
          result.command,
          `${options.label}失败。`,
          result.data,
        );
        lastError.value = error.message;
        throw error;
      }
      return result.data as T;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      finishOperation();
    }
  }

  async function stream<T>(
    args: string[],
    options: AsgRunOptions,
  ): Promise<AsgStreamHandle<T>> {
    startOperation(options);
    try {
      const job = await jobClient.start(args, {
        stdin: options.stdin,
        mode: options.mode ?? "jsonl",
        onEvent: options.onEvent,
      });
      const done = job.done
        .then((result) => {
          lastResult.value = result;
          if (!result.ok) {
            const error = new AsgCommandError(
              result.error ?? { code: "unknown", message: `${options.label}失败。` },
              result.command,
              `${options.label}失败。`,
              result.data,
            );
            lastError.value = error.message;
            throw error;
          }
          return result.data as T;
        })
        .catch((error) => {
          lastError.value = error instanceof Error ? error.message : String(error);
          throw error;
        })
        .finally(() => finishOperation());
      return {
        jobId: job.jobId,
        cancellable: job.cancellable,
        done,
        cancel: job.cancel,
      };
    } catch (error) {
      finishOperation();
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  const commandRunner: AsgCommandRunner = { run, stream };

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
    commandRunner,
    clearError,
  };
});
