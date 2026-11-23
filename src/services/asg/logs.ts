import type { JobEvent, LogLine } from "../../types/cli";
import { isLogReadResult, parseCliData } from "../../utils/cli";
import type {
  AsgCommandRunner,
  AsgStreamHandle,
} from "./command";

export interface FollowLogHandle {
  jobId: string;
  cancellable: boolean;
  done: Promise<void>;
  cancel: () => Promise<void>;
}

function withServices(args: string[], services: readonly string[]): string[] {
  return ["logs", ...services, ...args];
}

export function createLogService(runner: AsgCommandRunner) {
  return {
    async read(lines: number, services: readonly string[] = []): Promise<LogLine[]> {
      const result = await runner.run(
        withServices(["--lines", String(lines)], services),
        { label: "读取日志" },
        parseCliData("logs", isLogReadResult),
      );
      return result.lines;
    },

    async follow(
      services: readonly string[],
      onEvent: (event: JobEvent) => void,
    ): Promise<FollowLogHandle> {
      const stream: AsgStreamHandle<unknown> = await runner.stream(
        withServices(["-f"], services),
        {
          label: "跟随日志",
          mode: "jsonl",
          onEvent,
        },
      );
      return {
        jobId: stream.jobId,
        cancellable: stream.cancellable,
        done: stream.done.then(() => undefined),
        cancel: stream.cancel,
      };
    },
  };
}
