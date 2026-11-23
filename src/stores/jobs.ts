import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { jobClient } from "../services/desktop";
import {
  AsgCommandError,
  type AsgCommandRunner,
  type CliDataParser,
  type AsgRunOptions,
  type AsgStreamHandle,
} from "../services/asg";
import type { CliResult, VisualState } from "../types/cli";

type StoreVisualState = VisualState | null;
interface ActiveOperation {
  id: number;
  label: string;
  visualState: StoreVisualState;
}

export const useJobsStore = defineStore("jobs", () => {
  const operations = ref<ActiveOperation[]>([]);
  const lastResult = ref<CliResult | null>(null);
  const lastError = ref<string | null>(null);
  let nextOperationId = 1;

  const active = computed(() => operations.value.length);
  const activeLabels = computed(() =>
    operations.value.map((operation) => operation.label),
  );
  const operationVisualState = computed(
    () => operations.value.at(-1)?.visualState ?? null,
  );
  const hasRunningOperation = computed(() => active.value > 0);
  const busyLabel = computed(() => activeLabels.value.at(-1) ?? "");

  function startOperation(options: AsgRunOptions): number {
    const id = nextOperationId++;
    operations.value.push({
      id,
      label: options.label,
      visualState: options.visualState ?? null,
    });
    lastError.value = null;
    return id;
  }

  function finishOperation(id: number): void {
    const index = operations.value.findIndex((operation) => operation.id === id);
    if (index >= 0) operations.value.splice(index, 1);
  }

  async function run<T>(
    args: string[],
    options: AsgRunOptions,
    parseData: CliDataParser<T>,
  ): Promise<T> {
    const operationId = startOperation(options);
    try {
      const job = await jobClient.start(args, {
        ...(options.stdin === undefined ? {} : { stdin: options.stdin }),
        ...(options.mode === undefined ? {} : { mode: options.mode }),
        ...(options.onEvent === undefined ? {} : { onEvent: options.onEvent }),
      });
      const result = await job.done;
      lastResult.value = result;
      if (!result.ok) {
        const error = new AsgCommandError(
          result.error,
          result.command,
          `${options.label}失败。`,
          result.data,
        );
        lastError.value = error.message;
        throw error;
      }
      return parseData(result.data);
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      finishOperation(operationId);
    }
  }

  async function stream(
    args: string[],
    options: AsgRunOptions,
  ): Promise<AsgStreamHandle<unknown>> {
    const operationId = startOperation(options);
    try {
      const job = await jobClient.start(args, {
        ...(options.stdin === undefined ? {} : { stdin: options.stdin }),
        mode: options.mode ?? "jsonl",
        ...(options.onEvent === undefined ? {} : { onEvent: options.onEvent }),
      });
      const done = job.done
        .then((result) => {
          lastResult.value = result;
          if (!result.ok) {
            const error = new AsgCommandError(
              result.error,
              result.command,
              `${options.label}失败。`,
              result.data,
            );
            lastError.value = error.message;
            throw error;
          }
          return result.data;
        })
        .catch((error) => {
          lastError.value = error instanceof Error ? error.message : String(error);
          throw error;
        })
        .finally(() => finishOperation(operationId));
      return {
        jobId: job.jobId,
        cancellable: job.cancellable,
        done,
        cancel: job.cancel,
      };
    } catch (error) {
      finishOperation(operationId);
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
