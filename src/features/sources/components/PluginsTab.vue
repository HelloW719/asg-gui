<script setup lang="ts">
import { PackagePlus, RefreshCw, Trash2 } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import type { PluginInfo } from "@/types/cli";

const pluginName = defineModel<string>("pluginName", { required: true });

defineProps<{
  plugins: PluginInfo[];
  loading: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  install: [name?: string];
  remove: [plugin: PluginInfo];
  refresh: [];
}>();
</script>

<template>
  <section class="source-toolbar glass-surface">
    <div class="inline-field">
      <input
        v-model="pluginName"
        placeholder="插件名或规范通道，如 bilibili:kukemc"
      />
      <BaseButton
        size="compact"
        variant="secondary"
        :disabled="busy"
        @click="emit('install')"
      >
        <template #icon><PackagePlus :size="15" /></template>
        安装
      </BaseButton>
    </div>
    <BaseButton size="compact" @click="emit('refresh')">
      <template #icon><RefreshCw :size="15" /></template>
      刷新
    </BaseButton>
  </section>

  <p v-if="loading" class="empty-copy">正在读取内置插件…</p>
  <div v-else class="source-list">
    <article
      v-for="plugin in plugins"
      :key="plugin.name"
      class="source-row glass-surface"
    >
      <div class="source-row__main">
        <span class="eyebrow">{{ plugin.channel_id }}</span>
        <h2>{{ plugin.platform }} · {{ plugin.channel }}</h2>
        <p>{{ plugin.path }}</p>
      </div>
      <div class="token-row">
        <span class="token" :class="plugin.installed ? 'token--ok' : ''">
          {{ plugin.installed ? "已安装" : "未安装" }}
        </span>
        <span class="token" :class="plugin.enabled ? 'token--ok' : 'token--warn'">
          {{ plugin.enabled ? "已启用" : "未启用" }}
        </span>
        <span v-if="plugin.version" class="token">v{{ plugin.version }}</span>
      </div>
      <div class="source-row__actions">
        <BaseButton
          v-if="!plugin.installed"
          size="compact"
          variant="secondary"
          :disabled="busy"
          @click="emit('install', plugin.channel_id)"
        >
          安装
        </BaseButton>
        <BaseButton
          v-else
          size="compact"
          danger-text
          :disabled="busy"
          @click="emit('remove', plugin)"
        >
          <template #icon><Trash2 :size="15" /></template>
          卸载
        </BaseButton>
      </div>
    </article>
    <p v-if="plugins.length === 0" class="empty-copy">没有可显示的内置插件。</p>
  </div>
</template>
