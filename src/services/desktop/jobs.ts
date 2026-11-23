import type { CliResult, JobEvent, JobStart } from "../../types/cli";
import { isCliResult } from "../../utils/cli";
import { cancelCliJob, inTauri, startCliJob } from "./api";
import { listenJobEvents } from "./events";

export interface RunningJob {
  jobId: string;
  cancellable: boolean;
  mutating: boolean;
  done: Promise<CliResult>;
  cancel: () => Promise<void>;
}

interface InternalJob {
  listeners: Set<(event: JobEvent) => void>;
  result?: CliResult;
  resolve: (result: CliResult) => void;
  reject: (error: unknown) => void;
  done: Promise<CliResult>;
}

export class JobClient {
  private initialization: Promise<void> | null = null;
  private readonly jobs = new Map<string, InternalJob>();
  private readonly unbound = new Map<string, JobEvent[]>();

  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = listenJobEvents((event) => this.handleEvent(event)).then(() => {
        // The unlisten callback lives for the app lifetime.
      });
    }
    return this.initialization;
  }

  async start(
    args: string[],
    options: {
      stdin?: string | null;
      mode?: "json" | "jsonl";
      onEvent?: (event: JobEvent) => void;
    } = {},
  ): Promise<RunningJob> {
    if (!inTauri) {
      throw new Error("CLI 桥接只在 Tauri 桌面窗口中可用。");
    }
    await this.initialize();
    const started: JobStart = await startCliJob(
      args,
      options.stdin ?? null,
      options.mode ?? "json",
    );
    const job = this.ensure(started.jobId, options.onEvent);
    return {
      jobId: started.jobId,
      cancellable: started.cancellable,
      mutating: started.mutating,
      done: job.done,
      cancel: () => cancelCliJob(started.jobId),
    };
  }

  private ensure(
    jobId: string,
    listener?: (event: JobEvent) => void,
  ): InternalJob {
    const existing = this.jobs.get(jobId);
    if (existing) {
      if (listener) existing.listeners.add(listener);
      return existing;
    }

    let resolve!: (result: CliResult) => void;
    let reject!: (error: unknown) => void;
    const done = new Promise<CliResult>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const job: InternalJob = {
      listeners: new Set(),
      resolve,
      reject,
      done,
    };
    this.jobs.set(jobId, job);
    if (listener) job.listeners.add(listener);
    const buffered = this.unbound.get(jobId) ?? [];
    this.unbound.delete(jobId);
    for (const event of buffered) this.applyEvent(job, event);
    return job;
  }

  private handleEvent(event: JobEvent): void {
    const job = this.jobs.get(event.jobId);
    if (!job) {
      const buffered = this.unbound.get(event.jobId) ?? [];
      buffered.push(event);
      this.unbound.set(event.jobId, buffered);
      return;
    }
    this.applyEvent(job, event);
  }

  private applyEvent(job: InternalJob, event: JobEvent): void {
    for (const listener of job.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("ASG 任务事件订阅失败：", error);
      }
    }

    if (event.kind === "result") {
      const candidate = event.data;
      if (isCliResult(candidate)) job.result = candidate;
    }

    if (event.kind === "cancelled") {
      job.reject(new Error("任务已取消"));
      job.listeners.clear();
    }

    if (event.kind === "exit") {
      if (job.result) {
        job.resolve(job.result);
      } else {
        const code =
          typeof event.data === "number"
            ? `（退出码 ${event.data}）`
            : "";
        job.reject(new Error(`CLI 任务未返回结构化结果${code}`));
      }
      job.listeners.clear();
      setTimeout(() => this.jobs.delete(event.jobId), 1_000);
    }
  }
}

export const jobClient = new JobClient();
