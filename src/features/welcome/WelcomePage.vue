<script setup lang="ts">
import { computed } from "vue";
import { TabsContent, TabsRoot } from "reka-ui";
import { useRouter } from "vue-router";
import BaseButton from "@/shared/ui/BaseButton.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import WelcomeConnectionStep from "./components/WelcomeConnectionStep.vue";
import WelcomeExtensionsStep from "./components/WelcomeExtensionsStep.vue";
import WelcomeProgressRail from "./components/WelcomeProgressRail.vue";
import WelcomeSecretsStep from "./components/WelcomeSecretsStep.vue";
import WelcomeStrengthStep from "./components/WelcomeStrengthStep.vue";
import { SEARCH_STRENGTH_OPTIONS } from "./searchStrength";
import {
  WELCOME_STEPS,
  useWelcomeWizard,
  type WelcomeStep,
} from "./useWelcomeWizard";

const router = useRouter();
const wizard = useWelcomeWizard();

const progressLabel = computed(
  () => `${Math.min(wizard.stepIndex.value + 1, WELCOME_STEPS.length)} / ${WELCOME_STEPS.length}`,
);
const strengthLabel = computed(
  () =>
    SEARCH_STRENGTH_OPTIONS.find(
      (option) => option.value === wizard.searchStrength.value,
    )?.label ?? "低",
);
const strengthSummary = computed(() => {
  if (!wizard.searchProfileLoaded.value) return "待读取";
  return `${strengthLabel.value}强度`;
});
const secretSummary = computed(() => {
  if (wizard.loadingSecrets.value) return "正在扫描";
  if (wizard.secretCandidates.value.length > 0) {
    return `${wizard.secretCandidates.value.length} 项待配置`;
  }
  if (
    wizard.currentStep.value === "root" ||
    wizard.currentStep.value === "strength"
  ) {
    return "后续可选";
  }
  return "无需配置";
});
const extensionSummary = computed(() => {
  if (wizard.loadingExtensions.value) return "正在读取";
  if (wizard.installedThisSession.value) return "新增待重启";
  if (wizard.extensions.value.length > 0) {
    return `${wizard.extensions.value.length} 项已安装`;
  }
  return "可选";
});

async function finish(): Promise<void> {
  if (await wizard.finish()) {
    await router.replace("/status");
  }
}

function setStep(step: string): void {
  wizard.setStep(step);
}

function isStep(step: WelcomeStep): boolean {
  return wizard.currentStep.value === step;
}
</script>

<template>
  <div class="page welcome-page">
    <PageHeader
      eyebrow="FIRST RUN"
      title="欢迎使用"
      label="WELCOME"
      description="四步准备本地搜索网关。已有配置会优先沿用，密钥和站点扩展可以跳过，之后仍可从设置重新打开向导。"
    />

    <div class="welcome-workspace glass-surface">
      <TabsRoot
        :model-value="wizard.currentStep.value"
        class="welcome-tabs"
        @update:model-value="setStep"
      >
        <div class="welcome-layout">
          <WelcomeProgressRail
            :steps="WELCOME_STEPS"
            :current-step="wizard.currentStep.value"
            :progress-label="progressLabel"
            :strength-summary="strengthSummary"
            :secret-summary="secretSummary"
            :extension-summary="extensionSummary"
            :step-enabled="wizard.stepEnabled"
            :step-complete="wizard.stepComplete"
          />

          <div class="welcome-main">
            <div class="welcome-surface surface-sunken">
              <TabsContent value="root" class="tab-content">
                <WelcomeConnectionStep :wizard="wizard" />
              </TabsContent>

              <TabsContent value="strength" class="tab-content">
                <WelcomeStrengthStep :wizard="wizard" />
              </TabsContent>

              <TabsContent value="secrets" class="tab-content">
                <WelcomeSecretsStep :wizard="wizard" />
              </TabsContent>

              <TabsContent value="extensions" class="tab-content">
                <WelcomeExtensionsStep
                  :wizard="wizard"
                  :strength-label="strengthLabel"
                />
              </TabsContent>
            </div>

            <InlineNotice
              v-if="wizard.finishError.value"
              tone="error"
              :message="wizard.finishError.value"
              dismissible
              @dismiss="wizard.finishError.value = null"
            />

            <footer class="welcome-actions">
              <BaseButton
                v-if="wizard.currentStep.value !== 'root'"
                :disabled="
                  wizard.jobs.hasRunningOperation || wizard.finishing.value
                "
                @click="wizard.previous"
              >
                上一步
              </BaseButton>
              <span class="welcome-actions__spacer" />
              <BaseButton
                v-if="isStep('secrets')"
                :disabled="wizard.savingSecret.value || wizard.finishing.value"
                @click="wizard.skipSecrets"
              >
                暂时跳过密钥
              </BaseButton>
              <BaseButton
                v-if="isStep('root')"
                variant="primary"
                :disabled="!wizard.session.rootValid"
                @click="wizard.continueToSearchProfile"
              >
                开始配置
              </BaseButton>
              <BaseButton
                v-else-if="isStep('strength')"
                variant="primary"
                :disabled="
                  wizard.loadingSearchProfile.value ||
                  !wizard.searchProfileLoaded.value ||
                  wizard.savingSearchProfile.value ||
                  Boolean(wizard.searchProfileError.value)
                "
                @click="wizard.continueToSecrets"
              >
                下一步：配置密钥
              </BaseButton>
              <BaseButton
                v-else-if="isStep('secrets')"
                variant="primary"
                :loading="wizard.savingSearchProfile.value"
                :disabled="
                  wizard.savingSecret.value ||
                  wizard.savingSearchProfile.value ||
                  wizard.finishing.value
                "
                @click="wizard.continueToExtensions"
              >
                应用设置并继续
              </BaseButton>
              <BaseButton
                v-else
                variant="primary"
                :loading="wizard.finishing.value"
                :disabled="
                  wizard.jobs.hasRunningOperation || wizard.finishing.value
                "
                @click="finish"
              >
                {{
                  wizard.hasNewExtensions.value
                    ? "完成、重启并进入控制台"
                    : "完成并进入控制台"
                }}
              </BaseButton>
            </footer>
          </div>
        </div>
      </TabsRoot>
    </div>
  </div>
</template>

<style src="./styles/welcome.css"></style>
