<script setup lang="ts">
import {
  ArrowDownToLine,
  CircleX,
  Download,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
} from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import ConfirmDialog from "@/shared/ui/ConfirmDialog.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import SelectField from "@/shared/ui/SelectField.vue";
import DiagnosticReport from "./components/DiagnosticReport.vue";
import MaintenanceActionCard from "./components/MaintenanceActionCard.vue";
import { useMaintenance } from "./composables/useMaintenance";

const maintenance = useMaintenance();
const adLevelOptions = [
  { value: "off", label: "off" },
  { value: "ads", label: "ads" },
  { value: "ads+tracking", label: "ads+tracking" },
  { value: "full", label: "full" },
] as const;
</script>

<template>
  <div class="page maintenance-page">
    <PageHeader
      eyebrow="环境与依赖"
      title="维护"
      description="诊断、浏览器运行时、广告过滤和 ASG 自身更新。"
    >
      <template #actions>
        <BaseButton
          :disabled="maintenance.jobs.hasRunningOperation"
          @click="maintenance.runDoctor"
        >
          <template #icon><RefreshCw :size="16" /></template>
          重新诊断
        </BaseButton>
      </template>
    </PageHeader>

    <InlineNotice
      v-if="maintenance.error.value"
      tone="error"
      :message="maintenance.error.value"
      dismissible
      @dismiss="maintenance.error.value = null"
    />
    <InlineNotice
      v-if="maintenance.success.value"
      tone="success"
      :message="maintenance.success.value"
      dismissible
      @dismiss="maintenance.success.value = null"
    />

    <div class="maintenance-workspace glass-surface">
      <section class="maintenance-grid">
        <MaintenanceActionCard eyebrow="Doctor" title="环境诊断">
        <template #icon><Stethoscope :size="21" /></template>
        <p v-if="!maintenance.doctorLoaded.value">
          正在读取安装、Node、配置、端口与 supervisor 状态。
        </p>
        <template v-else>
          <strong>
            {{
              maintenance.unhealthy.value.length === 0
                ? "全部通过"
                : `${maintenance.unhealthy.value.length} 项需要注意`
            }}
          </strong>
          <ul v-if="maintenance.unhealthy.value.length" class="compact-list">
            <li
              v-for="check in maintenance.unhealthy.value.slice(0, 4)"
              :key="check.name"
            >
              <CircleX :size="15" />
              {{ check.name }}：{{ check.message ?? check.code }}
            </li>
          </ul>
        </template>
        </MaintenanceActionCard>

        <MaintenanceActionCard eyebrow="Playwright" title="浏览器运行时">
        <template #icon><Download :size="21" /></template>
        <p v-if="maintenance.browser.value">
          headless shell：
          {{ maintenance.browser.value.headless_shell ? "已安装" : "缺失" }} ·
          Chromium：{{ maintenance.browser.value.chromium ? "已安装" : "缺失" }}
        </p>
        <p v-if="maintenance.browser.value?.path" class="path-copy">
          {{ maintenance.browser.value.path }}
        </p>
        <template #actions>
          <BaseButton
            size="compact"
            variant="secondary"
            :disabled="maintenance.jobs.hasRunningOperation"
            @click="maintenance.installBrowser(false)"
          >
            <template #icon><ArrowDownToLine :size="15" /></template>
            安装 headless
          </BaseButton>
          <BaseButton
            size="compact"
            :disabled="maintenance.jobs.hasRunningOperation"
            @click="maintenance.installBrowser(true)"
          >
            完整 Chromium
          </BaseButton>
        </template>
        </MaintenanceActionCard>

        <MaintenanceActionCard eyebrow="Ad filter" title="广告过滤列表">
        <template #icon><ShieldAlert :size="21" /></template>
        <p>下载后写入本地 hosts，并通过 CLI 重启整栈以刷新内存过滤集。</p>
        <template #actions>
          <div class="inline-field">
            <SelectField
              v-model="maintenance.adLevel.value"
              :options="adLevelOptions"
              accessible-label="广告过滤级别"
            />
            <BaseButton
              size="compact"
              variant="secondary"
              :disabled="maintenance.jobs.hasRunningOperation"
              @click="maintenance.updateAdlist"
            >
              更新列表
            </BaseButton>
          </div>
        </template>
        </MaintenanceActionCard>

        <MaintenanceActionCard eyebrow="Self update" title="ASG 更新">
        <template #icon><RefreshCw :size="21" /></template>
        <p v-if="maintenance.update.value">
          当前 {{ maintenance.update.value.current_version ?? "未知" }} · 可用
          {{ maintenance.update.value.version ?? "未知" }}
          <span v-if="maintenance.update.value.up_to_date">（已是最新）</span>
        </p>
        <p v-else>检查发布通道并准备好自更新。</p>
        <template #actions>
          <BaseButton
            size="compact"
            variant="secondary"
            :disabled="maintenance.jobs.hasRunningOperation"
            @click="maintenance.checkUpdate"
          >
            检查更新
          </BaseButton>
          <BaseButton
            size="compact"
            :disabled="maintenance.jobs.hasRunningOperation"
            @click="maintenance.updateConfirm.value = true"
          >
            应用更新
          </BaseButton>
        </template>
        </MaintenanceActionCard>
      </section>

      <DiagnosticReport :checks="maintenance.checks.value" />
    </div>

    <ConfirmDialog
      :open="maintenance.updateConfirm.value"
      title="下载并应用 ASG 更新？"
      description="CLI 会下载、校验并切换版本，然后重启整栈。失败时由 CLI 按现有流程处理回滚。"
      confirm-label="开始更新"
      @update:open="maintenance.updateConfirm.value = $event"
      @confirm="maintenance.applyUpdate"
    />
  </div>
</template>

<style src="./styles/maintenance.css"></style>
