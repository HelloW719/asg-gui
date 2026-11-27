import type {
  ConfigMutationResult,
  ConfigValidationResult,
} from "../../types/cli";
import {
  isConfigMutationResult,
  isConfigValidationResult,
  isRecord,
  parseCliData,
} from "../../utils/cli";
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

    validate(): Promise<ConfigValidationResult> {
      return runner.run(
        ["config", "validate"],
        {
          label: "校验配置",
        },
        parseCliData("config validate", isConfigValidationResult),
      );
    },

    set(
      path: string,
      value: string,
      originalIsString: boolean,
    ): Promise<ConfigMutationResult> {
      const args = ["config", "set", path, value];
      if (originalIsString) args.push("--string");
      return runner.run(
        args,
        {
          label: `保存 ${path}`,
          visualState: "restarting",
        },
        parseCliData("config set", isConfigMutationResult),
      );
    },

    setSecret(path: string, secret: string): Promise<ConfigMutationResult> {
      return runner.run(
        ["config", "set", path, "--stdin"],
        {
          label: "保存密钥",
          stdin: secret,
          visualState: "restarting",
        },
        parseCliData("config set", isConfigMutationResult),
      );
    },
  };
}
