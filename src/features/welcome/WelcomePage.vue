<script setup lang="ts">
import {
  Blocks,
  CheckCircle2,
  Download,
  KeyRound,
  LoaderCircle,
  PackageCheck,
  Puzzle,
  ShieldCheck,
} from "@lucide/vue";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui";
import { useRouter } from "vue-router";
import BaseButton from "@/shared/ui/BaseButton.vue";
import DisclosurePanel from "@/shared/ui/DisclosurePanel.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import SelectField from "@/shared/ui/SelectField.vue";
import {
  OFFICIAL_EXTENSIONS,
  WELCOME_STEPS,
  useWelcomeWizard,
  type WelcomeStep,
} from "./useWelcomeWizard";

const router = useRouter();
const wizard = useWelcomeWizard();

async function finish(): Promise<void> {
  if (await wizard.finish()) {
    await router.replace("/status");
  }
}

function setStep(step: string): void {
  wizard.setStep(step);
}

function isOfficialInstalled(id: string): boolean {
  return wizard.installedExtensionIds.value.has(id);
}

function isStep(step: WelcomeStep): boolean {
  return wizard.currentStep.value === step;
}
</script>

<template>
  <div class="page welcome-page">
    <PageHeader
      eyebrow="SETUP"
      title="欢迎使用"
      description="确认本地网关连接，并按需配置密钥与 V2 扩展。所有操作都通过 ASG CLI 完成。"
    />

    <div class="welcome-workspace glass-surface">
      <TabsRoot
        :model-value="wizard.currentStep.value"
        class="welcome-tabs"
        @update:model-value="setStep"
      >
        <TabsList class="tab-list welcome-step-list" aria-label="欢迎向导步骤">
          <TabsTrigger
            v-for="step in WELCOME_STEPS"
            :key="step.value"
            :value="step.value"
            class="tab-trigger welcome-step-trigger"
            :disabled="!wizard.stepEnabled(step.value)"
          >
            <span class="welcome-step-index">{{ step.index }}</span>
            <span>{{ step.label }}</span>
            <CheckCircle2
              v-if="wizard.stepComplete(step.value)"
              :size="14"
            />
          </TabsTrigger>
        </TabsList>

        <div class="welcome-surface surface-sunken">
          <TabsContent value="root" class="tab-content">
            <SectionHeading
              eyebrow="01 · CONNECT"
              title="确认 ASG 安装"
              description="GUI 只使用安装根中的稳定入口，不直接读取配置或管理进程。"
            >
              <CheckCircle2 :size="22" />
            </SectionHeading>

            <div class="welcome-root-status">
              <span class="welcome-feature-icon" aria-hidden="true">
                <CheckCircle2 :size="22" />
              </span>
              <div>
                <strong>安装已连接</strong>
                <code class="path-copy">{{ wizard.session.root }}</code>
                <p>启动时已自动验证安装目录，可以继续配置可选项。</p>
              </div>
            </div>

            <div class="welcome-trust-row">
              <ShieldCheck :size="16" />
              <span>密钥通过 stdin 写入，不进入命令行参数或 GUI 持久状态。</span>
            </div>
          </TabsContent>

          <TabsContent value="secrets" class="tab-content">
            <SectionHeading
              eyebrow="02 · SECRETS"
              title="配置可选密钥"
              description="只显示当前搜索源实际声明且尚未配置的密钥。此步骤可以跳过。"
            >
              <KeyRound :size="22" />
            </SectionHeading>

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
              <InlineNotice
                v-if="wizard.secretCandidates.value.length === 0 && !wizard.secretError.value"
                tone="success"
                message="当前要求配置的密钥均已就绪，可以继续。"
              />

              <div v-else-if="wizard.selectedSecret.value" class="welcome-secret-form">
                <div class="welcome-secret-summary">
                  <div>
                    <strong>{{ wizard.selectedSecret.value.label }}</strong>
                    <p>{{ wizard.selectedSecret.value.description }}</p>
                  </div>
                  <span class="token token--warn">待配置</span>
                </div>
                <div
                  v-if="wizard.secretCandidates.value.length > 1"
                  class="welcome-secret-select"
                >
                  <SelectField
                    v-model="wizard.secretPath.value"
                    :options="wizard.secretOptions.value"
                    accessible-label="选择要配置的密钥"
                    :disabled="wizard.savingSecret.value"
                  />
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
          </TabsContent>

          <TabsContent value="extensions" class="tab-content">
            <SectionHeading
              eyebrow="03 · EXTENSIONS"
              title="下载 V2 扩展"
              description="安装官方站点扩展，或从可信的 ASG V2 仓库安装。此步骤可以跳过。"
            >
              <Blocks :size="22" />
            </SectionHeading>

            <InlineNotice
              v-if="wizard.extensionError.value"
              tone="error"
              :message="wizard.extensionError.value"
            />
            <InlineNotice
              v-if="wizard.extensionSuccess.value"
              tone="success"
              :message="wizard.extensionSuccess.value"
              dismissible
              @dismiss="wizard.extensionSuccess.value = null"
            />

            <p v-if="wizard.loadingExtensions.value" class="welcome-loading">
              <LoaderCircle class="spin" :size="17" />
              正在读取已安装扩展…
            </p>

            <div v-else class="welcome-extension-list">
              <article
                v-for="extension in OFFICIAL_EXTENSIONS"
                :key="extension.id"
                class="welcome-extension-row"
              >
                <span class="welcome-feature-icon" aria-hidden="true">
                  <Puzzle :size="19" />
                </span>
                <div class="welcome-extension-copy">
                  <strong>{{ extension.name }}</strong>
                  <p>{{ extension.description }}</p>
                  <span>{{ extension.capabilities }}</span>
                </div>
                <BaseButton
                  size="compact"
                  :variant="
                    isOfficialInstalled(extension.id) ? 'ghost' : 'secondary'
                  "
                  :loading="wizard.installingRepo.value === extension.repo"
                  :disabled="
                    isOfficialInstalled(extension.id) ||
                    Boolean(wizard.installingRepo.value) ||
                    wizard.jobs.hasRunningOperation
                  "
                  @click="wizard.installExtension(extension.repo)"
                >
                  <template v-if="!isOfficialInstalled(extension.id)" #icon>
                    <Download :size="15" />
                  </template>
                  {{
                    isOfficialInstalled(extension.id)
                      ? "已安装"
                      : "安装"
                  }}
                </BaseButton>
              </article>
            </div>

            <DisclosurePanel label="从其他可信仓库安装">
              <div class="welcome-custom-repo">
                <label class="field">
                  <span>GitHub 仓库</span>
                  <input
                    v-model="wizard.customRepo.value"
                    placeholder="owner/repo[@version]"
                    autocomplete="off"
                    :disabled="Boolean(wizard.installingRepo.value)"
                    @keydown.enter.prevent="
                      wizard.installExtension(wizard.customRepo.value)
                    "
                  />
                </label>
                <BaseButton
                  variant="secondary"
                  :loading="Boolean(wizard.installingRepo.value)"
                  :disabled="
                    !wizard.customRepo.value.trim() ||
                    Boolean(wizard.installingRepo.value) ||
                    wizard.jobs.hasRunningOperation
                  "
                  @click="wizard.installExtension(wizard.customRepo.value)"
                >
                  <template #icon><PackageCheck :size="15" /></template>
                  安装扩展
                </BaseButton>
              </div>
            </DisclosurePanel>
          </TabsContent>
        </div>
      </TabsRoot>

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
          :disabled="wizard.jobs.hasRunningOperation || wizard.finishing.value"
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
          跳过此步
        </BaseButton>
        <BaseButton
          v-if="isStep('extensions') && !wizard.installedThisSession.value"
          :disabled="wizard.jobs.hasRunningOperation || wizard.finishing.value"
          @click="finish"
        >
          跳过并完成
        </BaseButton>
        <BaseButton
          v-if="isStep('root')"
          variant="primary"
          :disabled="!wizard.session.rootValid"
          @click="wizard.continueToSecrets"
        >
          继续
        </BaseButton>
        <BaseButton
          v-else-if="isStep('secrets')"
          variant="primary"
          :disabled="wizard.savingSecret.value || wizard.finishing.value"
          @click="wizard.continueToExtensions"
        >
          继续
        </BaseButton>
        <BaseButton
          v-else
          variant="primary"
          :loading="wizard.finishing.value"
          :disabled="wizard.jobs.hasRunningOperation || wizard.finishing.value"
          @click="finish"
        >
          {{ wizard.hasNewExtensions.value ? "完成并重启" : "完成设置" }}
        </BaseButton>
      </footer>
    </div>
  </div>
</template>

<style src="./styles/welcome.css"></style>
