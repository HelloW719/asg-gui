import type {
  BrowserInstallStatus,
  BrowserStatus,
  DoctorCheck,
  UpdateCheckStatus,
} from "../../types/cli";
import type { AsgCommandRunner } from "./command";

export function createMaintenanceService(runner: AsgCommandRunner) {
  return {
    async doctor(): Promise<DoctorCheck[]> {
      const result = await runner.run<{ checks: DoctorCheck[] }>(["doctor"], {
        label: "运行环境诊断",
      });
      return result.checks ?? [];
    },

    browserStatus(): Promise<BrowserStatus> {
      return runner.run<BrowserStatus>(["browser", "status"], {
        label: "检查浏览器",
      });
    },

    installBrowser(full: boolean): Promise<BrowserInstallStatus> {
      return runner.run<BrowserInstallStatus>(
        full ? ["browser", "install", "--full"] : ["browser", "install"],
        {
          label: full ? "安装完整 Chromium" : "安装 headless Chromium",
          visualState: "loading",
        },
      );
    },

    async updateAdlist(level: string): Promise<void> {
      await runner.run<unknown>(["adlist", "update", "--level", level], {
        label: "更新广告列表",
        visualState: "restarting",
      });
    },

    checkUpdate(): Promise<UpdateCheckStatus> {
      return runner.run<UpdateCheckStatus>(["update", "check"], {
        label: "检查 ASG 更新",
      });
    },

    async applyUpdate(): Promise<void> {
      await runner.run<unknown>(["update", "apply"], {
        label: "下载并应用更新",
        visualState: "restarting",
      });
    },
  };
}
