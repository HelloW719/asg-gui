<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Activity,
  CircleStop,
  FileClock,
  Play,
  RefreshCcw,
  RotateCcw,
  Stethoscope,
} from "@lucide/vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import InlineNotice from "../components/InlineNotice.vue";
import ServiceCard from "../components/ServiceCard.vue";
import { useAppStatus } from "../app/useAppStatus";
import { useAsgServices } from "../app/useAsgServices";
import { useJobsStore } from "../stores/jobs";
import { useSessionStore } from "../stores/session";
import type { DoctorCheck, LogLine } from "../types/cli";
import { describeMode } from "../utils/cli";
import { visualStateDescription, visualStateLabels } from "../utils/state";

const session = useSessionStore();
const appStatus = useAppStatus();
const jobs = useJobsStore();
const serviceClient = useAsgServices();
const pendingAction = ref<"stop" | "restart" | null>(null);
const recentLogs = ref<LogLine[]>([]);
const doctorChecks = ref<DoctorCheck[]>([]);
const diagnosticsLoaded = ref(false);
const actionError = ref<string | null>(null);

const serviceCards = computed(() => {
  const data = appStatus.status.value?.services;
  return [
    { name: "gateway", displayName: "Gateway", probe: data?.gateway },
    { name: "searxng", displayName: "SearXNG", probe: data?.searxng },
    { name: "flaresolverr", displayName: "FlareSolverr", probe: data?.flaresolverr },
  ].filter((item): item is typeof item & { probe: NonNullable<typeof item.probe> } => Boolean(item.probe));
});

const failingChecks = computed(() => doctorChecks.value.filter((check) => !check.ok));

onMounted(async () => {
  await Promise.all([loadRecentLogs(), appStatus.refresh()]);
});

async function loadRecentLogs(): Promise<void> {
  try {
    recentLogs.value = (await serviceClient.logs.read(8)).slice(-8);
  } catch {
    // Dashboard remains usable when logs are absent.
  }
}

async function runLifecycle(action: "start" | "stop" | "restart"): Promise<void> {
  actionError.value = null;
  try {
    await serviceClient.lifecycle.run(action);
    await appStatus.refresh();
    await loadRecentLogs();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : String(error);
  }
}

async function runDoctor(): Promise<void> {
  actionError.value = null;
  try {
    doctorChecks.value = await serviceClient.maintenance.doctor();
    diagnosticsLoaded.value = true;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : String(error);
  }
}

function confirmPending(): void {
  if (!pendingAction.value) return;
  const action = pendingAction.value;
  pendingAction.value = null;
  void runLifecycle(action);
}
</script>

<template>
  <div class="page dashboard-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">实时控制面</span>
        <h1>系统状态</h1>
        <p class="path-copy status-hero__path">{{ session.root }}</p>
      </div>
      <button class="button button--ghost" type="button" :disabled="appStatus.statusPending.value" @click="appStatus.refresh">
        <RefreshCcw :size="16" :class="{ spin: appStatus.statusPending.value }" />
        刷新状态
      </button>
    </header>

    <InlineNotice v-if="actionError || jobs.lastError" tone="error" :message="actionError ?? jobs.lastError ?? ''" dismissible @dismiss="jobs.clearError" />

    <section class="status-hero glass-surface">
      <div class="status-hero__copy">
        <span class="status-pill" :class="`status-pill--${appStatus.visualState.value}`">
          <Activity :size="15" />
          {{ visualStateLabels[appStatus.visualState.value] }}
        </span>
        <h2>{{ visualStateLabels[appStatus.visualState.value] }}</h2>
        <p>{{ visualStateDescription(appStatus.visualState.value) }}</p>
        <div class="action-row">
          <button class="button button--primary" type="button" :disabled="jobs.hasRunningOperation" @click="runLifecycle('start')">
            <Play :size="16" />
            启动
          </button>
          <button class="button button--secondary" type="button" :disabled="jobs.hasRunningOperation" @click="pendingAction = 'restart'">
            <RotateCcw :size="16" />
            重启
          </button>
          <button class="button button--ghost button--danger-text" type="button" :disabled="jobs.hasRunningOperation" @click="pendingAction = 'stop'">
            <CircleStop :size="16" />
            停止
          </button>
        </div>
      </div>
      <dl class="status-summary">
        <div>
          <dt>在线服务</dt>
          <dd><strong>{{ appStatus.serviceOnlineCount.value }}</strong><span>/ 3</span></dd>
        </div>
        <div>
          <dt>Supervisor</dt>
          <dd>{{ appStatus.status.value ? describeMode(appStatus.status.value.supervisor.mode) : "—" }}</dd>
        </div>
        <div>
          <dt>状态探测</dt>
          <dd>{{ appStatus.statusPending.value ? "进行中" : "已就绪" }}</dd>
        </div>
      </dl>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div>
          <span class="eyebrow">服务探针</span>
          <h2>整栈组件</h2>
        </div>
        <span class="muted-copy">生命周期始终作用于整栈</span>
      </div>
      <div class="service-grid">
        <ServiceCard
          v-for="service in serviceCards"
          :key="service.name"
          :name="service.name"
          :display-name="service.displayName"
          :probe="service.probe"
        />
      </div>
    </section>

    <div class="dashboard-columns">
      <section class="content-card glass-surface">
        <div class="section-heading">
          <div>
            <span class="eyebrow">最近活动</span>
            <h2>日志片段</h2>
          </div>
          <RouterLink class="text-link" to="/logs">
            <FileClock :size="15" />
            打开日志
          </RouterLink>
        </div>
        <div v-if="recentLogs.length" class="log-preview">
          <div v-for="(entry, index) in recentLogs" :key="`${entry.at}-${index}`" class="log-preview__line">
            <span>{{ entry.service }}</span>
            <code>{{ entry.line }}</code>
          </div>
        </div>
        <p v-else class="empty-copy">暂无可用日志。服务启动后，这里会显示最近的输出。</p>
      </section>

      <section class="content-card glass-surface">
        <div class="section-heading">
          <div>
            <span class="eyebrow">环境健康</span>
            <h2>诊断摘要</h2>
          </div>
          <button class="button button--ghost button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="runDoctor">
            <Stethoscope :size="15" />
            运行诊断
          </button>
        </div>
        <template v-if="diagnosticsLoaded">
          <p v-if="failingChecks.length === 0" class="diagnostic-ok">所有诊断项均已通过。</p>
          <div v-else class="diagnostic-list">
            <div v-for="check in failingChecks.slice(0, 4)" :key="check.name" class="diagnostic-item">
              <span :class="check.level">{{ check.level === "error" ? "错误" : "警告" }}</span>
              <div>
                <strong>{{ check.name }}</strong>
                <p>{{ check.message ?? check.code }}</p>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="empty-copy">运行诊断可检查安装、Node、配置、端口、supervisor 与浏览器状态。</p>
      </section>
    </div>

    <ConfirmDialog
      :open="pendingAction === 'restart'"
      title="重启整栈？"
      description="gateway、SearXNG 与 FlareSolverr 会依次停止并重新启动，所有 MCP 连接都会短暂断开。"
      confirm-label="确认重启"
      @update:open="(open) => !open && (pendingAction = null)"
      @confirm="confirmPending"
    />
    <ConfirmDialog
      :open="pendingAction === 'stop'"
      title="停止整栈？"
      description="当前所有搜索与抓取请求将中断，MCP 连接会关闭。GUI 本身会继续运行。"
      confirm-label="停止服务"
      destructive
      @update:open="(open) => !open && (pendingAction = null)"
      @confirm="confirmPending"
    />
  </div>
</template>

