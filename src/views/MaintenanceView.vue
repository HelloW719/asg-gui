<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  ArrowDownToLine,
  CircleCheck,
  CircleX,
  Download,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
} from "@lucide/vue";
import { useAsgServices } from "../app/useAsgServices";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import InlineNotice from "../components/InlineNotice.vue";
import { useJobsStore } from "../stores/jobs";
import type { BrowserStatus, DoctorCheck, UpdateStatus } from "../types/cli";

const jobs = useJobsStore();
const serviceClient = useAsgServices();
const checks = ref<DoctorCheck[]>([]);
const doctorLoaded = ref(false);
const browser = ref<BrowserStatus | null>(null);
const update = ref<UpdateStatus | null>(null);
const adLevel = ref("ads");
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const updateConfirm = ref(false);

const unhealthy = computed(() => checks.value.filter((check) => !check.ok));

onMounted(() => {
  void Promise.all([runDoctor(), loadBrowser()]);
});

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
    // Diagnostic cards remain usable if this optional read fails.
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
</script>

<template>
  <div class="page maintenance-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">环境与依赖</span>
        <h1>维护</h1>
        <p>诊断、浏览器运行时、广告过滤和 ASG 自身更新。</p>
      </div>
      <button class="button button--ghost" type="button" :disabled="jobs.hasRunningOperation" @click="runDoctor">
        <RefreshCw :size="16" />
        重新诊断
      </button>
    </header>

    <InlineNotice v-if="error" tone="error" :message="error" dismissible @dismiss="error = null" />
    <InlineNotice v-if="success" tone="success" :message="success" dismissible @dismiss="success = null" />

    <section class="maintenance-grid">
      <article class="maintenance-card glass-surface">
        <div class="maintenance-card__icon"><Stethoscope :size="21" /></div>
        <span class="eyebrow">Doctor</span>
        <h2>环境诊断</h2>
        <p v-if="!doctorLoaded">正在读取安装、Node、配置、端口与 supervisor 状态。</p>
        <template v-else>
          <strong>{{ unhealthy.length === 0 ? "全部通过" : `${unhealthy.length} 项需要注意` }}</strong>
          <ul v-if="unhealthy.length" class="compact-list">
            <li v-for="check in unhealthy.slice(0, 4)" :key="check.name">
              <CircleX :size="15" />
              {{ check.name }}：{{ check.message ?? check.code }}
            </li>
          </ul>
        </template>
      </article>

      <article class="maintenance-card glass-surface">
        <div class="maintenance-card__icon"><Download :size="21" /></div>
        <span class="eyebrow">Playwright</span>
        <h2>浏览器运行时</h2>
        <p v-if="browser">
          headless shell：{{ browser.headless_shell ? "已安装" : "缺失" }} ·
          Chromium：{{ browser.chromium ? "已安装" : "缺失" }}
        </p>
        <p v-if="browser?.path" class="path-copy">{{ browser.path }}</p>
        <div class="action-row">
          <button class="button button--secondary button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="installBrowser(false)">
            <ArrowDownToLine :size="15" />
            安装 headless
          </button>
          <button class="button button--ghost button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="installBrowser(true)">
            完整 Chromium
          </button>
        </div>
      </article>

      <article class="maintenance-card glass-surface">
        <div class="maintenance-card__icon"><ShieldAlert :size="21" /></div>
        <span class="eyebrow">Ad filter</span>
        <h2>广告过滤列表</h2>
        <p>下载后写入本地 hosts，并通过 CLI 重启整栈以刷新内存过滤集。</p>
        <div class="inline-field">
          <select v-model="adLevel">
            <option value="off">off</option>
            <option value="ads">ads</option>
            <option value="ads+tracking">ads+tracking</option>
            <option value="full">full</option>
          </select>
          <button class="button button--secondary button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="updateAdlist">
            更新列表
          </button>
        </div>
      </article>

      <article class="maintenance-card glass-surface">
        <div class="maintenance-card__icon"><RefreshCw :size="21" /></div>
        <span class="eyebrow">Self update</span>
        <h2>ASG 更新</h2>
        <p v-if="update">
          当前 {{ update.current_version ?? "未知" }} · 可用 {{ update.version ?? "未知" }}
          <span v-if="update.up_to_date">（已是最新）</span>
        </p>
        <p v-else>检查发布通道并准备好自更新。</p>
        <div class="action-row">
          <button class="button button--secondary button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="checkUpdate">
            检查更新
          </button>
          <button class="button button--ghost button--compact" type="button" :disabled="jobs.hasRunningOperation" @click="updateConfirm = true">
            应用更新
          </button>
        </div>
      </article>
    </section>

    <section class="diagnostic-table glass-surface">
      <div class="section-heading">
        <div>
          <span class="eyebrow">完整报告</span>
          <h2>检查项</h2>
        </div>
        <span class="muted-copy">{{ checks.filter((check) => check.ok).length }} / {{ checks.length }} 通过</span>
      </div>
      <div v-if="checks.length" class="check-list">
        <div v-for="check in checks" :key="check.name" class="check-row">
          <CircleCheck v-if="check.ok" :size="17" class="ok" />
          <CircleX v-else :size="17" :class="check.level" />
          <strong>{{ check.name }}</strong>
          <span>{{ check.message ?? check.code }}</span>
          <em>{{ check.level }}</em>
        </div>
      </div>
      <p v-else class="empty-copy">诊断结果将在这里显示。</p>
    </section>

    <ConfirmDialog
      :open="updateConfirm"
      title="下载并应用 ASG 更新？"
      description="CLI 会下载、校验并切换版本，然后重启整栈。失败时由 CLI 按现有流程处理回滚。"
      confirm-label="开始更新"
      @update:open="updateConfirm = $event"
      @confirm="applyUpdate"
    />
  </div>
</template>

