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
      <input v-model="query" type="search" placeholder="搜索 GitHub 插件" />
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

  <p v-if="loading" class="empty-copy">正在读取第三方扩展…</p>
  <div v-else class="source-list">
    <article
      v-for="extension in extensions"
      :key="extension.id"
      class="source-row glass-surface extension-row"
    >
      <div class="source-row__main">
        <span class="eyebrow">
          {{ extension.provides?.join(" · ") || "extension" }}
        </span>
        <h2>{{ extension.name || extension.id }}</h2>
        <p>
          {{ extension.id }}
          <span v-if="extension.version">v{{ extension.version }}</span>
        </p>
      </div>
      <div class="action-row">
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
    </article>
    <p v-if="extensions.length === 0" class="empty-copy">尚未安装第三方扩展。</p>
  </div>
</template>
