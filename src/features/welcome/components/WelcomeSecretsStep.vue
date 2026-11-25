<script setup lang="ts">
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
} from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import WelcomeStepLead from "./WelcomeStepLead.vue";
import type { WelcomeWizard } from "../useWelcomeWizard";

const props = defineProps<{ wizard: WelcomeWizard }>();
const wizard = props.wizard;

function selectSecret(path: string): void {
  if (wizard.savingSecret.value) return;
  wizard.secretPath.value = path;
  wizard.secretError.value = null;
  wizard.secretSuccess.value = null;
}
</script>

<template>
  <WelcomeStepLead
    eyebrow="03 · SECRETS"
    title="补齐可选密钥"
    description="只列出当前能力、扩展或搜索源实际需要且尚未配置的密钥。暂不处理的密钥不会阻止完成。"
    outcome="应用搜索能力组合；没有待配置项时直接进入扩展步骤。"
    optional
  />

  <div
    v-if="wizard.searchProfileError.value"
    class="welcome-profile-error"
  >
    <InlineNotice
      tone="error"
      :message="wizard.searchProfileError.value"
    />
    <BaseButton
      size="compact"
      variant="secondary"
      :disabled="wizard.jobs.hasRunningOperation"
      @click="wizard.previous"
    >
      返回搜索强度
    </BaseButton>
  </div>

  <p v-if="wizard.loadingSecrets.value" class="welcome-loading">
    <LoaderCircle class="spin" :size="17" />
    正在读取当前密钥依赖…
  </p>

  <InlineNotice
    v-if="wizard.secretError.value"
    tone="error"
    :message="wizard.secretError.value"
  />
  <InlineNotice
    v-if="wizard.secretSuccess.value"
    tone="success"
    :message="wizard.secretSuccess.value"
    dismissible
    @dismiss="wizard.secretSuccess.value = null"
  />

  <template v-if="!wizard.loadingSecrets.value">
    <div
      v-if="wizard.secretCandidates.value.length === 0 && !wizard.secretError.value"
      class="welcome-secret-complete"
    >
      <CheckCircle2 :size="24" aria-hidden="true" />
      <div>
        <strong>没有待配置的密钥</strong>
        <p>当前选择所需的依赖均已就绪，可以继续。</p>
      </div>
    </div>

    <template v-else-if="wizard.secretCandidates.value.length > 0">
      <section
        class="welcome-secret-queue"
        aria-labelledby="welcome-secret-queue-title"
      >
        <div class="welcome-secret-queue__heading">
          <span class="welcome-feature-icon" aria-hidden="true">
            <KeyRound :size="20" />
          </span>
          <div>
            <strong id="welcome-secret-queue-title">
              {{ wizard.secretCandidates.value.length }} 项待处理
            </strong>
            <p>选择一项填写；保存后会重新扫描，并自动跳到下一项。</p>
          </div>
        </div>

        <div class="welcome-secret-queue__list">
          <button
            v-for="candidate in wizard.secretCandidates.value"
            :key="candidate.path"
            type="button"
            class="welcome-secret-queue__item"
            :class="{
              'welcome-secret-queue__item--active':
                wizard.secretPath.value === candidate.path,
            }"
            :aria-pressed="wizard.secretPath.value === candidate.path"
            :disabled="wizard.savingSecret.value"
            @click="selectSecret(candidate.path)"
          >
            <span>
              <strong>{{ candidate.label }}</strong>
              <small>{{ candidate.path }}</small>
            </span>
            <span class="token token--warn">待配置</span>
          </button>
        </div>
      </section>

      <div v-if="wizard.selectedSecret.value" class="welcome-secret-form">
        <div class="welcome-secret-summary">
          <div>
            <strong>{{ wizard.selectedSecret.value.label }}</strong>
            <p>{{ wizard.selectedSecret.value.description }}</p>
          </div>
          <span class="token token--warn">当前项</span>
        </div>

        <label class="field">
          <span>密钥值</span>
          <input
            v-model="wizard.secretValue.value"
            type="password"
            autocomplete="new-password"
            placeholder="输入后仅通过 stdin 发送"
            :disabled="wizard.savingSecret.value"
          />
        </label>
        <code class="path-copy welcome-secret-path">
          {{ wizard.selectedSecret.value.path }}
        </code>
        <div class="welcome-inline-actions">
          <BaseButton
            variant="primary"
            :loading="wizard.savingSecret.value"
            :disabled="
              !wizard.secretValue.value ||
              wizard.jobs.hasRunningOperation
            "
            @click="wizard.saveSecret"
          >
            保存密钥
          </BaseButton>
        </div>
      </div>
    </template>
  </template>
</template>
