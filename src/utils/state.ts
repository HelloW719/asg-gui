import type { StackStatus, VisualState } from "../types/cli";

export interface VisualStateInput {
  rootValid: boolean;
  status: StackStatus | null;
  statusPending: boolean;
  statusError: string | null;
  operationState: VisualState | null;
}

export function deriveVisualState(input: VisualStateInput): VisualState {
  if (!input.rootValid) return "unconfigured";
  if (input.operationState) return input.operationState;
  if (input.statusError) return "disconnected";
  if (input.statusPending && !input.status) return "loading";
  if (!input.status) return "loading";

  const probes = Object.values(input.status.services);
  const online = probes.filter((probe) => probe.up).length;
  if (online === probes.length) return "stable";
  if (!input.status.services.gateway.up && input.status.supervisor.active) return "failed";
  if (online > 0) return "degraded";
  return "stopped";
}

export const visualStateLabels: Record<VisualState, string> = {
  unconfigured: "尚未连接",
  disconnected: "连接中断",
  stopped: "已停止",
  loading: "正在检查",
  starting: "正在启动",
  restarting: "正在重启",
  stable: "稳定运行",
  degraded: "部分异常",
  failed: "运行故障",
};

export function visualStateDescription(state: VisualState): string {
  return {
    unconfigured: "选择一个有效的 ASG 安装目录以开始。",
    disconnected: "无法完成状态探测，请检查本机 CLI 与网络环境。",
    stopped: "三个服务当前均未响应。",
    loading: "正在读取服务状态，请稍候。",
    starting: "整栈正在启动，完成后会重新连接 MCP。",
    restarting: "整栈正在重启，当前 MCP 连接会短暂断开。",
    stable: "gateway、SearXNG 和 FlareSolverr 均可达。",
    degraded: "部分服务不可达，请查看详情与日志。",
    failed: "supervisor 处于活动状态，但 gateway 无法访问。",
  }[state];
}

