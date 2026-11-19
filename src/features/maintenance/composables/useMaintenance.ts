import { computed, onMounted, ref } from "vue";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import type {
  BrowserStatus,
  DoctorCheck,
  UpdateCheckStatus,
} from "@/types/cli";

export function useMaintenance() {
  const jobs = useJobsStore();
  const serviceClient = useAsgServices();
  const checks = ref<DoctorCheck[]>([]);
  const doctorLoaded = ref(false);
  const browser = ref<BrowserStatus | null>(null);
  const update = ref<UpdateCheckStatus | null>(null);
  const adLevel = ref("ads");
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const updateConfirm = ref(false);

  const unhealthy = computed(() => checks.value.filter((check) => !check.ok));

  function setError(cause: unknown): void {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }

  async function runDoctor(): Promise<void> {
    error.value = null;
    try {
      checks.value = await serviceClient.maintenance.doctor();
      doctorLoaded.value = true;
    } catch (cause) {
      setError(cause);
    }
  }

  async function loadBrowser(): Promise<void> {
    try {
      browser.value = await serviceClient.maintenance.browserStatus();
    } catch {
      // Optional browser diagnostics do not block the other cards.
    }
  }

  async function installBrowser(full: boolean): Promise<void> {
    error.value = null;
    success.value = null;
    try {
      browser.value = await serviceClient.maintenance.installBrowser(full);
      success.value = "Playwright 浏览器安装完成。";
    } catch (cause) {
      setError(cause);
    }
  }

  async function updateAdlist(): Promise<void> {
    error.value = null;
    success.value = null;
    try {
      await serviceClient.maintenance.updateAdlist(adLevel.value);
      success.value = "广告过滤列表已更新，整栈已重启。";
    } catch (cause) {
      setError(cause);
    }
  }

  async function checkUpdate(): Promise<void> {
    error.value = null;
    success.value = null;
    try {
      update.value = await serviceClient.maintenance.checkUpdate();
    } catch (cause) {
      setError(cause);
    }
  }

  async function applyUpdate(): Promise<void> {
    updateConfirm.value = false;
    error.value = null;
    success.value = null;
    try {
      await serviceClient.maintenance.applyUpdate();
      success.value = "ASG 已更新，整栈已重启。";
      await checkUpdate();
    } catch (cause) {
      setError(cause);
    }
  }

  onMounted(() => {
    void Promise.all([runDoctor(), loadBrowser()]);
  });

  return {
    jobs,
    checks,
    doctorLoaded,
    browser,
    update,
    adLevel,
    error,
    success,
    updateConfirm,
    unhealthy,
    runDoctor,
    installBrowser,
    updateAdlist,
    checkUpdate,
    applyUpdate,
  };
}
