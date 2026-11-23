import { describe, expect, it } from "vitest";
import type { EngineInfo } from "@/types/cli";
import { deriveMissingSecretCandidates } from "./secretPresentation";

function engine(
  id: string,
  requires: string[],
  pluginId?: string,
): EngineInfo {
  return {
    id,
    ...(pluginId ? { pluginId } : {}),
    group: "gateway.upstream",
    name: id,
    kind: "gateway",
    enabled: false,
    available: false,
    routing: [],
    requires,
  };
}

describe("welcome secret presentation", () => {
  it("prioritizes DeepSeek and omits configured secrets", () => {
    const candidates = deriveMissingSecretCandidates(
      {
        secrets: {
          search: {
            reverse_image: {
              saucenao: { api_key: "unset" },
            },
            deepseek: { api_key: "unset" },
          },
          gateway: { token: "set" },
        },
      },
      [
        engine("gateway.upstream:deepseek", [
          "secrets.search.deepseek.api_key",
        ]),
        engine("gateway.reverse_image:saucenao", [
          "secrets.search.reverse_image.saucenao.api_key",
        ]),
        engine("gateway.token", ["secrets.gateway.token"]),
      ],
    );

    expect(candidates.map((candidate) => candidate.label)).toEqual([
      "DeepSeek API Key",
      "SauceNAO API Key",
    ]);
  });

  it("maps extension requirement names to their secrets paths", () => {
    const candidates = deriveMissingSecretCandidates(
      {},
      [engine("gateway.search:demo", ["secret:api_key"], "demo")],
    );

    expect(candidates).toEqual([
      {
        path: "secrets.extensions.demo.api_key",
        label: "api_key",
        description: "该密钥由当前搜索源声明为必需项。",
        priority: 100,
      },
    ]);
  });
});
