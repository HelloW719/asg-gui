import type {
  ConfigFieldInfo,
  ConfigMutationResult,
  EngineInfo,
  EngineRouteDraft,
  ExtensionInfo,
  ExtensionOperationResult,
  ExtensionSearchItem,
  SecretPayload,
} from "../../types/cli";
import {
  isConfigMutationResult,
  isEnginesResult,
  isExtensionOperationResult,
  isExtensionConfigFieldsResult,
  isExtensionConfigResult,
  isExtensionsResult,
  isExtensionSearchResult,
  parseCliData,
} from "../../utils/cli";
import type { AsgCommandRunner } from "./command";

export interface ExtensionConfigSnapshot {
  id: string;
  config: Record<string, unknown>;
  fields: ConfigFieldInfo[];
  valid: boolean;
  error?: string;
}

function changedConfigArgs(
  id: string,
  current: Record<string, unknown>,
  original: Record<string, unknown>,
): string[] {
  const args = ["extensions", "config", id];
  const keys = new Set([...Object.keys(current), ...Object.keys(original)]);
  for (const key of keys) {
    const before = original[key];
    const after = current[key];
    if (after === undefined && before !== undefined) {
      args.push("--unset", key);
    } else if (JSON.stringify(before) !== JSON.stringify(after) && after !== undefined) {
      args.push("--set", `${key}=${JSON.stringify(after)}`);
    }
  }
  return args;
}

export function createSourcesService(runner: AsgCommandRunner) {
  async function setEnginesEnabled(
    ids: readonly string[],
    enabled: boolean,
  ): Promise<boolean> {
    if (ids.length === 0) return false;
    await runner.run(
      ["engines", enabled ? "enable" : "disable", ...ids],
      {
        label: enabled ? "启用搜索引擎" : "禁用搜索引擎",
        visualState: "restarting",
      },
      parseCliData("engines", isConfigMutationResult),
    );
    return true;
  }

  return {
    async listEngines(all = false): Promise<EngineInfo[]> {
      const result = await runner.run(
        all ? ["engines", "list", "--all"] : ["engines", "list"],
        { label: "读取引擎" },
        parseCliData("engines list", isEnginesResult),
      );
      return result.engines;
    },

    setEnginesEnabled,

    async setEngineEnabled(id: string, enabled: boolean): Promise<void> {
      await setEnginesEnabled([id], enabled);
    },

    setSearxngRoute(id: string, route: string): Promise<ConfigMutationResult> {
      return runner.run(
        ["engines", "route", id, route],
        {
          label: "设置 SearXNG 路由",
          visualState: "restarting",
        },
        parseCliData("engines route", isConfigMutationResult),
      );
    },

    setGatewayRoute(
      id: string,
      draft: EngineRouteDraft,
    ): Promise<ConfigMutationResult> {
      const args = ["engines", "route", id];
      if (draft.category.trim()) args.push("--category", draft.category.trim());
      if (draft.hotCategory.trim()) {
        args.push("--hot-category", draft.hotCategory.trim());
      }
      if (args.length === 3) args.push("--clear");
      return runner.run(
        args,
        {
          label: "设置 Gateway 路由",
          visualState: "restarting",
        },
        parseCliData("engines route", isConfigMutationResult),
      );
    },

    setEngineSecret(
      engine: EngineInfo,
      payload: SecretPayload,
    ): Promise<ConfigMutationResult> {
      const args = ["engines", "secret", engine.id];
      if (payload.name) args.push("--name", payload.name);
      args.push("--stdin");
      return runner.run(
        args,
        {
          label: `更新 ${engine.name} 密钥`,
          stdin: payload.secret,
          visualState: "restarting",
        },
        parseCliData("engines secret", isConfigMutationResult),
      );
    },

    async listExtensions(): Promise<ExtensionInfo[]> {
      const result = await runner.run(
        ["extensions", "list"],
        { label: "读取 V2 扩展" },
        parseCliData("extensions list", isExtensionsResult),
      );
      return result.extensions;
    },

    async searchExtensions(query: string): Promise<ExtensionSearchItem[]> {
      const normalized = query.trim();
      const result = await runner.run(
        ["extensions", "search", ...(normalized ? [normalized] : [])],
        {
          label: "搜索 GitHub 扩展",
          visualState: "loading",
        },
        parseCliData("extensions search", isExtensionSearchResult),
      );
      return result.results;
    },

    installExtension(repo: string): Promise<ExtensionOperationResult> {
      return runner.run(
        ["extensions", "install", repo],
        {
          label: "安装 V2 扩展",
          visualState: "loading",
        },
        parseCliData("extensions install", isExtensionOperationResult),
      );
    },

    setupExtension(
      extension: ExtensionInfo,
    ): Promise<ExtensionOperationResult> {
      return runner.run(
        ["extensions", "setup", extension.id],
        {
          label: `运行 ${extension.name || extension.id} 后端 setup`,
          visualState: "loading",
        },
        parseCliData("extensions setup", isExtensionOperationResult),
      );
    },

    removeExtension(
      extension: ExtensionInfo,
    ): Promise<ExtensionOperationResult> {
      return runner.run(
        ["extensions", "remove", extension.id],
        {
          label: `卸载扩展 ${extension.id}`,
          visualState: "loading",
        },
        parseCliData("extensions remove", isExtensionOperationResult),
      );
    },

    async loadExtensionConfig(extension: ExtensionInfo): Promise<ExtensionConfigSnapshot> {
      const [configResult, describeResult] = await Promise.all([
        runner.run(
          ["extensions", "config", extension.id],
          { label: "读取扩展配置" },
          parseCliData("extensions config", isExtensionConfigResult),
        ),
        runner.run(
          ["extensions", "config", extension.id, "--describe"],
          { label: "读取扩展字段" },
          parseCliData(
            "extensions config --describe",
            isExtensionConfigFieldsResult,
          ),
        ),
      ]);
      if (
        configResult.id !== extension.id ||
        describeResult.id !== extension.id
      ) {
        throw new Error(
          `ASG 扩展配置响应与请求的扩展不匹配：${extension.id}`,
        );
      }
      return {
        id: configResult.id,
        config: structuredClone(configResult.config),
        fields: describeResult.fields,
        valid: configResult.valid,
        ...(configResult.valid ? {} : { error: configResult.error }),
      };
    },

    async saveExtensionConfig(
      id: string,
      current: Record<string, unknown>,
      original: Record<string, unknown>,
    ): Promise<boolean> {
      const args = changedConfigArgs(id, current, original);
      if (args.length === 3) return false;
      await runner.run(
        args,
        {
          label: `保存扩展 ${id} 配置`,
          visualState: "restarting",
        },
        parseCliData("extensions config", isConfigMutationResult),
      );
      return true;
    },

    async setExtensionSecret(
      extension: ExtensionInfo,
      payload: Required<SecretPayload>,
    ): Promise<void> {
      await runner.run(
        ["extensions", "secret", extension.id, "--name", payload.name, "--stdin"],
        {
          label: `更新扩展 ${extension.id} 密钥`,
          stdin: payload.secret,
          visualState: "restarting",
        },
        parseCliData("extensions secret", isConfigMutationResult),
      );
    },
  };
}
