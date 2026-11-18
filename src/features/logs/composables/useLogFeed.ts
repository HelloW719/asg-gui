import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useAsgServices } from "@/app/useAsgServices";
import type { FollowLogHandle } from "@/services/asg";
import type { JobEvent, LogLine } from "@/types/cli";

export const LOG_SERVICE_OPTIONS = [
  { value: "gateway", label: "Gateway" },
  { value: "searxng", label: "SearXNG" },
  { value: "flaresolverr", label: "FlareSolverr" },
  { value: "supervisor", label: "Supervisor" },
] as const;

export function useLogFeed() {
  const serviceClient = useAsgServices();
  const selectedServices = ref<string[]>(["gateway", "supervisor"]);
  const lines = ref<LogLine[]>([]);
  const query = ref("");
  const following = ref(false);
  const jobId = ref<string | null>(null);
  const followHandle = ref<FollowLogHandle | null>(null);
  const error = ref<string | null>(null);

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
    error.value = null;
    try {
      lines.value = await serviceClient.logs.read(400, selectedServices.value);
    } catch (cause) {
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
    lines.value.push({
      service: typeof data.service === "string" ? data.service : "cli",
      at: typeof data.at === "string" ? data.at : undefined,
      line: data.line,
    });
    if (lines.value.length > 2_000) {
      lines.value.splice(0, lines.value.length - 2_000);
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
      const running = await serviceClient.logs.follow(
        selectedServices.value,
        handleEvent,
      );
      jobId.value = running.jobId;
      followHandle.value = running;
      following.value = true;
      void running.done
        .catch(() => undefined)
        .finally(() => {
          following.value = false;
          jobId.value = null;
          followHandle.value = null;
        });
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function stopFollow(): Promise<void> {
    await followHandle.value?.cancel();
    following.value = false;
    jobId.value = null;
    followHandle.value = null;
  }

  function clear(): void {
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
    void followHandle.value?.cancel();
  });

  return {
    selectedServices,
    lines,
    query,
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
