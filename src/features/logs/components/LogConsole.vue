<script setup lang="ts">
import { ScrollText } from "@lucide/vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import EmptyState from "@/shared/ui/EmptyState.vue";
import type { LogFeedLine } from "../composables/useLogFeed";

const props = defineProps<{
  lines: LogFeedLine[];
  following: boolean;
  autoScroll: boolean;
}>();

const logBox = ref<HTMLElement | null>(null);
const liveAnnouncement = ref("");
let announcementTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => [props.autoScroll, props.lines.at(-1)?.id] as const,
  async ([autoScroll]) => {
    if (!autoScroll) return;
    await nextTick();
    const box = logBox.value;
    if (!box) return;
    box.scrollTo({
      top: box.scrollHeight,
      behavior: "auto",
    });
  },
  { flush: "post" },
);

watch(
  () => props.lines.at(-1),
  (entry) => {
    if (!entry) {
      liveAnnouncement.value = "";
      return;
    }
    if (announcementTimer) clearTimeout(announcementTimer);
    announcementTimer = setTimeout(() => {
      liveAnnouncement.value = `${entry.service}: ${entry.line}`;
      announcementTimer = null;
    }, 400);
  },
);

onBeforeUnmount(() => {
  if (announcementTimer) clearTimeout(announcementTimer);
});
</script>

<template>
  <section ref="logBox" class="log-console">
    <div v-if="lines.length === 0" class="log-empty">
      <EmptyState
        class="log-empty__state"
        title="暂无匹配日志"
        description="启动服务或开启实时跟随后，新内容会显示在这里。"
      >
        <template #icon><ScrollText :size="20" /></template>
      </EmptyState>
    </div>
    <div
      v-for="entry in lines"
      :key="entry.id"
      class="log-line"
    >
      <time>{{ entry.at ? new Date(entry.at).toLocaleTimeString() : "—" }}</time>
      <span :class="`service-token service-token--${entry.service}`">
        {{ entry.service }}
      </span>
      <code>{{ entry.line }}</code>
    </div>
  </section>
  <p class="log-live-region" aria-live="polite" aria-atomic="true">
    {{ liveAnnouncement }}
  </p>
  <footer class="log-footer">
    <span>{{ lines.length }} 行</span>
    <span v-if="following" class="live-indicator"><i /> 实时跟随中</span>
    <span v-else>已暂停</span>
  </footer>
</template>
