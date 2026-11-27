import type { LifecycleAction, LifecycleResult } from "../../types/cli";
import { isLifecycleResult, parseCliData } from "../../utils/cli";
import type { AsgCommandRunner } from "./command";

const ACTION_COPY: Record<
  LifecycleAction,
  { label: string; visualState: "starting" | "restarting" | "loading" }
> = {
  start: { label: "启动整栈", visualState: "starting" },
  stop: { label: "停止整栈", visualState: "loading" },
  restart: { label: "重启整栈", visualState: "restarting" },
};

export function createLifecycleService(runner: AsgCommandRunner) {
  return {
    run(action: LifecycleAction): Promise<LifecycleResult> {
      return runner.run(
        [action],
        ACTION_COPY[action],
        parseCliData(action, isLifecycleResult),
      );
    },
  };
}
