import type { EngineInfo } from "@/types/cli";

export interface SecretCandidate {
  path: string;
  label: string;
  description: string;
  priority: number;
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
  "secrets.bilibili.http.token": {
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

function requirementPath(requirement: string, engine: EngineInfo): string | null {
  if (requirement.startsWith("secrets.")) return requirement;
  if (requirement.startsWith("secret:") && engine.pluginId) {
    const name = requirement.slice("secret:".length);
    return name ? `secrets.extensions.${engine.pluginId}.${name}` : null;
  }
  return null;
}

function detailsFor(path: string): SecretCandidate {
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

export function deriveMissingSecretCandidates(
  config: Record<string, unknown>,
  engines: readonly EngineInfo[],
): SecretCandidate[] {
  const values = new Map<string, string>();
  flattenSecrets(config.secrets, "secrets", values);

  const requirements = new Set<string>();
  for (const engine of engines) {
    for (const requirement of engine.requires ?? []) {
      const path = requirementPath(requirement, engine);
      if (path) requirements.add(path);
    }
  }

  return [...requirements]
    .filter((path) => values.get(path) !== "set")
    .map(detailsFor)
    .sort(
      (left, right) =>
        left.priority - right.priority || left.path.localeCompare(right.path),
    );
}
