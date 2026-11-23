import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useAsgServices } from "@/app/useAsgServices";
import type { FollowLogHandle } from "@/services/asg";
import type { JobEvent, LogLine } from "@/types/cli";

export interface LogFeedLine extends LogLine {
  id: number;
}

const MAX_LOG_LINES = 2_000;

export const LOG_SERVICE_OPTIONS = [
  { value: "gateway", label: "Gateway" },
  { value: "searxng", label: "SearXNG" },
  { value: "flaresolverr", label: "FlareSolverr" },
  { value: "supervisor", label: "Supervisor" },
] as const;

export function useLogFeed() {
  const serviceClient = useAsgServices();
  const selectedServices = ref<string[]>(["gateway", "supervisor"]);
  const lines = ref<LogFeedLine[]>([]);
  const query = ref("");
  const starting = ref(false);
  const following = ref(false);
  const jobId = ref<string | null>(null);
  const followHandle = ref<FollowLogHandle | null>(null);
  const error = ref<string | null>(null);
  let nextLineId = 1;
  let historyRevision = 0;
  let pendingLines: LogFeedLine[] = [];
  let flushFrame: number | null = null;

  function flushPendingLines(): void {
    flushFrame = null;
    if (pendingLines.length === 0) return;
    const nextLines = lines.value.concat(pendingLines);
    pendingLines = [];
    lines.value =
      nextLines.length > MAX_LOG_LINES
        ? nextLines.slice(-MAX_LOG_LINES)
        : nextLines;
  }

  function scheduleLineFlush(): void {
    if (flushFrame !== null) return;
    flushFrame = window.requestAnimationFrame(flushPendingLines);
  }

  function withLineId(line: LogLine): LogFeedLine {
    return { ...line, id: nextLineId++ };
  }

  const filteredLines = computed(() => {
    const needle = query.value.trim().toLowerCase();
    if (!needle) return lines.value;
    return lines.value.filter(
      (entry) =>
        entry.line.toLowerCase().includes(needle) ||
        entry.service.toLowerCase().includes(needle),
    );
  });

  async function loadHistory(): Promise<void> {
    const revision = ++historyRevision;
    error.value = null;
    try {
      const history = await serviceClient.logs.read(400, selectedServices.value);
      if (revision !== historyRevision) return;
      lines.value = history.map(withLineId);
    } catch (cause) {
      if (revision !== historyRevision) return;
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  function handleEvent(event: JobEvent): void {
    if (event.kind !== "stdout" || !event.data || typeof event.data !== "object") {
      return;
    }
    const data = event.data as Record<string, unknown>;
    if (data.type !== "event" || data.event !== "log" || typeof data.line !== "string") {
      return;
    }
    historyRevision += 1;
    pendingLines.push(
      withLineId({
        service: typeof data.service === "string" ? data.service : "cli",
        at: typeof data.at === "string" ? data.at : undefined,
        line: data.line,
      }),
    );
    if (pendingLines.length > MAX_LOG_LINES) {
      pendingLines.splice(0, pendingLines.length - MAX_LOG_LINES);
    }
    scheduleLineFlush();
  }

  async function toggleFollow(): Promise<void> {
    if (starting.value) return;
    if (following.value) {
      await stopFollow();
      return;
    }
    if (selectedServices.value.length === 0) {
      error.value = "至少选择一个日志服务。";
      return;
    }
    error.value = null;
    starting.value = true;
    try {
      const running = await serviceClient.logs.follow(
        selectedServices.value,
        handleEvent,
      );
      jobId.value = running.jobId;
      followHandle.value = running;
      following.value = true;
      const followJobId = running.jobId;
      void running.done
        .catch((cause) => {
          if (followHandle.value?.jobId === followJobId) {
            error.value = cause instanceof Error ? cause.message : String(cause);
          }
        })
        .finally(() => {
          if (followHandle.value?.jobId !== followJobId) return;
          following.value = false;
          jobId.value = null;
          followHandle.value = null;
        });
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      starting.value = false;
    }
  }

  async function stopFollow(): Promise<void> {
    const running = followHandle.value;
    if (!running) return;
    followHandle.value = null;
    following.value = false;
    jobId.value = null;
    try {
      await running.cancel();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  function clear(): void {
    historyRevision += 1;
    pendingLines = [];
    if (flushFrame !== null) {
      window.cancelAnimationFrame(flushFrame);
      flushFrame = null;
    }
    lines.value = [];
  }

  function downloadLogs(): void {
    if (filteredLines.value.length === 0) return;
    const blob = new Blob(
      [
        filteredLines.value
          .map((line) => `${line.at ?? ""} [${line.service}] ${line.line}`)
          .join("\n"),
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `asg-${new Date().toISOString().replaceAll(":", "-")}.log`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  onMounted(() => {
    void loadHistory();
  });

  onBeforeUnmount(() => {
    const running = followHandle.value;
    followHandle.value = null;
    pendingLines = [];
    if (flushFrame !== null) {
      window.cancelAnimationFrame(flushFrame);
      flushFrame = null;
    }
    void running?.cancel();
  });

  return {
    selectedServices,
    lines,
    query,
    starting,
    following,
    jobId,
    error,
    filteredLines,
    serviceOptions: LOG_SERVICE_OPTIONS,
    loadHistory,
    toggleFollow,
    stopFollow,
    clear,
    downloadLogs,
  };
}
