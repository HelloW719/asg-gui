<script setup lang="ts">
import { RefreshCcw } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import ConfirmDialog from "@/shared/ui/ConfirmDialog.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import DiagnosticsPanel from "./components/DiagnosticsPanel.vue";
import RecentLogsPanel from "./components/RecentLogsPanel.vue";
import ServiceProbes from "./components/ServiceProbes.vue";
import StatusOverview from "./components/StatusOverview.vue";
import { useDashboard } from "./composables/useDashboard";

const dashboard = useDashboard();
</script>

<template>
  <div class="page dashboard-page">
    <PageHeader eyebrow="实时控制面" title="系统状态">
      <template #description>
        <span class="path-copy status-hero__path">{{ dashboard.session.root }}</span>
      </template>
      <template #actions>
        <BaseButton
          :loading="dashboard.appStatus.statusPending.value"
          @click="dashboard.appStatus.refresh"
        >
          <template #icon><RefreshCcw :size="16" /></template>
          刷新状态
        </BaseButton>
      </template>
    </PageHeader>

    <InlineNotice
      v-if="dashboard.actionError.value || dashboard.jobs.lastError"
      tone="error"
      :message="dashboard.actionError.value ?? dashboard.jobs.lastError ?? ''"
      dismissible
      @dismiss="dashboard.dismissError"
    />

    <StatusOverview
      :visual-state="dashboard.appStatus.visualState.value"
      :status="dashboard.appStatus.status.value"
      :online-count="dashboard.appStatus.serviceOnlineCount.value"
      :pending="dashboard.appStatus.statusPending.value"
      :busy="dashboard.jobs.hasRunningOperation"
      @start="dashboard.runLifecycle('start')"
      @restart="dashboard.requestLifecycle('restart')"
      @stop="dashboard.requestLifecycle('stop')"
    />

    <ServiceProbes :services="dashboard.serviceCards.value" />

    <div class="dashboard-columns">
      <RecentLogsPanel :logs="dashboard.recentLogs.value" />
      <DiagnosticsPanel
        :checks="dashboard.doctorChecks.value"
        :loaded="dashboard.diagnosticsLoaded.value"
        :busy="dashboard.jobs.hasRunningOperation"
        @run="dashboard.runDoctor"
      />
    </div>

    <ConfirmDialog
      :open="dashboard.pendingAction.value === 'restart'"
      title="重启整栈？"
      description="gateway、SearXNG 与 FlareSolverr 会依次停止并重新启动，所有 MCP 连接都会短暂断开。"
      confirm-label="确认重启"
      @update:open="(open) => !open && (dashboard.pendingAction.value = null)"
      @confirm="dashboard.confirmPending"
    />
    <ConfirmDialog
      :open="dashboard.pendingAction.value === 'stop'"
      title="停止整栈？"
      description="当前所有搜索与抓取请求将中断，MCP 连接会关闭。GUI 本身会继续运行。"
      confirm-label="停止服务"
      destructive
      @update:open="(open) => !open && (dashboard.pendingAction.value = null)"
      @confirm="dashboard.confirmPending"
    />
  </div>
</template>

<style src="./styles/dashboard.css"></style>
