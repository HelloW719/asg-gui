<script setup lang="ts">
import MarkdownResult from "./MarkdownResult.vue";

defineProps<{
  text: string;
  meta: string;
  title: string;
}>();
</script>

<template>
  <MarkdownResult v-if="text" :text="text" :title="title" />
  <section v-else class="result-panel result-panel--empty" aria-live="polite">
    <div class="result-empty">
      <span class="result-empty__mark" aria-hidden="true" />
      <h2>等待{{ title }}</h2>
      <p>执行上方操作后，CLI 返回的正文和结构化信息会显示在这里。</p>
    </div>
  </section>
  <div v-if="meta" class="result-meta glass-surface">{{ meta }}</div>
</template>
