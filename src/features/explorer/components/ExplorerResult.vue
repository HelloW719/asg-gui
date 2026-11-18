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
  <div v-if="meta" class="result-meta glass-surface">{{ meta }}</div>
</template>
