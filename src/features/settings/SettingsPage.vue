<script setup lang="ts">
import { Database, FileLock2 } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import ConfirmDialog from "@/shared/ui/ConfirmDialog.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import SecretDialog from "@/shared/ui/SecretDialog.vue";
import AppearancePanel from "./components/AppearancePanel.vue";
import ConfigBrowser from "./components/ConfigBrowser.vue";
import ConfigEditor from "./components/ConfigEditor.vue";
import InstallPathPanel from "./components/InstallPathPanel.vue";
import { useSettings } from "./composables/useSettings";

const settings = useSettings();
</script>

<template>
  <div class="page settings-page">
    <PageHeader
      eyebrow="配置与外观"
      title="设置"
      description="每个字段单独通过 config set 校验、写入并整栈重启。"
    >
      <template #actions>
        <BaseButton size="compact" :loading="settings.loading.value" @click="settings.validate">
          <template #icon><FileLock2 :size="15" /></template>
          校验配置
        </BaseButton>
        <BaseButton
          size="compact"
          variant="secondary"
          :loading="settings.loading.value"
          @click="settings.loadConfig"
        >
          <template #icon><Database :size="15" /></template>
          重新读取
        </BaseButton>
      </template>
    </PageHeader>

    <InlineNotice
      v-if="settings.error.value"
      tone="error"
      :message="settings.error.value"
      dismissible
      @dismiss="settings.error.value = null"
    />
    <InlineNotice
      v-if="settings.validated.value === true"
      tone="success"
      message="配置校验通过。"
      dismissible
      @dismiss="settings.validated.value = null"
    />

    <AppearancePanel />

    <InstallPathPanel
      :root="settings.session.root"
      @change="settings.session.chooseRoot"
      @disconnect="settings.forgetOpen.value = true"
    />

    <ConfigBrowser
      :search="settings.search.value"
      :groups="settings.groupedRows.value"
      :row-count="settings.rows.value.length"
      :loading="settings.loading.value"
      :group-labels="settings.groupLabels"
      @update:search="settings.search.value = $event"
      @edit="settings.beginEdit"
    />

    <ConfigEditor
      v-if="settings.editing.value"
      :field="settings.editing.value"
      :value="settings.editValue.value"
      :busy="settings.jobs.hasRunningOperation"
      @update:value="settings.editValue.value = $event"
      @cancel="settings.cancelEdit"
      @save="settings.pendingSave.value = settings.editing.value"
    />

    <ConfirmDialog
      :open="Boolean(settings.pendingSave.value)"
      title="保存此字段？"
      :description="`将通过 CLI 校验并写入 ${settings.pendingSave.value?.path ?? ''}，随后整栈重启。所有 MCP 连接会短暂断开。`"
      confirm-label="保存并重启"
      @update:open="(open) => !open && (settings.pendingSave.value = null)"
      @confirm="settings.saveField"
    />
    <SecretDialog
      :open="Boolean(settings.secretField.value)"
      title="更新密钥"
      :description="settings.secretField.value?.path ?? ''"
      @update:open="(open) => !open && (settings.secretField.value = null)"
      @submit="settings.saveSecret"
    />
    <ConfirmDialog
      :open="settings.forgetOpen.value"
      title="断开当前安装？"
      description="只会清除 GUI 记住的安装路径，不会停止后台服务。"
      confirm-label="断开"
      destructive
      @update:open="settings.forgetOpen.value = $event"
      @confirm="settings.forgetRoot"
    />
  </div>
</template>
