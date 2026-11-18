import type { AsgCommandRunner } from "./command";

export function createConfigService(runner: AsgCommandRunner) {
  return {
    getAll(): Promise<Record<string, unknown>> {
      return runner.run<Record<string, unknown>>(["config", "get", "--all"], {
        label: "读取配置",
      });
    },

    async validate(): Promise<void> {
      await runner.run<unknown>(["config", "validate"], {
        label: "校验配置",
      });
    },

    async set(path: string, value: string, originalIsString: boolean): Promise<void> {
      const args = ["config", "set", path, value];
      if (originalIsString) args.push("--string");
      await runner.run<unknown>(args, {
        label: `保存 ${path}`,
        visualState: "restarting",
      });
    },

    async setSecret(path: string, secret: string): Promise<void> {
      await runner.run<unknown>(["config", "set", path, "--stdin"], {
        label: "保存密钥",
        stdin: secret,
        visualState: "restarting",
      });
    },
  };
}
