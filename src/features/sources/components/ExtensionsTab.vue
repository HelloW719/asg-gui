<script setup lang="ts">
import { Download, RefreshCw, Search, Settings2, Trash2 } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import type { ExtensionInfo, ExtensionSearchItem } from "@/types/cli";

const repo = defineModel<string>("repo", { required: true });
const query = defineModel<string>("query", { required: true });

defineProps<{
  extensions: ExtensionInfo[];
  results: ExtensionSearchItem[];
  loading: boolean;
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
  <section class="source-toolbar glass-surface extension-toolbar">
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
      <BaseButton size="compact" @click="emit('search')">
        <template #icon><Search :size="15" /></template>
        搜索
      </BaseButton>
    </div>
    <button class="icon-button" type="button" title="刷新" @click="emit('refresh')">
      <RefreshCw :size="16" />
    </button>
  </section>

  <div v-if="results.length" class="extension-results">
    <article
      v-for="item in results"
      :key="item.repo"
      class="source-row glass-surface"
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

  <p v-if="loading" class="empty-copy">正在读取 V2 扩展…</p>
  <div v-else class="source-list">
    <article
      v-for="extension in extensions"
      :key="extension.id"
      class="glass-surface extension-row"
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
            @click="emit('configure', extension)"
          >
            <template #icon><Settings2 :size="15" /></template>
            配置
          </BaseButton>
          <BaseButton size="compact" @click="emit('secret', extension)">
            密钥
          </BaseButton>
          <BaseButton
            size="compact"
            danger-text
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
    <p v-if="extensions.length === 0" class="empty-copy">尚未安装 V2 扩展。</p>
  </div>
</template>
