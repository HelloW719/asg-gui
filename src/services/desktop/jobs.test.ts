import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CliResult, JobEvent } from "../../types/cli";

const startCliJob = vi.hoisted(() => vi.fn());
const cancelCliJob = vi.hoisted(() => vi.fn());
const listenJobEvents = vi.hoisted(() => vi.fn());

vi.mock("./api", () => ({
  inTauri: true,
  startCliJob,
  cancelCliJob,
}));

vi.mock("./events", () => ({
  listenJobEvents,
}));

import { JobClient } from "./jobs";

const result: CliResult = {
  schema_version: 1,
  ok: true,
  command: "logs",
  data: {},
};

function stdout(line: string, jobId = "job-1"): JobEvent {
  return {
    jobId,
    kind: "stdout",
    data: {
      type: "event",
      schema_version: 1,
      event: "log",
      line,
    },
  };
}

describe("JobClient event delivery", () => {
  let deliver: (event: JobEvent) => void;

  beforeEach(() => {
    startCliJob.mockReset();
    cancelCliJob.mockReset();
    listenJobEvents.mockReset();
    listenJobEvents.mockImplementation(
      async (handler: (event: JobEvent) => void) => {
        deliver = handler;
        return vi.fn();
      },
    );
    startCliJob.mockResolvedValue({
      jobId: "job-1",
      cancellable: true,
      mutating: false,
    });
  });

  it("delivers events that arrive before the start invocation resolves", async () => {
    startCliJob.mockImplementation(async () => {
      deliver(stdout("first"));
      deliver({ jobId: "job-1", kind: "result", data: result });
      deliver({ jobId: "job-1", kind: "exit", data: 0 });
      return {
        jobId: "job-1",
        cancellable: true,
        mutating: false,
      };
    });
    const client = new JobClient();
    const received: JobEvent[] = [];

    const running = await client.start([], {
      mode: "jsonl",
      onEvent: (event) => received.push(event),
    });

    await expect(running.done).resolves.toEqual(result);
    expect(received.map((event) => event.kind)).toEqual([
      "stdout",
      "result",
      "exit",
    ]);
  });

  it("settles the job even when a UI event listener throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new JobClient();
    const running = await client.start([], {
      onEvent: () => {
        throw new Error("fixture listener failure");
      },
    });

    deliver({ jobId: "job-1", kind: "result", data: result });
    deliver({ jobId: "job-1", kind: "exit", data: 0 });

    await expect(running.done).resolves.toEqual(result);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("stops forwarding late stdout after cancellation", async () => {
    const client = new JobClient();
    const received: JobEvent[] = [];
    const running = await client.start([], {
      onEvent: (event) => received.push(event),
    });
    const settled = expect(running.done).rejects.toThrow("任务已取消");

    deliver(stdout("before cancel"));
    deliver({ jobId: "job-1", kind: "cancelled" });
    deliver(stdout("after cancel"));
    deliver({ jobId: "job-1", kind: "exit", data: null });

    await settled;
    expect(received.map((event) => event.kind)).toEqual([
      "stdout",
      "cancelled",
    ]);
  });
});
