import { computed, onMounted, ref } from "vue";
import { useAppStatus } from "@/app/useAppStatus";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import { useSessionStore } from "@/stores/session";

export interface ConfigLeaf {
  path: string;
  group: string;
  value: unknown;
  secret: boolean;
}

export type ConfigGroup = readonly [group: string, fields: ConfigLeaf[]];

export function useSettings() {
  const session = useSessionStore();
  const appStatus = useAppStatus();
  const jobs = useJobsStore();
  const serviceClient = useAsgServices();
  const config = ref<Record<string, unknown> | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const search = ref("");
  const editing = ref<ConfigLeaf | null>(null);
  const editValue = ref("");
  const pendingSave = ref<ConfigLeaf | null>(null);
  const secretField = ref<ConfigLeaf | null>(null);
  const forgetOpen = ref(false);
  const validated = ref<boolean | null>(null);

  const groupLabels: Record<string, string> = {
    gateway: "网关",
    logging: "日志",
    searxng: "SearXNG",
    flaresolverr: "FlareSolverr",
    search: "搜索",
    rerank: "重排",
    ad_filter: "广告过滤",
    fetch: "抓取",
    bilibili: "Bilibili",
    weibo: "微博",
    browser: "浏览器",
    embedding: "语义向量",
    corpus: "语料库",
    extensions: "扩展配置",
    secrets: "密钥状态",
  };

  function flatten(value: unknown, prefix: string, target: ConfigLeaf[]): void {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        flatten(child, prefix ? `${prefix}.${key}` : key, target);
      }
      return;
    }
    const group = prefix.split(".")[0] ?? "other";
    target.push({
      path: prefix,
      group,
      value,
      secret: prefix.startsWith("secrets."),
    });
  }

  const rows = computed<ConfigLeaf[]>(() => {
    if (!config.value) return [];
    const result: ConfigLeaf[] = [];
    flatten(config.value, "", result);
    const needle = search.value.trim().toLowerCase();
    return needle
      ? result.filter((row) => row.path.toLowerCase().includes(needle))
      : result;
  });

  const groupedRows = computed<ConfigGroup[]>(() => {
    const groups = new Map<string, ConfigLeaf[]>();
    for (const row of rows.value) {
      const entries = groups.get(row.group) ?? [];
      entries.push(row);
      groups.set(row.group, entries);
    }
    return [...groups.entries()];
  });

  function serializedValue(value: unknown): string {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  async function loadConfig(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      config.value = await serviceClient.config.getAll();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
    }
  }

  function beginEdit(row: ConfigLeaf): void {
    if (row.secret) {
      secretField.value = row;
      return;
    }
    editing.value = row;
    editValue.value = serializedValue(row.value);
  }

  function cancelEdit(): void {
    editing.value = null;
    editValue.value = "";
  }

  async function saveSecret(payload: { secret: string }): Promise<void> {
    if (!secretField.value) return;
    error.value = null;
    try {
      await serviceClient.config.setSecret(secretField.value.path, payload.secret);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      secretField.value = null;
      await loadConfig();
    }
  }

  async function saveField(): Promise<void> {
    const row = pendingSave.value;
    pendingSave.value = null;
    if (!row) return;
    error.value = null;
    try {
      await serviceClient.config.set(
        row.path,
        editValue.value,
        typeof row.value === "string",
      );
      cancelEdit();
      validated.value = null;
      await appStatus.refresh();
      await loadConfig();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function validate(): Promise<void> {
    error.value = null;
    validated.value = null;
    try {
      await serviceClient.config.validate();
      validated.value = true;
    } catch (cause) {
      validated.value = false;
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function forgetRoot(): Promise<void> {
    forgetOpen.value = false;
    await session.forgetRoot();
  }

  onMounted(() => {
    void loadConfig();
  });

  return {
    session,
    jobs,
    config,
    loading,
    error,
    search,
    editing,
    editValue,
    pendingSave,
    secretField,
    forgetOpen,
    validated,
    groupLabels,
    rows,
    groupedRows,
    loadConfig,
    beginEdit,
    cancelEdit,
    saveSecret,
    saveField,
    validate,
    forgetRoot,
  };
}
