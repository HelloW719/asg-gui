import type { EngineInfo } from "@/types/cli";

export type SearchStrength = "low" | "medium" | "high";

export interface SearchStrengthOption {
  value: SearchStrength;
  label: string;
  description: string;
}

export const SEARCH_STRENGTH_OPTIONS: readonly SearchStrengthOption[] = [
  {
    value: "low",
    label: "低",
    description: "仅 SearXNG 原生引擎",
  },
  {
    value: "medium",
    label: "中",
    description: "原生引擎 + DeepSeek",
  },
  {
    value: "high",
    label: "高",
    description: "再加入 SearXNG 扩展",
  },
];

export const DEFAULT_SEARCH_STRENGTH: SearchStrength = "low";

export interface SearchProfileChanges {
  enable: string[];
  disable: string[];
}

export function isDeepseekEngine(engine: EngineInfo): boolean {
  return engine.id === "gateway.upstream:deepseek";
}

export function isSearxngExtensionEngine(engine: EngineInfo): boolean {
  return (
    engine.group === "searxng" &&
    engine.routing.some(
      (route) => route === "resident" || route === "rotating",
    )
  );
}

export function isReverseImageEngine(engine: EngineInfo): boolean {
  return engine.group === "gateway.reverse_image";
}

export function inferSearchStrength(
  engines: readonly EngineInfo[],
): SearchStrength {
  const deepseek = engines.find(isDeepseekEngine);
  const hasSearxngExtension = engines
    .filter(isSearxngExtensionEngine)
    .some((engine) => engine.enabled);
  if (deepseek?.enabled && hasSearxngExtension) return "high";
  if (deepseek?.enabled) return "medium";
  return "low";
}

export function buildSearchProfileChanges(
  engines: readonly EngineInfo[],
  strength: SearchStrength,
  reverseImageIds: ReadonlySet<string>,
): SearchProfileChanges {
  const desired = new Map<string, boolean>();

  for (const engine of engines) {
    if (isDeepseekEngine(engine)) {
      desired.set(engine.id, strength !== "low");
    } else if (isSearxngExtensionEngine(engine)) {
      desired.set(engine.id, strength === "high");
    } else if (isReverseImageEngine(engine)) {
      desired.set(engine.id, reverseImageIds.has(engine.id));
    }
  }

  const enable: string[] = [];
  const disable: string[] = [];
  for (const engine of engines) {
    const next = desired.get(engine.id);
    if (next === undefined || next === engine.enabled) continue;
    (next ? enable : disable).push(engine.id);
  }
  return { enable, disable };
}
