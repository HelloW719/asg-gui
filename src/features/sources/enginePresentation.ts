import type {
  EngineGroup,
  EngineInfo,
  EngineRouteDraft,
} from "@/types/cli";
import { isEngineSecretRequirement } from "@/utils/cli";

const GROUP_LABELS: Record<EngineGroup, string> = {
  searxng: "SearXNG",
  "gateway.search": "网关文本源",
  "gateway.reverse_image": "网关图源",
  "gateway.upstream": "通用上游",
};

export function engineGroupLabel(group: EngineGroup): string {
  return GROUP_LABELS[group];
}

export function engineSecretRequirements(engine: EngineInfo): string[] {
  return (engine.requires ?? []).filter(isEngineSecretRequirement);
}

export function engineRouteDraft(engine: EngineInfo): EngineRouteDraft {
  const categories = engine.routing
    .filter((item) => item.startsWith("category:"))
    .map((item) => item.slice(9));
  return {
    category: categories[0] ?? "",
    hotCategory: categories[1] ?? "",
  };
}

export function engineAvailabilityLabel(engine: EngineInfo): string {
  const secretRequirements = engineSecretRequirements(engine);
  if (engine.available) {
    if (secretRequirements.length > 0) return "可用 · 密钥已配置";
    return engine.requires?.length ? "可用" : "可用 · 无需密钥";
  }
  return secretRequirements.length > 0 ? "待配置密钥" : "缺依赖";
}

export function engineGroupDescription(group: EngineGroup): string {
  if (group === "gateway.upstream") {
    return "通用查询时与 SearXNG 并发，结果由网关统一融合。";
  }
  return "";
}
