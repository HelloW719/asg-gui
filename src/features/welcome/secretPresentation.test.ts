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
      {
        secrets: {
          gateway: { token: "set" },
        },
      },
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

  it("includes missing SearXNG API keys and omits configured ones", () => {
    const engines = [
      {
        ...engine("searxng:exaapi", [
          "searxng.engines.exaapi.api_key",
        ]),
        group: "searxng" as const,
        name: "exaapi",
        kind: "searxng" as const,
      },
      {
        ...engine("searxng:tavily", [
          "searxng.engines.tavily.api_key",
        ]),
        group: "searxng" as const,
        name: "tavily",
        kind: "searxng" as const,
        available: true,
      },
    ];

    expect(
      deriveMissingSecretCandidates(
        {
          secrets: {
            gateway: { token: "set" },
          },
        },
        engines,
      ),
    ).toEqual([
      {
        path: "searxng.engines.exaapi.api_key",
        label: "exaapi API Key",
        description:
          "SearXNG 引擎 exaapi 声明了 API Key 依赖；保存后整栈重启。",
        priority: 90,
        engineId: "searxng:exaapi",
        name: "api_key",
      },
    ]);
  });

  it("includes configured service and extension secrets outside engine requirements", () => {
    const candidates = deriveMissingSecretCandidates(
      {
        gateway: {},
        embedding: { enabled: true },
        browser: { proxy_username: "proxy-user" },
        extensions: {
          bilibili: {
            config: { enabled: false },
          },
        },
      },
      [],
    );

    expect(candidates.map((candidate) => candidate.path)).toEqual([
      "secrets.gateway.token",
      "secrets.embedding.api_key",
      "secrets.extensions.bilibili.token",
      "secrets.browser.proxy_password",
    ]);
  });
});
