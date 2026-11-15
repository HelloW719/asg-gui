<script setup lang="ts">
import { reactive, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FileImage,
  Globe2,
  Search,
  Send,
} from "@lucide/vue";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui";
import InlineNotice from "../components/InlineNotice.vue";
import MarkdownResult from "../components/MarkdownResult.vue";
import { useJobsStore } from "../stores/jobs";
import type { CliResult } from "../types/cli";
import { buildFetchArgs, buildSearchArgs } from "../utils/args";

const jobs = useJobsStore();
const searchForm = reactive({
  query: "",
  categories: "",
  engines: "",
  language: "",
  safesearch: "",
  numResults: "",
  fanout: "",
  minScore: "",
  imagePath: "",
  timeout: "",
});
const fetchForm = reactive({
  url: "",
  render: "auto" as "auto" | "always" | "never",
  maxChars: "",
  timeout: "",
});
const resultText = ref("");
const resultMeta = ref<string>("");
const error = ref<string | null>(null);

async function chooseImage(): Promise<void> {
  const selected = await open({
    title: "选择用于反向图搜的图片",
    multiple: false,
    directory: false,
    filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (typeof selected === "string") searchForm.imagePath = selected;
}

function applyResult(result: CliResult<{ text?: string; elapsed_ms?: number; code?: string | null }>): void {
  const data = result.data;
  if (data?.text) resultText.value = data.text;
  if (data) {
    resultMeta.value = [
      data.elapsed_ms !== undefined ? `${data.elapsed_ms} ms` : "",
      data.code ? `错误码 ${data.code}` : "调用成功",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (!result.ok) error.value = result.error?.message ?? "检索失败。";
}

async function search(): Promise<void> {
  error.value = null;
  resultText.value = "";
  if (!searchForm.query.trim() && !searchForm.imagePath.trim() && !searchForm.categories.trim()) {
    error.value = "请输入查询词，或者提供图片或类别。";
    return;
  }
  try {
    const result = await jobs.execute(buildSearchArgs(searchForm), {
      label: "执行搜索",
      visualState: "loading",
    });
    applyResult(result as CliResult<{ text?: string; elapsed_ms?: number; code?: string | null }>);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function fetchPage(): Promise<void> {
  error.value = null;
  resultText.value = "";
  if (!fetchForm.url.trim()) {
    error.value = "请输入 http/https URL。";
    return;
  }
  try {
    const result = await jobs.execute(buildFetchArgs(fetchForm), {
      label: "执行抓取",
      visualState: "loading",
    });
    applyResult(result as CliResult<{ text?: string; elapsed_ms?: number; code?: string | null }>);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <span class="eyebrow">数据面冒烟与控制</span>
        <h1>检索与抓取</h1>
        <p>调用运行中的 gateway，不修改配置，也不会重启服务。</p>
      </div>
    </header>

    <InlineNotice v-if="error" tone="error" :message="error" dismissible @dismiss="error = null" />

    <TabsRoot default-value="search" class="explorer-tabs">
      <TabsList class="tab-list glass-surface" aria-label="检索模式">
        <TabsTrigger value="search" class="tab-trigger">
          <Search :size="16" />
          搜索
        </TabsTrigger>
        <TabsTrigger value="fetch" class="tab-trigger">
          <Globe2 :size="16" />
          抓取
        </TabsTrigger>
      </TabsList>

      <TabsContent value="search" class="tab-content">
        <form class="query-card glass-surface" @submit.prevent="search">
          <div class="query-hero">
            <label class="field field--hero">
              <span>查询词</span>
              <input v-model="searchForm.query" type="search" placeholder="输入问题、关键词或站点范围" />
            </label>
            <button class="button button--primary button--large" type="submit" :disabled="jobs.hasRunningOperation">
              <Send :size="18" />
              开始搜索
            </button>
          </div>

          <details class="advanced-fields">
            <summary>搜索参数</summary>
            <div class="form-grid">
              <label class="field">
                <span>类别</span>
                <input v-model="searchForm.categories" placeholder="news,science" />
              </label>
              <label class="field">
                <span>引擎</span>
                <input v-model="searchForm.engines" placeholder="google,bing" />
              </label>
              <label class="field">
                <span>语言</span>
                <input v-model="searchForm.language" placeholder="zh-CN" />
              </label>
              <label class="field">
                <span>安全搜索</span>
                <select v-model="searchForm.safesearch">
                  <option value="">默认</option>
                  <option value="0">0 · 关闭</option>
                  <option value="1">1 · 中等</option>
                  <option value="2">2 · 严格</option>
                </select>
              </label>
              <label class="field">
                <span>结果数量</span>
                <input v-model="searchForm.numResults" type="number" min="1" max="1000" />
              </label>
              <label class="field">
                <span>Fanout</span>
                <input v-model="searchForm.fanout" type="number" min="1" max="4" />
              </label>
              <label class="field">
                <span>最低分</span>
                <input v-model="searchForm.minScore" type="number" min="0" max="1" step="0.01" />
              </label>
              <label class="field">
                <span>超时（秒）</span>
                <input v-model="searchForm.timeout" type="number" min="1" />
              </label>
            </div>
            <div class="inline-field file-picker">
              <input v-model="searchForm.imagePath" placeholder="本地图片路径，用于反向图搜" />
              <button class="button button--secondary" type="button" @click="chooseImage">
                <FileImage :size="16" />
                选择图片
              </button>
            </div>
          </details>
        </form>

        <MarkdownResult v-if="resultText" :text="resultText" title="搜索结果" />
        <div v-if="resultText && resultMeta" class="result-meta glass-surface">{{ resultMeta }}</div>
        <div v-else-if="resultMeta" class="result-meta glass-surface">{{ resultMeta }}</div>
      </TabsContent>

      <TabsContent value="fetch" class="tab-content">
        <form class="query-card glass-surface" @submit.prevent="fetchPage">
          <div class="query-hero">
            <label class="field field--hero">
              <span>URL</span>
              <input v-model="fetchForm.url" type="url" placeholder="https://example.com/article" />
            </label>
            <button class="button button--primary button--large" type="submit" :disabled="jobs.hasRunningOperation">
              <Send :size="18" />
              抓取正文
            </button>
          </div>
          <details class="advanced-fields">
            <summary>抓取参数</summary>
            <div class="form-grid">
              <label class="field">
                <span>渲染模式</span>
                <select v-model="fetchForm.render">
                  <option value="auto">auto</option>
                  <option value="always">always</option>
                  <option value="never">never</option>
                </select>
              </label>
              <label class="field">
                <span>最大字符</span>
                <input v-model="fetchForm.maxChars" type="number" min="1" max="200000" />
              </label>
              <label class="field">
                <span>超时（秒）</span>
                <input v-model="fetchForm.timeout" type="number" min="1" />
              </label>
            </div>
          </details>
        </form>

        <MarkdownResult v-if="resultText" :text="resultText" title="抓取结果" />
      </TabsContent>
    </TabsRoot>
  </div>
</template>

