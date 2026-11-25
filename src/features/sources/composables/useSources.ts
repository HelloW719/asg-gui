import { onMounted, reactive, ref } from "vue";
import { useAppStatus } from "@/app/useAppStatus";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import type {
  EngineInfo,
  EngineRouteDraft,
  ExtensionInfo,
  ExtensionSearchItem,
  SecretPayload,
} from "@/types/cli";
import { engineRouteDraft } from "../enginePresentation";

export function useSources() {
  const appStatus = useAppStatus();
  const serviceClient = useAsgServices();
  const jobs = useJobsStore();
  const engines = ref<EngineInfo[]>([]);
  const extensions = ref<ExtensionInfo[]>([]);
  const extensionResults = ref<ExtensionSearchItem[]>([]);
  const extensionRepo = ref("");
  const extensionQuery = ref("");
  const extensionSearchCompleted = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const loading = reactive({
    engines: false,
    extensions: false,
    extensionSearch: false,
  });
  const extensionToRemove = ref<ExtensionInfo | null>(null);
  const engineSecret = ref<EngineInfo | null>(null);
  const extensionSecret = ref<ExtensionInfo | null>(null);
  const configExtension = ref<ExtensionInfo | null>(null);
  const routeDrafts = reactive<Record<string, EngineRouteDraft>>({});

  function setError(cause: unknown): void {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }

  function openEngineSecret(engine: EngineInfo): void {
    error.value = null;
    success.value = null;
    engineSecret.value = engine;
  }

  function openExtensionSecret(extension: ExtensionInfo): void {
    error.value = null;
    success.value = null;
    extensionSecret.value = extension;
  }

  async function runAndRefresh(
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<boolean> {
    error.value = null;
    success.value = null;
    try {
      await action();
      success.value = successMessage;
      await appStatus.refresh();
      return true;
    } catch (cause) {
      setError(cause);
      return false;
    }
  }

  function syncRouteDrafts(): void {
    for (const engine of engines.value) {
      if (routeDrafts[engine.id]) continue;
      routeDrafts[engine.id] = engineRouteDraft(engine);
    }
  }

  async function loadEngines(all = false): Promise<void> {
    loading.engines = true;
    error.value = null;
    try {
      engines.value = await serviceClient.sources.listEngines(all);
      syncRouteDrafts();
    } catch (cause) {
      setError(cause);
    } finally {
      loading.engines = false;
    }
  }

  async function toggleEngine(engine: EngineInfo): Promise<void> {
    const enabled = !engine.enabled;
    if (
      await runAndRefresh(
        () => serviceClient.sources.setEngineEnabled(engine.id, enabled),
        `${engine.name} 已${enabled ? "启用" : "禁用"}。`,
      )
    ) {
      await loadEngines();
    }
  }

  async function changeSearxngRoute(engine: EngineInfo, route: string): Promise<void> {
    if (
      await runAndRefresh(
        () => serviceClient.sources.setSearxngRoute(engine.id, route),
        `${engine.name} 路由已设置为 ${route}。`,
      )
    ) {
      await loadEngines();
    }
  }

  async function saveGatewayRoute(engine: EngineInfo): Promise<void> {
    const draft = routeDrafts[engine.id];
    if (!draft) return;
    if (
      await runAndRefresh(
        () => serviceClient.sources.setGatewayRoute(engine.id, draft),
        `${engine.name} 路由已更新。`,
      )
    ) {
      await loadEngines();
    }
  }

  async function saveEngineSecret(payload: SecretPayload): Promise<void> {
    const engine = engineSecret.value;
    if (!engine) return;
    if (
      await runAndRefresh(
        () => serviceClient.sources.setEngineSecret(engine, payload),
        `${engine.name} 密钥已更新。`,
      )
    ) {
      engineSecret.value = null;
    }
  }

  async function loadExtensions(): Promise<void> {
    loading.extensions = true;
    try {
      extensions.value = await serviceClient.sources.listExtensions();
    } catch (cause) {
      setError(cause);
    } finally {
      loading.extensions = false;
    }
  }

  async function searchExtensions(): Promise<void> {
    error.value = null;
    extensionSearchCompleted.value = false;
    loading.extensionSearch = true;
    try {
      extensionResults.value = await serviceClient.sources.searchExtensions(
        extensionQuery.value,
      );
      extensionSearchCompleted.value = true;
    } catch (cause) {
      setError(cause);
    } finally {
      loading.extensionSearch = false;
    }
  }

  async function installExtension(repo = extensionRepo.value): Promise<void> {
    const target = repo.trim();
    if (!target) return;
    if (
      await runAndRefresh(
        () => serviceClient.sources.installExtension(target),
        `${target} 已安装并执行后端 setup。重启网关后生效。`,
      )
    ) {
      extensionRepo.value = "";
      await loadExtensions();
    }
  }

  async function runExtensionSetup(extension: ExtensionInfo): Promise<void> {
    if (
      await runAndRefresh(
        () => serviceClient.sources.setupExtension(extension),
        `${extension.name || extension.id} 的后端 setup 已完成。重启网关后生效。`,
      )
    ) {
      await loadExtensions();
    }
  }

  async function removeExtension(): Promise<void> {
    const extension = extensionToRemove.value;
    if (!extension) return;
    if (
      await runAndRefresh(
        () => serviceClient.sources.removeExtension(extension),
        `${extension.id} 已卸载。重启网关后停止加载。`,
      )
    ) {
      extensionToRemove.value = null;
      await loadExtensions();
    }
  }

  async function saveExtensionSecret(payload: SecretPayload): Promise<void> {
    const extension = extensionSecret.value;
    if (!extension || !payload.name) return;
    if (
      await runAndRefresh(
        () =>
          serviceClient.sources.setExtensionSecret(extension, {
            name: payload.name!,
            secret: payload.secret,
          }),
        `${extension.id} 的 ${payload.name} 已更新。`,
      )
    ) {
      extensionSecret.value = null;
    }
  }

  onMounted(() => {
    void Promise.all([loadEngines(), loadExtensions()]);
  });

  return {
    appStatus,
    jobs,
    engines,
    extensions,
    extensionResults,
    extensionRepo,
    extensionQuery,
    extensionSearchCompleted,
    error,
    success,
    loading,
    extensionToRemove,
    engineSecret,
    extensionSecret,
    configExtension,
    routeDrafts,
    loadEngines,
    toggleEngine,
    changeSearxngRoute,
    saveGatewayRoute,
    saveEngineSecret,
    openEngineSecret,
    loadExtensions,
    searchExtensions,
    installExtension,
    runExtensionSetup,
    removeExtension,
    saveExtensionSecret,
    openExtensionSecret,
  };
}
