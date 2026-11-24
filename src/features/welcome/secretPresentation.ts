import type { EngineInfo, ExtensionInfo } from "@/types/cli";
import { isRecord, isSearxngApiKeyRequirement } from "@/utils/cli";

export interface SecretCandidate {
  path: string;
  label: string;
  description: string;
  priority: number;
  engineId?: string;
  name?: string;
}

interface RequirementTarget {
  path: string;
  engine?: EngineInfo;
}

const SECRET_DETAILS: Record<
  string,
  { label: string; description: string; priority: number }
> = {
  "secrets.search.deepseek.api_key": {
    label: "DeepSeek API Key",
    description: "用于 DeepSeek 通用搜索上游；不填写时仍可继续使用基础搜索。",
    priority: 0,
  },
  "secrets.search.reverse_image.saucenao.api_key": {
    label: "SauceNAO API Key",
    description: "用于插画与同人图出处查询。",
    priority: 10,
  },
  "secrets.gateway.token": {
    label: "Gateway Token",
    description: "用于保护本机 MCP HTTP 端点。",
    priority: 20,
  },
  "secrets.embedding.api_key": {
    label: "Embedding API Key",
    description: "用于需要鉴权的文本向量服务。",
    priority: 30,
  },
  "secrets.extensions.bilibili.token": {
    label: "Bilibili HTTP Token",
    description: "用于连接受鉴权的 Bilibili HTTP 后端。",
    priority: 40,
  },
  "secrets.browser.proxy_password": {
    label: "浏览器代理密码",
    description: "用于需要用户名和密码的浏览器代理。",
    priority: 50,
  },
};

function flattenSecrets(
  value: unknown,
  path: string,
  target: Map<string, string>,
): void {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flattenSecrets(child, path ? `${path}.${key}` : key, target);
    }
    return;
  }
  if (path.startsWith("secrets.")) {
    target.set(path, typeof value === "string" ? value : String(value));
  }
}

function requirementTarget(
  requirement: string,
  engine: EngineInfo,
): RequirementTarget | null {
  if (isSearxngApiKeyRequirement(requirement)) {
    return { path: requirement, engine };
  }
  if (requirement.startsWith("secrets.")) return { path: requirement };
  if (requirement.startsWith("secret:") && engine.pluginId) {
    const name = requirement.slice("secret:".length);
    return name
      ? { path: `secrets.extensions.${engine.pluginId}.${name}` }
      : null;
  }
  return null;
}

function detailsFor(path: string, engine?: EngineInfo): SecretCandidate {
  if (engine) {
    return {
      path,
      label: `${engine.name} API Key`,
      description: `SearXNG 引擎 ${engine.name} 声明了 API Key 依赖；保存后整栈重启。`,
      priority: 90,
      engineId: engine.id,
      name: "api_key",
    };
  }

  const details = SECRET_DETAILS[path];
  if (details) return { path, ...details };

  const name = path.split(".").at(-1) ?? "密钥";
  return {
    path,
    label: name,
    description: "该密钥由当前搜索源声明为必需项。",
    priority: 100,
  };
}

function valueAtPath(value: unknown, path: string): unknown {
  let current = value;
  for (const key of path.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function extensionIsConfigured(
  config: Record<string, unknown>,
  id: string,
  installedExtensions: readonly ExtensionInfo[],
): boolean {
  const configured = valueAtPath(config, "extensions");
  return (
    (isRecord(configured) &&
      Object.prototype.hasOwnProperty.call(configured, id)) ||
    installedExtensions.some((extension) => extension.id === id)
  );
}

export function deriveMissingSecretCandidates(
  config: Record<string, unknown>,
  engines: readonly EngineInfo[],
  installedExtensions: readonly ExtensionInfo[] = [],
): SecretCandidate[] {
  const values = new Map<string, string>();
  flattenSecrets(config.secrets, "secrets", values);

  const requirements = new Map<string, RequirementTarget>();
  const addConfiguredSecret = (path: string, wanted: boolean): void => {
    if (wanted && values.get(path) !== "set") {
      requirements.set(path, { path });
    }
  };

  addConfiguredSecret("secrets.gateway.token", true);
  addConfiguredSecret(
    "secrets.embedding.api_key",
    valueAtPath(config, "embedding.enabled") === true,
  );
  const proxyUsername = valueAtPath(config, "browser.proxy_username");
  addConfiguredSecret(
    "secrets.browser.proxy_password",
    typeof proxyUsername === "string" && proxyUsername.trim().length > 0,
  );
  addConfiguredSecret(
    "secrets.extensions.bilibili.token",
    extensionIsConfigured(config, "bilibili", installedExtensions),
  );

  for (const engine of engines) {
    for (const requirement of engine.requires ?? []) {
      const target = requirementTarget(requirement, engine);
      if (!target) continue;
      if (target.engine) {
        if (!target.engine.available) requirements.set(target.path, target);
      } else if (values.get(target.path) !== "set") {
        requirements.set(target.path, target);
      }
    }
  }

  return [...requirements.values()]
    .map((target) => detailsFor(target.path, target.engine))
    .sort(
      (left, right) =>
        left.priority - right.priority || left.path.localeCompare(right.path),
    );
}
