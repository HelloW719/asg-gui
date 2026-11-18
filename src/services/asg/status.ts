import type { StackStatus } from "../../types/cli";
import type { AsgCommandRunner } from "./command";

export function createStatusService(runner: AsgCommandRunner) {
  return {
    get(): Promise<StackStatus> {
      return runner.run<StackStatus>(["status"], {
        label: "读取服务状态",
      });
    },
  };
}
