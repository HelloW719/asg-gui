import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CliResult } from "../types/cli";

const startMock = vi.hoisted(() => vi.fn());

vi.mock("../services/desktop", () => ({
  jobClient: { start: startMock },
}));

import { useJobsStore } from "./jobs";

interface PendingJob {
  resolve: (result: CliResult) => void;
}

function successResult(command = "fixture"): CliResult {
  return { schema_version: 1, ok: true, command, data: {} };
}

describe("jobs store concurrency", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    startMock.mockReset();
  });

  it("tracks labels and visual state by active operation", async () => {
    const pending: PendingJob[] = [];
    startMock.mockImplementation(async () => {
      let resolve!: (result: CliResult) => void;
      const done = new Promise<CliResult>((promiseResolve) => {
        resolve = promiseResolve;
      });
      pending.push({ resolve });
      return {
        jobId: `job-${pending.length}`,
        cancellable: false,
        mutating: false,
        done,
        cancel: vi.fn(),
      };
    });

    const jobs = useJobsStore();
    const first = jobs.commandRunner.run([], {
      label: "第一个任务",
      visualState: "loading",
    });
    await vi.waitFor(() => expect(pending).toHaveLength(1));

    const second = jobs.commandRunner.run([], {
      label: "第二个任务",
      visualState: "restarting",
    });
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    expect(jobs.active).toBe(2);
    expect(jobs.activeLabels).toEqual(["第一个任务", "第二个任务"]);
    expect(jobs.operationVisualState).toBe("restarting");

    pending[1]!.resolve(successResult());
    await second;
    expect(jobs.active).toBe(1);
    expect(jobs.activeLabels).toEqual(["第一个任务"]);
    expect(jobs.operationVisualState).toBe("loading");
    expect(jobs.busyLabel).toBe("第一个任务");

    pending[0]!.resolve(successResult());
    await first;
    expect(jobs.active).toBe(0);
    expect(jobs.activeLabels).toEqual([]);
    expect(jobs.operationVisualState).toBeNull();
  });
});
