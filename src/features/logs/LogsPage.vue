<script setup lang="ts">
import { computed, ref } from "vue";
import { Download, Pause, Play } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import LogConsole from "./components/LogConsole.vue";
import LogToolbar from "./components/LogToolbar.vue";
import { useLogFeed } from "./composables/useLogFeed";

defineOptions({ name: "LogsPage" });

const feed = useLogFeed();
const autoScroll = ref(true);
const followLoading = computed(
  () => feed.starting.value || feed.stopping.value,
);
const followLabel = computed(() => {
  if (feed.starting.value) return "正在跟随";
  if (feed.stopping.value) return "正在暂停";
  return feed.following.value ? "暂停跟随" : "实时跟随";
});
</script>

<template>
  <div class="page logs-page">
    <PageHeader
      title="日志"
      index="04"
      label="LOGS"
      description="通过 logs --jsonl 读取事件；暂停只停止 GUI 的跟随任务。"
    >
      <template #actions>
        <BaseButton
          size="compact"
          :disabled="feed.filteredLines.value.length === 0"
          @click="feed.downloadLogs"
        >
          <template #icon><Download :size="15" /></template>
          导出
        </BaseButton>
        <BaseButton
          size="compact"
          variant="primary"
          :loading="followLoading"
          @click="feed.toggleFollow"
        >
          <template #icon>
            <Pause v-if="feed.following.value" :size="15" />
            <Play v-else :size="15" />
          </template>
          {{ followLabel }}
        </BaseButton>
      </template>
    </PageHeader>

    <InlineNotice
      v-if="feed.error.value"
      tone="error"
      :message="feed.error.value"
      dismissible
      @dismiss="feed.error.value = null"
    />

    <div class="logs-workspace glass-surface">
      <LogToolbar
        :query="feed.query.value"
        :selected-services="feed.selectedServices.value"
        :auto-scroll="autoScroll"
        :following="feed.following.value"
        :options="feed.serviceOptions"
        @update:query="feed.query.value = $event"
        @update:selected-services="feed.selectedServices.value = $event"
        @update:auto-scroll="autoScroll = $event"
        @clear="feed.clear"
      />

      <LogConsole
        :lines="feed.filteredLines.value"
        :following="feed.following.value"
        :auto-scroll="autoScroll"
      />
    </div>
  </div>
</template>

<style src="./styles/logs.css"></style>
