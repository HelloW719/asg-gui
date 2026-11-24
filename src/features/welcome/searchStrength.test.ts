import { describe, expect, it } from "vitest";
import type { EngineInfo } from "@/types/cli";
import {
  buildSearchProfileChanges,
  inferSearchStrength,
} from "./searchStrength";

function engine(
  id: string,
  overrides: Partial<EngineInfo> = {},
): EngineInfo {
  const [group, name] = id.split(":") as [EngineInfo["group"], string];
  return {
    id,
    group,
    name,
    kind: group === "searxng" ? "searxng" : "gateway",
    enabled: false,
    available: true,
    routing: [],
    ...overrides,
  };
}

const engines = [
  engine("searxng:google", { enabled: true }),
  engine("searxng:tavily", {
    enabled: true,
    routing: ["rotating"],
  }),
  engine("gateway.upstream:deepseek", {
    enabled: false,
    routing: ["general"],
  }),
  engine("gateway.reverse_image:tracemoe", {
    enabled: true,
    routing: ["source"],
  }),
  engine("gateway.reverse_image:baidu", {
    enabled: false,
    routing: ["source"],
  }),
];

function setEnabled(id: string, enabled: boolean): EngineInfo[] {
  return engines.map((item) =>
    item.id === id ? { ...item, enabled } : item,
  );
}

describe("welcome search strength", () => {
  it("maps accumulated engine state to low, medium and high", () => {
    expect(inferSearchStrength(engines)).toBe("low");
    expect(
      inferSearchStrength(setEnabled("gateway.upstream:deepseek", true)),
    ).toBe("high");
    expect(
      inferSearchStrength(setEnabled("searxng:tavily", false)),
    ).toBe("low");
    expect(
      inferSearchStrength(
        setEnabled("gateway.upstream:deepseek", true).map((item) =>
          item.id === "searxng:tavily"
            ? { ...item, enabled: false }
            : item,
        ),
      ),
    ).toBe("medium");
  });

  it("keeps the three levels cumulative", () => {
    expect(
      buildSearchProfileChanges(engines, "low", new Set()),
    ).toEqual({
      enable: [],
      disable: ["searxng:tavily", "gateway.reverse_image:tracemoe"],
    });
    expect(
      buildSearchProfileChanges(engines, "medium", new Set()),
    ).toEqual({
      enable: ["gateway.upstream:deepseek"],
      disable: ["searxng:tavily", "gateway.reverse_image:tracemoe"],
    });
    expect(
      buildSearchProfileChanges(
        setEnabled("searxng:tavily", false),
        "high",
        new Set(["gateway.reverse_image:baidu"]),
      ),
    ).toEqual({
      enable: [
        "searxng:tavily",
        "gateway.upstream:deepseek",
        "gateway.reverse_image:baidu",
      ],
      disable: ["gateway.reverse_image:tracemoe"],
    });
  });

  it("leaves selected reverse-image state unchanged", () => {
    expect(
      buildSearchProfileChanges(
        engines,
        "low",
        new Set(["gateway.reverse_image:tracemoe"]),
      ),
    ).toEqual({
      enable: [],
      disable: ["searxng:tavily"],
    });
  });
});
