<script setup lang="ts">
import {
  Download,
  PackageOpen,
  RefreshCw,
  Search,
  SearchX,
  Settings2,
  Trash2,
} from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import EmptyState from "@/shared/ui/EmptyState.vue";
import type { ExtensionInfo, ExtensionSearchItem } from "@/types/cli";

const repo = defineModel<string>("repo", { required: true });
const query = defineModel<string>("query", { required: true });

defineProps<{
  extensions: ExtensionInfo[];
  results: ExtensionSearchItem[];
  loading: boolean;
  searching: boolean;
  searchCompleted: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  install: [repo: string];
  search: [];
  refresh: [];
  setup: [extension: ExtensionInfo];
  configure: [extension: ExtensionInfo];
  secret: [extension: ExtensionInfo];
  remove: [extension: ExtensionInfo];
}>();
</script>

<template>
  <section class="source-toolbar extension-toolbar">
    <div class="inline-field">
      <input v-model="repo" placeholder="owner/repo[@version]" />
      <BaseButton
        size="compact"
        variant="secondary"
        :disabled="busy"
        @click="emit('install', repo)"
      >
        <template #icon><Download :size="15" /></template>
        从仓库安装
      </BaseButton>
    </div>
    <div class="inline-field">
      <input v-model="query" type="search" placeholder="搜索 GitHub 扩展" />
      <BaseButton
        size="compact"
        :loading="searching"
        :disabled="busy || searching"
        @click="emit('search')"
      >
        <template #icon><Search :size="15" /></template>
        搜索
      </BaseButton>
    </div>
    <button
      class="icon-button"
      type="button"
      title="刷新"
      :disabled="busy || loading"
      @click="emit('refresh')"
    >
      <RefreshCw :size="16" />
    </button>
  </section>

  <section
    v-if="searchCompleted || results.length"
    class="extension-section"
    aria-labelledby="extension-search-results-title"
  >
    <header class="extension-section__heading">
      <strong id="extension-search-results-title">搜索结果</strong>
      <span>{{ results.length }} 项</span>
    </header>
    <EmptyState
      v-if="searchCompleted && !searching && results.length === 0"
      compact
      title="没有找到匹配的扩展"
      description="可以换一个关键词，或直接使用上方仓库地址安装。"
    >
      <template #icon><SearchX :size="18" /></template>
    </EmptyState>
    <div v-else-if="results.length" class="extension-results">
      <article
        v-for="item in results"
        :key="item.repo"
        class="source-row"
      >
        <div class="source-row__main">
          <span class="eyebrow">{{ item.stars }} stars</span>
          <h2>{{ item.repo }}</h2>
          <p>{{ item.description }}</p>
        </div>
        <BaseButton
          size="compact"
          variant="secondary"
          :disabled="busy"
          @click="emit('install', item.repo)"
        >
          安装
        </BaseButton>
      </article>
    </div>
  </section>

  <section
    class="extension-section"
    aria-labelledby="installed-extensions-title"
  >
    <header class="extension-section__heading">
      <strong id="installed-extensions-title">已安装扩展</strong>
      <span>{{ extensions.length }} 项</span>
    </header>
    <p v-if="loading" class="empty-copy">正在读取 V2 扩展…</p>
    <div v-else class="source-list">
      <article
        v-for="extension in extensions"
        :key="extension.id"
        class="extension-row"
      >
        <header class="extension-row__header">
          <div class="source-row__main">
            <span class="eyebrow">
              V2 · {{ extension.provides?.join(" · ") || "extension" }}
            </span>
            <h2>{{ extension.name || extension.id }}</h2>
            <p>
              {{ extension.id }}
              <span v-if="extension.version">v{{ extension.version }}</span>
            </p>
          </div>
          <div class="action-row extension-row__actions">
            <BaseButton
              v-if="extension.backends?.length"
              size="compact"
              variant="secondary"
              :disabled="busy"
              @click="emit('setup', extension)"
            >
              重跑 setup
            </BaseButton>
            <BaseButton
              size="compact"
              variant="secondary"
              :disabled="busy"
              @click="emit('configure', extension)"
            >
              <template #icon><Settings2 :size="15" /></template>
              配置
            </BaseButton>
            <BaseButton
              size="compact"
              :disabled="busy"
              @click="emit('secret', extension)"
            >
              密钥
            </BaseButton>
            <BaseButton
              size="compact"
              danger-text
              :disabled="busy"
              @click="emit('remove', extension)"
            >
              <template #icon><Trash2 :size="15" /></template>
              卸载
            </BaseButton>
          </div>
        </header>

        <p v-if="extension.error" class="extension-error">
          V2 manifest 读取失败：{{ extension.error }}
        </p>

        <div class="extension-capabilities">
          <section class="extension-capability">
            <h3>后端</h3>
            <ul v-if="extension.backends?.length">
              <li v-for="backend in extension.backends" :key="backend.id">
                <div>
                  <strong>{{ backend.name }}</strong>
                  <span>{{ backend.id }}</span>
                </div>
                <div class="token-row">
                  <span
                    class="token"
                    :class="backend.installed ? 'token--ok' : 'token--warn'"
                  >
                    {{ backend.installed ? "已安装" : "未安装" }}
                  </span>
                  <span
                    v-if="backend.installed"
                    class="token"
                    :class="backend.enabled ? 'token--ok' : 'token--warn'"
                  >
                    {{ backend.enabled ? "已启用" : "已停用" }}
                  </span>
                  <span v-if="backend.version" class="token">
                    v{{ backend.version }}
                  </span>
                </div>
              </li>
            </ul>
            <p v-else class="empty-meta">未声明外部后端</p>
          </section>

          <section class="extension-capability">
            <h3>抓取通道</h3>
            <ul v-if="extension.fetch_channels?.length">
              <li v-for="channel in extension.fetch_channels" :key="channel.id">
                <div>
                  <strong>{{ channel.name || channel.id }}</strong>
                  <span>{{ channel.id }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="empty-meta">未声明抓取通道</p>
          </section>

          <section class="extension-capability">
            <h3>搜索源</h3>
            <ul v-if="extension.search_engines?.length">
              <li v-for="engine in extension.search_engines" :key="engine.id">
                <div>
                  <strong>{{ engine.name || engine.id }}</strong>
                  <span>{{ engine.id }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="empty-meta">未声明搜索源</p>
          </section>
        </div>
      </article>
      <EmptyState
        v-if="extensions.length === 0"
        embedded
        title="尚未安装 V2 扩展"
        description="可从上方仓库安装，或先搜索 GitHub 扩展。"
      >
        <template #icon><PackageOpen :size="20" /></template>
      </EmptyState>
    </div>
  </section>
</template>
