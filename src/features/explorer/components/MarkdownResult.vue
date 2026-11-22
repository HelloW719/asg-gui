<script setup lang="ts">
import { computed, ref } from "vue";
import { Copy } from "@lucide/vue";
import { useDesktopIntegration } from "@/app/useDesktopIntegration";
import { renderSafeMarkdown } from "@/utils/markdown";

const props = defineProps<{
  text: string;
  title?: string;
}>();

const raw = ref(false);
const rendered = computed(() => renderSafeMarkdown(props.text));
const desktop = useDesktopIntegration();

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(props.text);
}

async function handleContentClick(event: MouseEvent): Promise<void> {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  const url = new URL(anchor.href);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  event.preventDefault();
  await desktop.openExternalUrl(url.toString());
}
</script>

<template>
  <section class="result-panel">
    <header class="result-panel__header">
      <div>
        <span class="eyebrow">结果</span>
        <h2>{{ title ?? "CLI 返回内容" }}</h2>
      </div>
      <div class="segmented-control">
        <button type="button" :class="{ active: !raw }" @click="raw = false">阅读</button>
        <button type="button" :class="{ active: raw }" @click="raw = true">原文</button>
        <button type="button" title="复制原文" @click="copy">
          <Copy :size="15" />
        </button>
      </div>
    </header>
    <pre v-if="raw" class="raw-output">{{ text }}</pre>
    <article v-else class="markdown-body" v-html="rendered" @click="handleContentClick" />
  </section>
</template>

