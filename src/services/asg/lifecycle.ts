import type { LifecycleAction } from "../../types/cli";
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
    async run(action: LifecycleAction): Promise<void> {
      await runner.run<unknown>([action], ACTION_COPY[action]);
    },
  };
}
