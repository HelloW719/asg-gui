<script setup lang="ts">
import { FileClock } from "@lucide/vue";
import EmptyState from "@/shared/ui/EmptyState.vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { LogLine } from "@/types/cli";

defineProps<{
  logs: LogLine[];
}>();
</script>

<template>
  <section class="content-card glass-surface">
    <SectionHeading title="日志片段">
      <RouterLink class="text-link" to="/logs">
        <FileClock :size="15" />
        打开日志
      </RouterLink>
    </SectionHeading>
    <div v-if="logs.length" class="log-preview">
      <div
        v-for="(entry, index) in logs"
        :key="`${entry.at}-${index}`"
        class="log-preview__line"
      >
        <span>{{ entry.service }}</span>
        <code>{{ entry.line }}</code>
      </div>
    </div>
    <EmptyState
      v-else
      compact
      title="暂无可用日志"
      description="服务启动后，这里会显示最近的输出。"
    >
      <template #icon><FileClock :size="18" /></template>
    </EmptyState>
  </section>
</template>
