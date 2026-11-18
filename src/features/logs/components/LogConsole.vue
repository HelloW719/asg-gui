<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { LogLine } from "@/types/cli";

const props = defineProps<{
  lines: LogLine[];
  following: boolean;
  autoScroll: boolean;
}>();

const logBox = ref<HTMLElement | null>(null);

watch(
  () => props.lines.length,
  async () => {
    if (!props.autoScroll) return;
    await nextTick();
    logBox.value?.scrollTo({
      top: logBox.value.scrollHeight,
      behavior: "smooth",
    });
  },
);
</script>

<template>
  <section ref="logBox" class="log-console glass-surface" aria-live="polite">
    <div v-if="lines.length === 0" class="log-empty">
      暂无匹配日志。启动服务或开启实时跟随后会显示新内容。
    </div>
    <div
      v-for="(entry, index) in lines"
      :key="`${entry.at}-${entry.service}-${index}`"
      class="log-line"
    >
      <time>{{ entry.at ? new Date(entry.at).toLocaleTimeString() : "—" }}</time>
      <span :class="`service-token service-token--${entry.service}`">
        {{ entry.service }}
      </span>
      <code>{{ entry.line }}</code>
    </div>
  </section>
  <footer class="log-footer">
    <span>{{ lines.length }} 行</span>
    <span v-if="following" class="live-indicator"><i /> 实时跟随中</span>
    <span v-else>已暂停</span>
  </footer>
</template>
