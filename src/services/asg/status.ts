import type { StackStatus } from "../../types/cli";
import { isStackStatus, parseCliData } from "../../utils/cli";
import type { AsgCommandRunner } from "./command";

export function createStatusService(runner: AsgCommandRunner) {
  return {
    get(): Promise<StackStatus> {
      return runner.run(
        ["status"],
        {
          label: "读取服务状态",
        },
        parseCliData("status", isStackStatus),
      );
    },
  };
}
