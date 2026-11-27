import type {
  AdlistUpdateResult,
  UpdateApplyStatus,
} from "@/types/cli";

export function adlistSuccessMessage(result: AdlistUpdateResult): string {
  if (result.level === "off") {
    return "广告过滤级别为 off，无需更新列表。";
  }
  return result.restarted
    ? "广告过滤列表已更新，整栈已重启。"
    : "广告过滤列表已更新，本次未重启整栈。";
}

export function updateSuccessMessage(result: UpdateApplyStatus): string {
  return result.restarted
    ? "ASG 已更新，整栈已重启。"
    : "ASG 已更新，本次未重启整栈。";
}
