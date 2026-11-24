import { describe, expect, it } from "vitest";
import type { EngineInfo } from "@/types/cli";
import {
  engineAvailabilityLabel,
  engineRouteDraft,
  engineSecretRequirements,
} from "./enginePresentation";

function engine(requires: string[]): EngineInfo {
  return {
    id: "gateway.search:test",
    group: "gateway.search",
    name: "test",
    kind: "gateway",
    enabled: false,
    available: false,
    routing: [],
    requires,
  };
}

describe("engine presentation", () => {
  it("separates secret dependencies from config dependencies", () => {
    const value = engine([
      "config:weibo.enabled",
      "secrets.search.deepseek.api_key",
      "secret:cookie",
      "searxng.engines.exaapi.api_key",
    ]);

    expect(engineSecretRequirements(value)).toEqual([
      "secrets.search.deepseek.api_key",
      "secret:cookie",
      "searxng.engines.exaapi.api_key",
    ]);
    expect(engineAvailabilityLabel(value)).toBe("待配置密钥");
    expect(
      engineAvailabilityLabel(
        engine(["searxng.engines.tavily.api_key"]),
      ),
    ).toBe("待配置密钥");
    expect(engineAvailabilityLabel(engine(["config:weibo.enabled"]))).toBe(
      "缺依赖",
    );
  });

  it("distinguishes keyless engines from configured secrets", () => {
    expect(
      engineAvailabilityLabel({
        ...engine([]),
        available: true,
      }),
    ).toBe("可用 · 无需密钥");
    expect(
      engineAvailabilityLabel({
        ...engine(["secrets.search.deepseek.api_key"]),
        available: true,
      }),
    ).toBe("可用 · 密钥已配置");
    expect(
      engineAvailabilityLabel({
        ...engine(["config:extensions.demo.enabled"]),
        available: true,
      }),
    ).toBe("可用");
  });

  it("restores regular and hot gateway categories", () => {
    expect(
      engineRouteDraft({
        ...engine([]),
        routing: ["category:news", "category:news_hot"],
      }),
    ).toEqual({
      category: "news",
      hotCategory: "news_hot",
    });
  });
});
