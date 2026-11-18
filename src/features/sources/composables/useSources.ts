import { onMounted, reactive, ref } from "vue";
import { useAppStatus } from "@/app/useAppStatus";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import type {
  EngineInfo,
  EngineRouteDraft,
  ExtensionInfo,
  ExtensionSearchItem,
  PluginInfo,
  SecretPayload,
} from "@/types/cli";

export function useSources() {
  const appStatus = useAppStatus();
  const serviceClient = useAsgServices();
  const jobs = useJobsStore();
  const engines = ref<EngineInfo[]>([]);
  const plugins = ref<PluginInfo[]>([]);
  const extensions = ref<ExtensionInfo[]>([]);
  const extensionResults = ref<ExtensionSearchItem[]>([]);
  const pluginName = ref("bilibili:kukemc");
  const extensionRepo = ref("");
  const extensionQuery = ref("");
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const loading = reactive({ engines: false, plugins: false, extensions: false });
  const pluginToRemove = ref<PluginInfo | null>(null);
  const extensionToRemove = ref<ExtensionInfo | null>(null);
  const engineSecret = ref<EngineInfo | null>(null);
  const extensionSecret = ref<ExtensionInfo | null>(null);
  const configExtension = ref<ExtensionInfo | null>(null);
  const routeDrafts = reactive<Record<string, EngineRouteDraft>>({});

  function setError(cause: unknown): void {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }

  async function runAndRefresh(
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<void> {
    error.value = null;
    success.value = null;
    try {
      await action();
      success.value = successMessage;
      await appStatus.refresh();
    } catch (cause) {
      setError(cause);
    }
  }

  function syncRouteDrafts(): void {
    for (const engine of engines.value) {
      if (routeDrafts[engine.id]) continue;
      routeDrafts[engine.id] = {
        category:
          engine.routing.find((item) => item.startsWith("category:"))?.slice(9) ?? "",
        hotCategory: "",
      };
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
    await runAndRefresh(
      () => serviceClient.sources.setEngineEnabled(engine.id, enabled),
      `${engine.name} 已${enabled ? "启用" : "禁用"}。`,
    );
    await loadEngines();
  }

  async function changeSearxngRoute(engine: EngineInfo, route: string): Promise<void> {
    await runAndRefresh(
      () => serviceClient.sources.setSearxngRoute(engine.id, route),
      `${engine.name} 路由已设置为 ${route}。`,
    );
    await loadEngines();
  }

  async function saveGatewayRoute(engine: EngineInfo): Promise<void> {
    const draft = routeDrafts[engine.id];
    if (!draft) return;
    await runAndRefresh(
      () => serviceClient.sources.setGatewayRoute(engine.id, draft),
      `${engine.name} 路由已更新。`,
    );
    await loadEngines();
  }

  async function saveEngineSecret(payload: SecretPayload): Promise<void> {
    const engine = engineSecret.value;
    engineSecret.value = null;
    if (!engine) return;
    await runAndRefresh(
      () => serviceClient.sources.setEngineSecret(engine, payload),
      `${engine.name} 密钥已更新。`,
    );
  }

  async function loadPlugins(): Promise<void> {
    loading.plugins = true;
    try {
      plugins.value = await serviceClient.sources.listPlugins();
    } catch (cause) {
      setError(cause);
    } finally {
      loading.plugins = false;
    }
  }

  async function installPlugin(name = pluginName.value): Promise<void> {
    if (!name.trim()) return;
    await runAndRefresh(
      () => serviceClient.sources.installPlugin(name.trim()),
      `${name.trim()} 已安装。`,
    );
    await loadPlugins();
  }

  async function removePlugin(): Promise<void> {
    const plugin = pluginToRemove.value;
    pluginToRemove.value = null;
    if (!plugin) return;
    await runAndRefresh(
      () => serviceClient.sources.removePlugin(plugin),
      `${plugin.name} 已卸载。`,
    );
    await loadPlugins();
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
    try {
      extensionResults.value = await serviceClient.sources.searchExtensions(
        extensionQuery.value,
      );
    } catch (cause) {
      setError(cause);
    }
  }

  async function installExtension(repo = extensionRepo.value): Promise<void> {
    const target = repo.trim();
    if (!target) return;
    await runAndRefresh(
      () => serviceClient.sources.installExtension(target),
      `${target} 已安装。重启网关后生效。`,
    );
    extensionRepo.value = "";
    await loadExtensions();
  }

  async function removeExtension(): Promise<void> {
    const extension = extensionToRemove.value;
    extensionToRemove.value = null;
    if (!extension) return;
    await runAndRefresh(
      () => serviceClient.sources.removeExtension(extension),
      `${extension.id} 已卸载。`,
    );
    await loadExtensions();
  }

  async function saveExtensionSecret(payload: SecretPayload): Promise<void> {
    const extension = extensionSecret.value;
    extensionSecret.value = null;
    if (!extension || !payload.name) return;
    await runAndRefresh(
      () =>
        serviceClient.sources.setExtensionSecret(extension, {
          name: payload.name!,
          secret: payload.secret,
        }),
      `${extension.id} 的 ${payload.name} 已更新。`,
    );
  }

  onMounted(() => {
    void Promise.all([loadEngines(), loadPlugins(), loadExtensions()]);
  });

  return {
    appStatus,
    jobs,
    engines,
    plugins,
    extensions,
    extensionResults,
    pluginName,
    extensionRepo,
    extensionQuery,
    error,
    success,
    loading,
    pluginToRemove,
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
    loadPlugins,
    installPlugin,
    removePlugin,
    loadExtensions,
    searchExtensions,
    installExtension,
    removeExtension,
    saveExtensionSecret,
  };
}
