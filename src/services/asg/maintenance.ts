import type {
  BrowserInstallStatus,
  BrowserStatus,
  DoctorCheck,
  UpdateCheckStatus,
} from "../../types/cli";
import {
  isBrowserInstallStatus,
  isBrowserStatus,
  isDoctorResult,
  isUpdateCheckStatus,
  parseCliData,
  parseVoidData,
} from "../../utils/cli";
import type { AsgCommandRunner } from "./command";

export function createMaintenanceService(runner: AsgCommandRunner) {
  return {
    async doctor(): Promise<DoctorCheck[]> {
      const result = await runner.run(
        ["doctor"],
        {
          label: "运行环境诊断",
        },
        parseCliData("doctor", isDoctorResult),
      );
      return result.checks;
    },

    browserStatus(): Promise<BrowserStatus> {
      return runner.run(
        ["browser", "status"],
        {
          label: "检查浏览器",
        },
        parseCliData("browser status", isBrowserStatus),
      );
    },

    installBrowser(full: boolean): Promise<BrowserInstallStatus> {
      return runner.run(
        full ? ["browser", "install", "--full"] : ["browser", "install"],
        {
          label: full ? "安装完整 Chromium" : "安装 headless Chromium",
          visualState: "loading",
        },
        parseCliData("browser install", isBrowserInstallStatus),
      );
    },

    async updateAdlist(level: string): Promise<void> {
      await runner.run(
        ["adlist", "update", "--level", level],
        {
          label: "更新广告列表",
          visualState: "restarting",
        },
        parseVoidData,
      );
    },

    checkUpdate(): Promise<UpdateCheckStatus> {
      return runner.run(
        ["update", "check"],
        {
          label: "检查 ASG 更新",
        },
        parseCliData("update check", isUpdateCheckStatus),
      );
    },

    async applyUpdate(): Promise<void> {
      await runner.run(
        ["update", "apply"],
        {
          label: "下载并应用更新",
          visualState: "restarting",
        },
        parseVoidData,
      );
    },
  };
}
