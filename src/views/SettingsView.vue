<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Database,
  Eye,
  FileLock2,
  FolderCog,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "@lucide/vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import InlineNotice from "../components/InlineNotice.vue";
import SecretDialog from "../components/SecretDialog.vue";
import { useAppStatus } from "../app/useAppStatus";
import { useAsgServices } from "../app/useAsgServices";
import { useAppearanceStore } from "../stores/appearance";
import { useJobsStore } from "../stores/jobs";
import { useSessionStore } from "../stores/session";
import type { ThemePreference } from "../types/cli";

interface ConfigLeaf {
  path: string;
  group: string;
  value: unknown;
  secret: boolean;
}

const session = useSessionStore();
const appearance = useAppearanceStore();
const appStatus = useAppStatus();
const serviceClient = useAsgServices();
const jobs = useJobsStore();
const config = ref<Record<string, unknown> | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const editing = ref<ConfigLeaf | null>(null);
const editValue = ref("");
const pendingSave = ref<ConfigLeaf | null>(null);
const secretField = ref<ConfigLeaf | null>(null);
const forgetOpen = ref(false);
const validated = ref<boolean | null>(null);

const groupLabels: Record<string, string> = {
  gateway: "网关",
  logging: "日志",
  searxng: "SearXNG",
  flaresolverr: "FlareSolverr",
  search: "搜索",
  rerank: "重排",
  ad_filter: "广告过滤",
  fetch: "抓取",
  bilibili: "Bilibili",
  weibo: "微博",
  browser: "浏览器",
  embedding: "语义向量",
  corpus: "语料库",
  extensions: "扩展配置",
  secrets: "密钥状态",
};

const rows = computed<ConfigLeaf[]>(() => {
  if (!config.value) return [];
  const result: ConfigLeaf[] = [];
  flatten(config.value, "", result);
  const needle = search.value.trim().toLowerCase();
  return needle
    ? result.filter((row) => row.path.toLowerCase().includes(needle))
    : result;
});

const groupedRows = computed(() => {
  const groups = new Map<string, ConfigLeaf[]>();
  for (const row of rows.value) {
    const entries = groups.get(row.group) ?? [];
    entries.push(row);
    groups.set(row.group, entries);
  }
  return [...groups.entries()];
});

onMounted(() => {
  void loadConfig();
});

function flatten(value: unknown, prefix: string, target: ConfigLeaf[]): void {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, target);
    }
    return;
  }
  const group = prefix.split(".")[0] ?? "other";
  target.push({
    path: prefix,
    group,
    value,
    secret: prefix.startsWith("secrets."),
  });
}

function displayValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function serializedValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function loadConfig(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    config.value = await serviceClient.config.getAll();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

function beginEdit(row: ConfigLeaf): void {
  if (row.secret) {
    secretField.value = row;
    return;
  }
  editing.value = row;
  editValue.value = serializedValue(row.value);
}

function cancelEdit(): void {
  editing.value = null;
  editValue.value = "";
}

async function saveSecret(payload: { secret: string }): Promise<void> {
  if (!secretField.value) return;
  error.value = null;
  try {
    await serviceClient.config.setSecret(secretField.value.path, payload.secret);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    secretField.value = null;
    await loadConfig();
  }
}

async function saveField(): Promise<void> {
  const row = pendingSave.value;
  pendingSave.value = null;
  if (!row) return;
  error.value = null;
  const originalIsString = typeof row.value === "string";
  try {
    await serviceClient.config.set(row.path, editValue.value, originalIsString);
    cancelEdit();
    validated.value = null;
    await appStatus.refresh();
    await loadConfig();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function validate(): Promise<void> {
  error.value = null;
  validated.value = null;
  try {
    await serviceClient.config.validate();
    validated.value = true;
  } catch (cause) {
    validated.value = false;
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function forgetRoot(): Promise<void> {
  forgetOpen.value = false;
  await session.forgetRoot();
}

function themeChoice(theme: ThemePreference): void {
  void appearance.setTheme(theme);
}
</script>

<template>
  <div class="page settings-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">配置与外观</span>
        <h1>设置</h1>
        <p>每个字段单独通过 <code>config set</code> 校验、写入并整栈重启。</p>
      </div>
      <div class="action-row">
        <button class="button button--ghost button--compact" type="button" @click="validate">
          <FileLock2 :size="15" />
          校验配置
        </button>
        <button class="button button--secondary button--compact" type="button" :disabled="loading" @click="loadConfig">
          <Database :size="15" />
          重新读取
        </button>
      </div>
    </header>

    <InlineNotice v-if="error" tone="error" :message="error" dismissible @dismiss="error = null" />
    <InlineNotice v-if="validated === true" tone="success" message="配置校验通过。" dismissible @dismiss="validated = null" />

    <section class="settings-appearance glass-surface">
      <div class="section-heading">
        <div>
          <span class="eyebrow">应用外观</span>
          <h2>主题与效果</h2>
        </div>
        <Sparkles :size="21" />
      </div>
      <div class="settings-row">
        <div>
          <strong>主题</strong>
          <p>默认跟随系统，也可以固定为深色或浅色。</p>
        </div>
        <div class="segmented-control">
          <button type="button" :class="{ active: appearance.themePreference === 'system' }" @click="themeChoice('system')">跟随系统</button>
          <button type="button" :class="{ active: appearance.themePreference === 'dark' }" @click="themeChoice('dark')">深色</button>
          <button type="button" :class="{ active: appearance.themePreference === 'light' }" @click="themeChoice('light')">浅色</button>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <strong>减少动态</strong>
          <p>关闭状态几何的呼吸、旋转和轨迹动画。</p>
        </div>
        <label class="switch">
          <input :checked="appearance.reducedMotion" type="checkbox" @change="appearance.setReducedMotion(($event.target as HTMLInputElement).checked)" />
          <span />
        </label>
      </div>
      <div class="settings-row">
        <div>
          <strong>减少透明</strong>
          <p>使用更不透明的玻璃表面，降低 WebView 合成开销。</p>
        </div>
        <label class="switch">
          <input :checked="appearance.reducedTransparency" type="checkbox" @change="appearance.setReducedTransparency(($event.target as HTMLInputElement).checked)" />
          <span />
        </label>
      </div>
    </section>

    <section class="settings-install glass-surface">
      <FolderCog :size="21" />
      <div>
        <span class="eyebrow">ASG 安装</span>
        <strong>{{ session.root }}</strong>
        <p>切换安装根会停止 GUI 的状态轮询，但不会停止已有服务。</p>
      </div>
      <button class="button button--secondary button--compact" type="button" @click="session.chooseRoot">
        切换目录
      </button>
      <button class="button button--ghost button--compact button--danger-text" type="button" @click="forgetOpen = true">
        断开
      </button>
    </section>

    <section class="config-section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">配置树</span>
          <h2>高级设置</h2>
          <p>{{ rows.length }} 个可编辑字段</p>
        </div>
        <label class="search-field config-search">
          <Search :size="15" />
          <input v-model="search" type="search" placeholder="搜索配置路径" />
        </label>
      </div>

      <p v-if="loading" class="empty-copy">正在读取掩码配置…</p>
      <div v-else-if="groupedRows.length === 0" class="empty-copy">没有匹配的配置字段。</div>
      <div v-for="[group, fields] in groupedRows" v-else :key="group" class="config-group glass-surface">
        <header>
          <SlidersHorizontal :size="17" />
          <h3>{{ groupLabels[group] ?? group }}</h3>
          <span>{{ fields.length }}</span>
        </header>
        <div class="config-table">
          <button v-for="row in fields" :key="row.path" class="config-field" type="button" @click="beginEdit(row)">
            <span class="config-field__path">{{ row.path }}</span>
            <code>{{ row.secret ? "••••••" : displayValue(row.value) }}</code>
            <Eye :size="15" />
          </button>
        </div>
      </div>
    </section>

    <section v-if="editing" class="editor-drawer glass-surface">
      <header class="section-heading">
        <div>
          <span class="eyebrow">单字段编辑</span>
          <h2>{{ editing.path }}</h2>
        </div>
        <button class="icon-button" type="button" @click="cancelEdit">关闭</button>
      </header>
      <label class="field">
        <span>值（字符串直接输入；对象和数组使用 JSON）</span>
        <textarea v-model="editValue" rows="8" spellcheck="false" />
      </label>
      <div class="action-row">
        <button class="button button--ghost" type="button" @click="cancelEdit">取消</button>
        <button class="button button--primary" type="button" :disabled="jobs.hasRunningOperation" @click="pendingSave = editing">
          保存并重启
        </button>
      </div>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingSave)"
      title="保存此字段？"
      :description="`将通过 CLI 校验并写入 ${pendingSave?.path ?? ''}，随后整栈重启。所有 MCP 连接会短暂断开。`"
      confirm-label="保存并重启"
      @update:open="(open) => !open && (pendingSave = null)"
      @confirm="saveField"
    />
    <SecretDialog
      :open="Boolean(secretField)"
      title="更新密钥"
      :description="secretField?.path ?? ''"
      @update:open="(open) => !open && (secretField = null)"
      @submit="saveSecret"
    />
    <ConfirmDialog
      :open="forgetOpen"
      title="断开当前安装？"
      description="只会清除 GUI 记住的安装路径，不会停止后台服务。"
      confirm-label="断开"
      destructive
      @update:open="forgetOpen = $event"
      @confirm="forgetRoot"
    />
  </div>
</template>

