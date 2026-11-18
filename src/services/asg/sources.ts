import type {
  ConfigFieldInfo,
  EngineInfo,
  EngineRouteDraft,
  ExtensionInfo,
  ExtensionSearchItem,
  PluginInfo,
  SecretPayload,
} from "../../types/cli";
import type { AsgCommandRunner } from "./command";

export interface ExtensionConfigSnapshot {
  id: string;
  config: Record<string, unknown>;
  fields: ConfigFieldInfo[];
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
  return {
    async listEngines(all = false): Promise<EngineInfo[]> {
      const result = await runner.run<{ engines: EngineInfo[] }>(
        all ? ["engines", "list", "--all"] : ["engines", "list"],
        { label: "读取引擎" },
      );
      return result.engines ?? [];
    },

    async setEngineEnabled(id: string, enabled: boolean): Promise<void> {
      await runner.run<unknown>(["engines", enabled ? "enable" : "disable", id], {
        label: enabled ? "启用搜索引擎" : "禁用搜索引擎",
        visualState: "restarting",
      });
    },

    async setSearxngRoute(id: string, route: string): Promise<void> {
      await runner.run<unknown>(["engines", "route", id, route], {
        label: "设置 SearXNG 路由",
        visualState: "restarting",
      });
    },

    async setGatewayRoute(id: string, draft: EngineRouteDraft): Promise<void> {
      const args = ["engines", "route", id];
      if (draft.category.trim()) args.push("--category", draft.category.trim());
      if (draft.hotCategory.trim()) {
        args.push("--hot-category", draft.hotCategory.trim());
      }
      if (args.length === 3) args.push("--clear");
      await runner.run<unknown>(args, {
        label: "设置 Gateway 路由",
        visualState: "restarting",
      });
    },

    async setEngineSecret(engine: EngineInfo, payload: SecretPayload): Promise<void> {
      const args = ["engines", "secret", engine.id];
      if (payload.name) args.push("--name", payload.name);
      args.push("--stdin");
      await runner.run<unknown>(args, {
        label: `更新 ${engine.name} 密钥`,
        stdin: payload.secret,
        visualState: "restarting",
      });
    },

    async listPlugins(): Promise<PluginInfo[]> {
      const result = await runner.run<{ plugins: PluginInfo[] }>(["plugins", "list"], {
        label: "读取内置插件",
      });
      return result.plugins ?? [];
    },

    async installPlugin(name: string): Promise<void> {
      await runner.run<unknown>(["plugins", "install", name], {
        label: "安装内置插件",
        visualState: "restarting",
      });
    },

    async removePlugin(plugin: PluginInfo): Promise<void> {
      await runner.run<unknown>(
        ["plugins", "remove", plugin.channel_id || plugin.name],
        {
          label: `卸载 ${plugin.name}`,
          visualState: "restarting",
        },
      );
    },

    async listExtensions(): Promise<ExtensionInfo[]> {
      const result = await runner.run<{ extensions: ExtensionInfo[] }>(
        ["extensions", "list"],
        { label: "读取第三方扩展" },
      );
      return result.extensions ?? [];
    },

    async searchExtensions(query: string): Promise<ExtensionSearchItem[]> {
      const normalized = query.trim();
      const result = await runner.run<{ results: ExtensionSearchItem[] }>(
        ["extensions", "search", ...(normalized ? [normalized] : [])],
        {
          label: "搜索第三方扩展",
          visualState: "loading",
        },
      );
      return result.results ?? [];
    },

    async installExtension(repo: string): Promise<void> {
      await runner.run<unknown>(["extensions", "install", repo], {
        label: "安装第三方扩展",
        visualState: "restarting",
      });
    },

    async removeExtension(extension: ExtensionInfo): Promise<void> {
      await runner.run<unknown>(["extensions", "remove", extension.id], {
        label: `卸载扩展 ${extension.id}`,
        visualState: "restarting",
      });
    },

    async loadExtensionConfig(extension: ExtensionInfo): Promise<ExtensionConfigSnapshot> {
      const [configResult, describeResult] = await Promise.all([
        runner.run<{ config?: Record<string, unknown> }>(
          ["extensions", "config", extension.id],
          { label: "读取扩展配置" },
        ),
        runner.run<{ fields?: ConfigFieldInfo[] }>(
          ["extensions", "config", extension.id, "--describe"],
          { label: "读取扩展字段" },
        ),
      ]);
      return {
        id: extension.id,
        config: structuredClone(configResult.config ?? {}),
        fields: describeResult.fields ?? [],
      };
    },

    async saveExtensionConfig(
      id: string,
      current: Record<string, unknown>,
      original: Record<string, unknown>,
    ): Promise<boolean> {
      const args = changedConfigArgs(id, current, original);
      if (args.length === 3) return false;
      await runner.run<unknown>(args, {
        label: `保存扩展 ${id} 配置`,
        visualState: "restarting",
      });
      return true;
    },

    async setExtensionSecret(
      extension: ExtensionInfo,
      payload: Required<SecretPayload>,
    ): Promise<void> {
      await runner.run<unknown>(
        ["extensions", "secret", extension.id, "--name", payload.name, "--stdin"],
        {
          label: `更新扩展 ${extension.id} 密钥`,
          stdin: payload.secret,
          visualState: "restarting",
        },
      );
    },
  };
}
