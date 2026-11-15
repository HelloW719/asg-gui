<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  Blocks,
  Download,
  PackagePlus,
  Puzzle,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
} from "@lucide/vue";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import InlineNotice from "../components/InlineNotice.vue";
import SecretDialog from "../components/SecretDialog.vue";
import { useAppStore } from "../stores/app";
import { useJobsStore } from "../stores/jobs";
import type {
  CliResult,
  EngineInfo,
  ExtensionInfo,
  ExtensionSearchItem,
  PluginInfo,
} from "../types/cli";

interface ConfigFieldInfo {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  default?: unknown;
  description?: string;
}

const app = useAppStore();
const jobs = useJobsStore();
const engines = ref<EngineInfo[]>([]);
const plugins = ref<PluginInfo[]>([]);
const extensions = ref<ExtensionInfo[]>([]);
const extensionResults = ref<ExtensionSearchItem[]>([]);
const pluginName = ref("bilibili:kukemc");
const extensionRepo = ref("");
const extensionQuery = ref("");
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const loading = reactive({ engines: false, plugins: false, extensions: false });
const pluginToRemove = ref<PluginInfo | null>(null);
const extensionToRemove = ref<ExtensionInfo | null>(null);
const engineSecret = ref<EngineInfo | null>(null);
const extensionSecret = ref<ExtensionInfo | null>(null);
const extensionConfigId = ref<string | null>(null);
const extensionConfig = ref<Record<string, unknown> | null>(null);
const extensionOriginal = ref<Record<string, unknown> | null>(null);
const extensionFields = ref<ConfigFieldInfo[]>([]);
const extensionConfigText = ref("");
const extensionConfigRawMode = ref(false);
const extensionSaveOpen = ref(false);
const routeDrafts = reactive<Record<string, { category: string; hotCategory: string }>>({});

onMounted(() => {
  void Promise.all([loadEngines(), loadPlugins(), loadExtensions()]);
});

function setError(cause: unknown): void {
  error.value = cause instanceof Error ? cause.message : String(cause);
}

async function runAndRefresh(
  args: string[],
  label: string,
  successMessage: string,
): Promise<void> {
  error.value = null;
  success.value = null;
  try {
    const result = await jobs.execute(args, { label, visualState: "restarting" });
    if (!result.ok) {
      error.value = result.error?.message ?? `${label}失败。`;
      return;
    }
    success.value = successMessage;
    await app.refreshStatus();
  } catch (cause) {
    setError(cause);
  }
}

async function loadEngines(all = false): Promise<void> {
  loading.engines = true;
  error.value = null;
  try {
    const result: CliResult<{ engines: EngineInfo[] }> = await jobs.execute(
      all ? ["engines", "list", "--all"] : ["engines", "list"],
      { label: "读取引擎" },
    );
    if (result.data?.engines) {
      engines.value = result.data.engines;
      syncRouteDrafts();
    } else if (result.error) error.value = result.error.message;
  } catch (cause) {
    setError(cause);
  } finally {
    loading.engines = false;
  }
}

function syncRouteDrafts(): void {
  for (const engine of engines.value) {
    const existing = routeDrafts[engine.id];
    if (!existing) {
      routeDrafts[engine.id] = {
        category:
          engine.routing.find((item) => item.startsWith("category:"))?.slice(9) ?? "",
        hotCategory: "",
      };
    }
  }
}

async function toggleEngine(engine: EngineInfo): Promise<void> {
  await runAndRefresh(
    ["engines", engine.enabled ? "disable" : "enable", engine.id],
    engine.enabled ? `禁用 ${engine.name}` : `启用 ${engine.name}`,
    `${engine.name} 已${engine.enabled ? "禁用" : "启用"}。`,
  );
  await loadEngines();
}

function currentSearxngRoute(engine: EngineInfo): string {
  return ["resident", "rotating"].find((route) => engine.routing.includes(route)) ?? "none";
}

async function changeSearxngRoute(engine: EngineInfo, event: Event): Promise<void> {
  const route = (event.target as HTMLSelectElement).value;
  await runAndRefresh(
    ["engines", "route", engine.id, route],
    `设置 ${engine.name} 路由`,
    `${engine.name} 路由已设置为 ${route}。`,
  );
  await loadEngines();
}

async function saveGatewayRoute(engine: EngineInfo): Promise<void> {
  const draft = routeDrafts[engine.id];
  if (!draft) return;
  const args = ["engines", "route", engine.id];
  if (draft.category.trim()) args.push("--category", draft.category.trim());
  if (draft.hotCategory.trim()) args.push("--hot-category", draft.hotCategory.trim());
  if (args.length === 3) args.push("--clear");
  await runAndRefresh(args, `设置 ${engine.name} 路由`, `${engine.name} 路由已更新。`);
  await loadEngines();
}

async function saveEngineSecret(payload: { name?: string; secret: string }): Promise<void> {
  const engine = engineSecret.value;
  engineSecret.value = null;
  if (!engine) return;
  const args = ["engines", "secret", engine.id];
  if (payload.name) args.push("--name", payload.name);
  args.push("--stdin");
  await runAndRefresh(args, `更新 ${engine.name} 密钥`, `${engine.name} 密钥已更新。`);
}

async function loadPlugins(): Promise<void> {
  loading.plugins = true;
  try {
    const result: CliResult<{ plugins: PluginInfo[] }> = await jobs.execute(
      ["plugins", "list"],
      { label: "读取内置插件" },
    );
    if (result.data?.plugins) plugins.value = result.data.plugins;
  } catch (cause) {
    setError(cause);
  } finally {
    loading.plugins = false;
  }
}

async function installPlugin(): Promise<void> {
  if (!pluginName.value.trim()) return;
  await runAndRefresh(
    ["plugins", "install", pluginName.value.trim()],
    "安装内置插件",
    `${pluginName.value.trim()} 已安装。`,
  );
  await loadPlugins();
}

async function removePlugin(): Promise<void> {
  const plugin = pluginToRemove.value;
  pluginToRemove.value = null;
  if (!plugin) return;
  await runAndRefresh(
    ["plugins", "remove", plugin.channel_id || plugin.name],
    `卸载 ${plugin.name}`,
    `${plugin.name} 已卸载。`,
  );
  await loadPlugins();
}

async function loadExtensions(): Promise<void> {
  loading.extensions = true;
  try {
    const result: CliResult<{ extensions: ExtensionInfo[] }> = await jobs.execute(
      ["extensions", "list"],
      { label: "读取第三方扩展" },
    );
    if (result.data?.extensions) extensions.value = result.data.extensions;
  } catch (cause) {
    setError(cause);
  } finally {
    loading.extensions = false;
  }
}

async function searchExtensions(): Promise<void> {
  error.value = null;
  try {
    const result: CliResult<{ results: ExtensionSearchItem[] }> = await jobs.execute(
      ["extensions", "search", ...(extensionQuery.value.trim() ? [extensionQuery.value.trim()] : [])],
      { label: "搜索第三方扩展", visualState: "loading" },
    );
    if (result.data?.results) extensionResults.value = result.data.results;
    else error.value = result.error?.message ?? "扩展搜索失败。";
  } catch (cause) {
    setError(cause);
  }
}

async function installExtension(repo?: string): Promise<void> {
  const target = repo ?? extensionRepo.value.trim();
  if (!target) return;
  await runAndRefresh(
    ["extensions", "install", target],
    "安装第三方扩展",
    `${target} 已安装。重启网关后生效。`,
  );
  extensionRepo.value = "";
  await loadExtensions();
}

async function removeExtension(): Promise<void> {
  const extension = extensionToRemove.value;
  extensionToRemove.value = null;
  if (!extension) return;
  await runAndRefresh(
    ["extensions", "remove", extension.id],
    `卸载扩展 ${extension.id}`,
    `${extension.id} 已卸载。`,
  );
  await loadExtensions();
}

async function openExtensionConfig(extension: ExtensionInfo): Promise<void> {
  error.value = null;
  try {
    const [configResult, describeResult] = await Promise.all([
      jobs.execute(["extensions", "config", extension.id], { label: "读取扩展配置" }),
      jobs.execute(["extensions", "config", extension.id, "--describe"], {
        label: "读取扩展字段",
      }),
    ]);
    if (!configResult.ok) {
      error.value = configResult.error?.message ?? "扩展配置读取失败。";
      return;
    }
    const data = configResult.data as { config?: Record<string, unknown> };
    const description = describeResult.data as { fields?: ConfigFieldInfo[] };
    extensionConfigId.value = extension.id;
    extensionConfig.value = structuredClone(data.config ?? {});
    extensionOriginal.value = structuredClone(data.config ?? {});
    extensionFields.value = description?.fields ?? [];
    extensionConfigText.value = JSON.stringify(data.config ?? {}, null, 2);
    extensionConfigRawMode.value = extensionFields.value.length === 0;
  } catch (cause) {
    setError(cause);
  }
}

function closeExtensionEditor(): void {
  extensionConfigId.value = null;
  extensionConfig.value = null;
  extensionOriginal.value = null;
  extensionFields.value = [];
  extensionConfigText.value = "";
}

function syncRawConfig(): boolean {
  try {
    const parsed = JSON.parse(extensionConfigText.value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("配置根必须是 JSON 对象。");
    }
    extensionConfig.value = parsed as Record<string, unknown>;
    error.value = null;
    return true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    return false;
  }
}

async function saveExtensionConfig(): Promise<void> {
  extensionSaveOpen.value = false;
  const id = extensionConfigId.value;
  const current = extensionConfig.value;
  const original = extensionOriginal.value;
  if (!id || !current || !original) return;
  if (extensionConfigRawMode.value && !syncRawConfig()) return;
  if (!extensionConfig.value) return;

  const args = ["extensions", "config", id];
  const changedKeys = new Set([
    ...Object.keys(current),
    ...Object.keys(original),
  ]);
  for (const key of changedKeys) {
    const before = original[key];
    const after = current[key];
    if (after === undefined && before !== undefined) {
      args.push("--unset", key);
    } else if (JSON.stringify(before) !== JSON.stringify(after) && after !== undefined) {
      args.push("--set", `${key}=${JSON.stringify(after)}`);
    }
  }
  if (args.length === 3) {
    success.value = "扩展配置没有变化。";
    return;
  }
  await runAndRefresh(args, `保存扩展 ${id} 配置`, `${id} 配置已保存。`);
  closeExtensionEditor();
}

async function saveExtensionSecret(payload: { name?: string; secret: string }): Promise<void> {
  const extension = extensionSecret.value;
  extensionSecret.value = null;
  if (!extension || !payload.name) return;
  await runAndRefresh(
    ["extensions", "secret", extension.id, "--name", payload.name, "--stdin"],
    `更新扩展 ${extension.id} 密钥`,
    `${extension.id} 的 ${payload.name} 已更新。`,
  );
}
</script>

<template>
  <div class="page sources-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">能力来源</span>
        <h1>引擎与扩展</h1>
        <p>所有启停、路由和安装动作均由 CLI 完成；配置改动会触发整栈重启。</p>
      </div>
    </header>

    <InlineNotice v-if="error" tone="error" :message="error" dismissible @dismiss="error = null" />
    <InlineNotice v-if="success" tone="success" :message="success" dismissible @dismiss="success = null" />

    <TabsRoot default-value="engines">
      <TabsList class="tab-list glass-surface">
        <TabsTrigger value="engines" class="tab-trigger"><Search :size="16" /> 搜索引擎</TabsTrigger>
        <TabsTrigger value="plugins" class="tab-trigger"><Blocks :size="16" /> 内置插件</TabsTrigger>
        <TabsTrigger value="extensions" class="tab-trigger"><Puzzle :size="16" /> 第三方扩展</TabsTrigger>
      </TabsList>

      <TabsContent value="engines" class="tab-content">
        <section class="source-toolbar glass-surface">
          <span>{{ engines.length }} 个本地引擎</span>
          <div class="action-row">
            <button class="button button--ghost button--compact" type="button" @click="loadEngines()">
              <RefreshCw :size="15" /> 本地
            </button>
            <button class="button button--secondary button--compact" type="button" @click="loadEngines(true)">
              包含远端目录
            </button>
          </div>
        </section>

        <p v-if="loading.engines" class="empty-copy">正在读取引擎…</p>
        <div v-else class="engine-grid">
          <article v-for="engine in engines" :key="engine.id" class="engine-card glass-surface">
            <header>
              <div>
                <span class="eyebrow">{{ engine.group }}</span>
                <h2>{{ engine.name }}</h2>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="engine.enabled"
                  :disabled="jobs.hasRunningOperation"
                  @change="toggleEngine(engine)"
                />
                <span />
              </label>
            </header>
            <div class="token-row">
              <span :class="engine.available ? 'token token--ok' : 'token token--warn'">
                {{ engine.available ? "可用" : "缺依赖" }}
              </span>
              <span v-for="route in engine.routing" :key="route" class="token">{{ route }}</span>
            </div>
            <p v-if="engine.requires?.length" class="field-note">
              依赖：{{ engine.requires.join(" · ") }}
            </p>
            <div v-if="engine.group === 'searxng'" class="inline-field">
              <select
                :value="currentSearxngRoute(engine)"
                :disabled="jobs.hasRunningOperation"
                @change="changeSearxngRoute(engine, $event)"
              >
                <option value="none">none</option>
                <option value="resident">resident</option>
                <option value="rotating">rotating</option>
              </select>
            </div>
            <details v-else-if="engine.group === 'gateway.search'" class="route-editor">
              <summary>编辑类别路由</summary>
              <label class="field">
                <span>Category</span>
                <input v-model="routeDrafts[engine.id]!.category" placeholder="news" />
              </label>
              <label class="field">
                <span>Hot category</span>
                <input v-model="routeDrafts[engine.id]!.hotCategory" placeholder="news_hot" />
              </label>
              <button class="button button--secondary button--compact" type="button" @click="saveGatewayRoute(engine)">
                保存路由
              </button>
            </details>
            <button
              v-if="engine.requires?.length"
              class="button button--ghost button--compact"
              type="button"
              @click="engineSecret = engine"
            >
              设置密钥
            </button>
          </article>
        </div>
      </TabsContent>

      <TabsContent value="plugins" class="tab-content">
        <section class="source-toolbar glass-surface">
          <div class="inline-field">
            <input v-model="pluginName" placeholder="插件名或规范通道，如 bilibili:kukemc" />
            <button class="button button--secondary button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="installPlugin">
              <PackagePlus :size="15" /> 安装
            </button>
          </div>
          <button class="button button--ghost button--compact" type="button" @click="loadPlugins">
            <RefreshCw :size="15" /> 刷新
          </button>
        </section>
        <div class="source-list">
          <article v-for="plugin in plugins" :key="plugin.name" class="source-row glass-surface">
            <div class="source-row__main">
              <span class="eyebrow">{{ plugin.channel_id }}</span>
              <h2>{{ plugin.platform }} · {{ plugin.channel }}</h2>
              <p>{{ plugin.path }}</p>
            </div>
            <div class="token-row">
              <span class="token" :class="plugin.installed ? 'token--ok' : ''">{{ plugin.installed ? "已安装" : "未安装" }}</span>
              <span class="token" :class="plugin.enabled ? 'token--ok' : 'token--warn'">{{ plugin.enabled ? "已启用" : "未启用" }}</span>
              <span v-if="plugin.version" class="token">v{{ plugin.version }}</span>
            </div>
            <div class="source-row__actions">
              <button v-if="!plugin.installed" class="button button--secondary button--compact" type="button" @click="pluginName = plugin.channel_id; installPlugin()">
                安装
              </button>
              <button v-else class="button button--ghost button--compact button--danger-text" type="button" @click="pluginToRemove = plugin">
                <Trash2 :size="15" /> 卸载
              </button>
            </div>
          </article>
        </div>
      </TabsContent>

      <TabsContent value="extensions" class="tab-content">
        <section class="source-toolbar glass-surface extension-toolbar">
          <div class="inline-field">
            <input v-model="extensionRepo" placeholder="owner/repo[@version]" />
            <button class="button button--secondary button--compact" type="button" @click="installExtension()">
              <Download :size="15" /> 从仓库安装
            </button>
          </div>
          <form class="inline-field" @submit.prevent="searchExtensions">
            <input v-model="extensionQuery" type="search" placeholder="搜索 GitHub 插件" />
            <button class="button button--ghost button--compact" type="submit">
              <Search :size="15" /> 搜索
            </button>
          </form>
          <button class="icon-button" type="button" title="刷新" @click="loadExtensions">
            <RefreshCw :size="16" />
          </button>
        </section>

        <div v-if="extensionResults.length" class="extension-results">
          <article v-for="item in extensionResults" :key="item.repo" class="source-row glass-surface">
            <div class="source-row__main">
              <span class="eyebrow">{{ item.stars }} stars</span>
              <h2>{{ item.repo }}</h2>
              <p>{{ item.description }}</p>
            </div>
            <button class="button button--secondary button--compact" type="button" @click="installExtension(item.repo)">
              安装
            </button>
          </article>
        </div>

        <div class="source-list">
          <article
            v-for="extension in extensions"
            :key="extension.id"
            class="source-row glass-surface extension-row"
          >
            <div class="source-row__main">
              <span class="eyebrow">{{ extension.provides?.join(" · ") || "extension" }}</span>
              <h2>{{ extension.name || extension.id }}</h2>
              <p>{{ extension.id }} <span v-if="extension.version">v{{ extension.version }}</span></p>
            </div>
            <div class="action-row">
              <button class="button button--secondary button--compact" type="button" @click="openExtensionConfig(extension)">
                <Settings2 :size="15" /> 配置
              </button>
              <button class="button button--ghost button--compact" type="button" @click="extensionSecret = extension">
                密钥
              </button>
              <button class="button button--ghost button--compact button--danger-text" type="button" @click="extensionToRemove = extension">
                <Trash2 :size="15" /> 卸载
              </button>
            </div>
          </article>
          <p v-if="extensions.length === 0" class="empty-copy">尚未安装第三方扩展。</p>
        </div>
      </TabsContent>
    </TabsRoot>

    <section v-if="extensionConfigId && extensionConfig" class="extension-editor glass-surface">
      <header class="section-heading">
        <div>
          <span class="eyebrow">插件私有配置</span>
          <h2>{{ extensionConfigId }}</h2>
        </div>
        <button class="icon-button" type="button" @click="closeExtensionEditor">关闭</button>
      </header>
      <template v-if="extensionConfigRawMode">
        <label class="field">
          <span>JSON 配置</span>
          <textarea v-model="extensionConfigText" rows="12" spellcheck="false" @blur="syncRawConfig" />
        </label>
      </template>
      <div v-else class="form-grid">
        <label v-for="field in extensionFields" :key="field.key" class="field">
          <span>{{ field.key }} <small v-if="field.required">必填</small></span>
          <input
            v-if="field.type === 'string'"
            v-model="extensionConfig[field.key] as string"
            type="text"
          />
          <input
            v-else-if="field.type === 'number'"
            v-model.number="extensionConfig[field.key] as number"
            type="number"
          />
          <label v-else-if="field.type === 'boolean'" class="check-label">
            <input v-model="extensionConfig[field.key] as boolean" type="checkbox" />
            启用
          </label>
          <textarea
            v-else
            :value="JSON.stringify(extensionConfig[field.key], null, 2)"
            rows="5"
            @input="extensionConfig[field.key] = JSON.parse(($event.target as HTMLTextAreaElement).value)"
          />
          <small v-if="field.description">{{ field.description }}</small>
        </label>
      </div>
      <div class="action-row">
        <button class="button button--ghost" type="button" @click="closeExtensionEditor">取消</button>
        <button class="button button--primary" type="button" @click="extensionSaveOpen = true">
          保存扩展配置
        </button>
      </div>
    </section>

    <ConfirmDialog
      :open="Boolean(pluginToRemove)"
      :title="`卸载 ${pluginToRemove?.name ?? ''}？`"
      description="内置插件会被移除，CLI 随后重启整栈。"
      confirm-label="卸载"
      destructive
      @update:open="(open) => !open && (pluginToRemove = null)"
      @confirm="removePlugin"
    />
    <ConfirmDialog
      :open="Boolean(extensionToRemove)"
      :title="`卸载 ${extensionToRemove?.id ?? ''}？`"
      description="只删除第三方扩展目录；重启网关后停止加载。"
      confirm-label="卸载"
      destructive
      @update:open="(open) => !open && (extensionToRemove = null)"
      @confirm="removeExtension"
    />
    <ConfirmDialog
      :open="extensionSaveOpen"
      title="保存扩展配置？"
      description="CLI 会校验插件 schema，写入一次配置，并随后重启整栈。"
      confirm-label="保存并重启"
      @update:open="extensionSaveOpen = $event"
      @confirm="saveExtensionConfig"
    />
    <SecretDialog
      :open="Boolean(engineSecret)"
      :title="`更新 ${engineSecret?.name ?? ''} 密钥`"
      :description="engineSecret?.requires?.join(' · ') ?? ''"
      :secret-names="engineSecret?.requires"
      @update:open="(open) => !open && (engineSecret = null)"
      @submit="saveEngineSecret"
    />
    <SecretDialog
      :open="Boolean(extensionSecret)"
      :title="`更新 ${extensionSecret?.id ?? ''} 密钥`"
      description="密钥名由扩展定义；值只通过 stdin 发送。"
      editable-name
      @update:open="(open) => !open && (extensionSecret = null)"
      @submit="saveExtensionSecret"
    />
  </div>
</template>

