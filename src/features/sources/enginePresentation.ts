import type { EngineGroup, EngineInfo } from "@/types/cli";

const GROUP_LABELS: Record<EngineGroup, string> = {
  searxng: "SearXNG",
  "gateway.search": "网关文本源",
  "gateway.reverse_image": "网关图源",
  "gateway.upstream": "通用上游",
};

export function engineGroupLabel(group: EngineGroup): string {
  return GROUP_LABELS[group];
}

export function engineAvailabilityLabel(engine: EngineInfo): string {
  if (engine.available) return "可用";
  const needsSecret = engine.requires?.some(
    (requirement) =>
      requirement.startsWith("secrets.") || requirement.startsWith("secret:"),
  );
  return needsSecret ? "待配置密钥" : "缺依赖";
}

export function engineGroupDescription(group: EngineGroup): string {
  if (group === "gateway.upstream") {
    return "通用查询时与 SearXNG 并发，结果由网关统一融合。";
  }
  return "";
}
