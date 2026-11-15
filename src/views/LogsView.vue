<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Download, Pause, Play, Search, Trash2 } from "@lucide/vue";
import InlineNotice from "../components/InlineNotice.vue";
import { useJobsStore } from "../stores/jobs";
import type { CliResult, JobEvent, LogLine } from "../types/cli";

const jobs = useJobsStore();
const selectedServices = ref<string[]>(["gateway", "supervisor"]);
const lines = ref<LogLine[]>([]);
const query = ref("");
const following = ref(false);
const autoScroll = ref(true);
const jobId = ref<string | null>(null);
const cancelCurrent = ref<(() => Promise<void>) | null>(null);
const error = ref<string | null>(null);
const logBox = ref<HTMLElement | null>(null);

const filteredLines = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return lines.value;
  return lines.value.filter(
    (entry) =>
      entry.line.toLowerCase().includes(needle) ||
      entry.service.toLowerCase().includes(needle),
  );
});

const serviceOptions = [
  { value: "gateway", label: "Gateway" },
  { value: "searxng", label: "SearXNG" },
  { value: "flaresolverr", label: "FlareSolverr" },
  { value: "supervisor", label: "Supervisor" },
];

onMounted(() => {
  void loadHistory();
});

onBeforeUnmount(() => {
  void cancelCurrent.value?.();
});

watch(
  () => lines.value.length,
  async () => {
    if (!autoScroll.value) return;
    await nextTick();
    logBox.value?.scrollTo({ top: logBox.value.scrollHeight, behavior: "smooth" });
  },
);

async function loadHistory(): Promise<void> {
  error.value = null;
  try {
    const result: CliResult<{ lines?: LogLine[] }> = await jobs.execute(
      ["logs", ...selectedServices.value, "--lines", "400"],
      { label: "读取日志" },
    );
    if (result.ok) lines.value = result.data?.lines ?? [];
    else error.value = result.error?.message ?? "日志读取失败。";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function handleEvent(event: JobEvent): void {
  if (event.kind === "stdout" && event.data && typeof event.data === "object") {
    const data = event.data as Record<string, unknown>;
    if (data.type === "event" && data.event === "log" && typeof data.line === "string") {
      lines.value.push({
        service: typeof data.service === "string" ? data.service : "cli",
        at: typeof data.at === "string" ? data.at : undefined,
        line: data.line,
      });
      if (lines.value.length > 2_000) lines.value.splice(0, lines.value.length - 2_000);
    }
  }
}

async function toggleFollow(): Promise<void> {
  if (following.value) {
    await stopFollow();
    return;
  }
  if (selectedServices.value.length === 0) {
    error.value = "至少选择一个日志服务。";
    return;
  }
  error.value = null;
  try {
    const running = await jobs.stream(
      ["logs", ...selectedServices.value, "-f"],
      { label: "跟随日志", onEvent: handleEvent, mode: "jsonl" },
    );
    jobId.value = running.jobId;
    cancelCurrent.value = running.cancel;
    following.value = true;
    void running.done
      .catch(() => undefined)
      .finally(() => {
        following.value = false;
        jobId.value = null;
        cancelCurrent.value = null;
      });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function stopFollow(): Promise<void> {
  await cancelCurrent.value?.();
  following.value = false;
  jobId.value = null;
  cancelCurrent.value = null;
}

async function downloadLogs(): Promise<void> {
  const blob = new Blob(
    [filteredLines.value.map((line) => `${line.at ?? ""} [${line.service}] ${line.line}`).join("\n")],
    { type: "text/plain;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `asg-${new Date().toISOString().replaceAll(":", "-")}.log`;
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="page logs-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">实时日志流</span>
        <h1>日志</h1>
        <p>通过 <code>logs --jsonl</code> 读取事件；暂停只停止 GUI 的跟随任务。</p>
      </div>
      <div class="action-row">
        <button class="button button--ghost button--compact" type="button" @click="downloadLogs">
          <Download :size="15" />
          导出
        </button>
        <button class="button button--primary button--compact" type="button" @click="toggleFollow">
          <Pause v-if="following" :size="15" />
          <Play v-else :size="15" />
          {{ following ? "暂停跟随" : "实时跟随" }}
        </button>
      </div>
    </header>

    <InlineNotice v-if="error" tone="error" :message="error" dismissible @dismiss="error = null" />

    <section class="log-toolbar glass-surface">
      <div class="service-filters">
        <label v-for="service in serviceOptions" :key="service.value" class="check-label">
          <input v-model="selectedServices" type="checkbox" :value="service.value" :disabled="following" />
          {{ service.label }}
        </label>
      </div>
      <label class="search-field">
        <Search :size="15" />
        <input v-model="query" type="search" placeholder="筛选日志" />
      </label>
      <label class="check-label">
        <input v-model="autoScroll" type="checkbox" />
        自动滚动
      </label>
      <button class="icon-button" type="button" title="清空视图" @click="lines = []">
        <Trash2 :size="16" />
      </button>
    </section>

    <section ref="logBox" class="log-console glass-surface" aria-live="polite">
      <div v-if="filteredLines.length === 0" class="log-empty">
        暂无匹配日志。启动服务或开启实时跟随后会显示新内容。
      </div>
      <div v-for="(entry, index) in filteredLines" :key="`${entry.at}-${entry.service}-${index}`" class="log-line">
        <time>{{ entry.at ? new Date(entry.at).toLocaleTimeString() : "—" }}</time>
        <span :class="`service-token service-token--${entry.service}`">{{ entry.service }}</span>
        <code>{{ entry.line }}</code>
      </div>
    </section>
    <footer class="log-footer">
      <span>{{ filteredLines.length }} 行</span>
      <span v-if="following" class="live-indicator"><i /> 实时跟随中</span>
      <span v-else>已暂停</span>
    </footer>
  </div>
</template>

