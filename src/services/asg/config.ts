import { isRecord, parseCliData, parseVoidData } from "../../utils/cli";
import type { AsgCommandRunner } from "./command";

export function createConfigService(runner: AsgCommandRunner) {
  return {
    getAll(): Promise<Record<string, unknown>> {
      return runner.run(
        ["config", "get", "--all"],
        {
          label: "读取配置",
        },
        parseCliData("config get", isRecord),
      );
    },

    async validate(): Promise<void> {
      await runner.run(
        ["config", "validate"],
        {
          label: "校验配置",
        },
        parseVoidData,
      );
    },

    async set(path: string, value: string, originalIsString: boolean): Promise<void> {
      const args = ["config", "set", path, value];
      if (originalIsString) args.push("--string");
      await runner.run(
        args,
        {
          label: `保存 ${path}`,
          visualState: "restarting",
        },
        parseVoidData,
      );
    },

    async setSecret(path: string, secret: string): Promise<void> {
      await runner.run(
        ["config", "set", path, "--stdin"],
        {
          label: "保存密钥",
          stdin: secret,
          visualState: "restarting",
        },
        parseVoidData,
      );
    },
  };
}
