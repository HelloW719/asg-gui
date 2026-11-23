import { computed, ref } from "vue";
import { useAppStatus } from "@/app/useAppStatus";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import { useSessionStore } from "@/stores/session";
import type { ExtensionInfo } from "@/types/cli";
import {
  deriveMissingSecretCandidates,
  type SecretCandidate,
} from "./secretPresentation";

export type WelcomeStep = "root" | "secrets" | "extensions";

export interface OfficialExtension {
  id: string;
  repo: string;
  name: string;
  description: string;
  capabilities: string;
}

export const WELCOME_STEPS: ReadonlyArray<{
  value: WelcomeStep;
  index: string;
  label: string;
}> = [
  { value: "root", index: "01", label: "接入系统" },
  { value: "secrets", index: "02", label: "配置密钥" },
  { value: "extensions", index: "03", label: "下载扩展" },
];

export const OFFICIAL_EXTENSIONS: readonly OfficialExtension[] = [
  {
    id: "bilibili",
    repo: "djasdh/agent-search-gateway-plugin-bilibili",
    name: "Bilibili",
    description: "抓取视频、专栏和评论相关页面。",
    capabilities: "视频 · 专栏 · 评论",
  },
  {
    id: "weibo",
    repo: "djasdh/agent-search-gateway-plugin-weibo",
    name: "微博",
    description: "支持微博内容抓取与专用搜索源。",
    capabilities: "抓取 · 搜索",
  },
  {
    id: "cnki",
    repo: "djasdh/agent-search-gateway-plugin-cnki",
    name: "知网",
    description: "识别知网文献页面并尝试取回可访问的 PDF。",
    capabilities: "文献 · PDF",
  },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useWelcomeWizard() {
  const session = useSessionStore();
  const jobs = useJobsStore();
  const appStatus = useAppStatus();
  const services = useAsgServices();
  const currentStep = ref<WelcomeStep>("root");
  const maxVisitedIndex = ref(0);

  const secretCandidates = ref<SecretCandidate[]>([]);
  const secretPath = ref("");
  const secretValue = ref("");
  const secretError = ref<string | null>(null);
  const secretSuccess = ref<string | null>(null);
  const loadingSecrets = ref(false);
  const savingSecret = ref(false);

  const extensions = ref<ExtensionInfo[]>([]);
  const extensionError = ref<string | null>(null);
  const extensionSuccess = ref<string | null>(null);
  const loadingExtensions = ref(false);
  const installingRepo = ref<string | null>(null);
  const customRepo = ref("");
  const installedThisSession = ref(false);

  const finishError = ref<string | null>(null);
  const finishing = ref(false);

  const stepIndex = computed(
    () => WELCOME_STEPS.findIndex((step) => step.value === currentStep.value),
  );
  const selectedSecret = computed(
    () =>
      secretCandidates.value.find(
        (candidate) => candidate.path === secretPath.value,
      ) ?? null,
  );
  const secretOptions = computed(() =>
    secretCandidates.value.map((candidate) => ({
      value: candidate.path,
      label: candidate.label,
    })),
  );
  const installedExtensionIds = computed(
    () => new Set(extensions.value.map((extension) => extension.id)),
  );
  const hasNewExtensions = computed(() => installedThisSession.value);

  function stepEnabled(step: WelcomeStep): boolean {
    const index = WELCOME_STEPS.findIndex((item) => item.value === step);
    return index >= 0 && index <= maxVisitedIndex.value;
  }

  function stepComplete(step: WelcomeStep): boolean {
    const index = WELCOME_STEPS.findIndex((item) => item.value === step);
    return index >= 0 && index < maxVisitedIndex.value;
  }

  function setStep(step: string): void {
    const next = WELCOME_STEPS.find((item) => item.value === step);
    if (!next || !stepEnabled(next.value)) return;
    currentStep.value = next.value;
  }

  function visit(step: WelcomeStep): void {
    const index = WELCOME_STEPS.findIndex((item) => item.value === step);
    if (index < 0) return;
    maxVisitedIndex.value = Math.max(maxVisitedIndex.value, index);
    currentStep.value = step;
  }

  function previous(): void {
    const previousStep = WELCOME_STEPS[stepIndex.value - 1];
    if (previousStep) currentStep.value = previousStep.value;
  }

  async function refreshSecrets(showLoading = true): Promise<void> {
    if (showLoading) loadingSecrets.value = true;
    secretError.value = null;
    try {
      const [config, engines] = await Promise.all([
        services.config.getAll(),
        services.sources.listEngines(false),
      ]);
      secretCandidates.value = deriveMissingSecretCandidates(config, engines);
      if (
        !secretCandidates.value.some(
          (candidate) => candidate.path === secretPath.value,
        )
      ) {
        secretPath.value = secretCandidates.value[0]?.path ?? "";
      }
    } catch (error) {
      secretCandidates.value = [];
      secretPath.value = "";
      secretError.value = messageOf(error);
    } finally {
      if (showLoading) loadingSecrets.value = false;
    }
  }

  async function continueToSecrets(): Promise<void> {
    if (!session.rootValid) return;
    visit("secrets");
    await refreshSecrets();
  }

  function continueToExtensions(): void {
    visit("extensions");
    void loadExtensions();
  }

  function skipSecrets(): void {
    continueToExtensions();
  }

  async function saveSecret(): Promise<void> {
    if (
      !secretPath.value ||
      secretValue.value.length === 0 ||
      savingSecret.value
    ) {
      return;
    }
    savingSecret.value = true;
    secretError.value = null;
    secretSuccess.value = null;
    const savedPath = secretPath.value;
    try {
      await services.config.setSecret(savedPath, secretValue.value);
      secretValue.value = "";
      secretSuccess.value = `${savedPath} 已保存，整栈重启完成。`;
      await refreshSecrets(false);
      await appStatus.refresh();
    } catch (error) {
      secretError.value = messageOf(error);
    } finally {
      savingSecret.value = false;
    }
  }

  async function loadExtensions(): Promise<void> {
    loadingExtensions.value = true;
    extensionError.value = null;
    try {
      extensions.value = await services.sources.listExtensions();
    } catch (error) {
      extensionError.value = messageOf(error);
    } finally {
      loadingExtensions.value = false;
    }
  }

  async function installExtension(repo: string): Promise<void> {
    const target = repo.trim();
    if (!target || installingRepo.value) return;
    installingRepo.value = target;
    extensionError.value = null;
    extensionSuccess.value = null;
    try {
      await services.sources.installExtension(target);
      installedThisSession.value = true;
      customRepo.value = "";
      extensionSuccess.value = `${target} 已安装，将在完成向导时随整栈重启生效。`;
      await loadExtensions();
    } catch (error) {
      extensionError.value = messageOf(error);
    } finally {
      installingRepo.value = null;
    }
  }

  async function finish(): Promise<boolean> {
    if (finishing.value) return false;
    finishing.value = true;
    finishError.value = null;
    try {
      if (installedThisSession.value) {
        await services.lifecycle.run("restart");
        await appStatus.refresh();
      }
      await session.setOnboardingCompleted(true);
      return true;
    } catch (error) {
      finishError.value = messageOf(error);
      return false;
    } finally {
      finishing.value = false;
    }
  }

  return {
    session,
    jobs,
    currentStep,
    secretCandidates,
    secretPath,
    secretValue,
    secretError,
    secretSuccess,
    loadingSecrets,
    savingSecret,
    selectedSecret,
    secretOptions,
    extensions,
    extensionError,
    extensionSuccess,
    loadingExtensions,
    installingRepo,
    customRepo,
    installedThisSession,
    installedExtensionIds,
    hasNewExtensions,
    finishError,
    finishing,
    stepIndex,
    stepEnabled,
    stepComplete,
    setStep,
    previous,
    continueToSecrets,
    continueToExtensions,
    skipSecrets,
    saveSecret,
    loadExtensions,
    installExtension,
    finish,
  };
}
