<script setup lang="ts">
import {
  Blocks,
  CheckCircle2,
  Download,
  Gauge,
  Image,
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
import { SEARCH_STRENGTH_OPTIONS } from "./searchStrength";

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
      description="确认本地网关连接，并按需配置密钥、搜索强度与 V2 扩展。所有操作都通过 ASG CLI 完成。"
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
              eyebrow="03 · SECRETS"
              title="配置可选密钥"
              description="只显示当前能力、扩展或搜索源实际需要且尚未配置的密钥。此步骤可以跳过。"
            >
              <KeyRound :size="22" />
            </SectionHeading>

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

          <TabsContent value="strength" class="tab-content">
            <SectionHeading
              eyebrow="02 · SEARCH"
              title="选择搜索强度"
              description="强度逐级叠加搜索能力；返图源独立选择，在所有强度下都可使用。"
            >
              <Gauge :size="22" />
            </SectionHeading>

            <p
              v-if="wizard.loadingSearchProfile.value"
              class="welcome-loading"
            >
              <LoaderCircle class="spin" :size="17" />
              正在读取当前引擎配置…
            </p>

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
                :disabled="wizard.savingSearchProfile.value"
                @click="wizard.loadSearchProfile"
              >
                重新读取
              </BaseButton>
            </div>

            <fieldset
              class="welcome-strength-options"
              :disabled="
                !wizard.searchProfileLoaded.value ||
                wizard.loadingSearchProfile.value ||
                wizard.savingSearchProfile.value
              "
            >
              <legend class="welcome-strength-legend">选择搜索强度</legend>
              <label
                v-for="option in SEARCH_STRENGTH_OPTIONS"
                :key="option.value"
                class="welcome-strength-option"
                :class="{
                  'welcome-strength-option--active':
                    wizard.searchStrength.value === option.value,
                }"
              >
                <input
                  v-model="wizard.searchStrength.value"
                  type="radio"
                  name="welcome-search-strength"
                  :value="option.value"
                  @change="wizard.searchProfileError.value = null"
                />
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </label>
            </fieldset>

            <p
              v-if="
                wizard.searchStrength.value !== 'low' &&
                !wizard.deepseekReady.value
              "
              class="field-note welcome-profile-note"
            >
              中档和高档需要 DeepSeek，可在下一步配置 API Key。完成密钥配置后才会应用引擎设置。
            </p>

            <section
              class="welcome-reverse-sources"
              aria-labelledby="reverse-image-sources-title"
            >
              <div class="welcome-reverse-sources__heading">
                <span class="welcome-feature-icon" aria-hidden="true">
                  <Image :size="21" />
                </span>
                <div>
                  <strong id="reverse-image-sources-title">可选返图源</strong>
                  <p>选择可使用的以图搜图来源；该项不受搜索强度限制。</p>
                </div>
                <span class="token">全部强度可用</span>
              </div>

              <p
                v-if="wizard.reverseImageEngines.value.length === 0"
                class="welcome-empty-copy"
              >
                当前没有可配置的返图源。
              </p>
              <div v-else class="welcome-reverse-source-list">
                <label
                  v-for="engine in wizard.reverseImageEngines.value"
                  :key="engine.id"
                  class="welcome-reverse-source"
                >
                  <input
                    type="checkbox"
                    :checked="
                      wizard.selectedReverseImageIds.value.includes(engine.id)
                    "
                    :disabled="
                      !wizard.searchProfileLoaded.value ||
                      wizard.loadingSearchProfile.value ||
                      wizard.savingSearchProfile.value
                    "
                    @change="
                      wizard.toggleReverseImage(
                        engine.id,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  <span>
                    <strong>{{ engine.name }}</strong>
                    <small>
                      {{
                        engine.available
                          ? "可直接启用"
                          : engine.enabled
                            ? "缺少密钥，建议关闭"
                            : "可在下一步配置密钥"
                      }}
                    </small>
                  </span>
                  <span
                    :class="
                      engine.available
                        ? 'token token--ok'
                        : 'token token--warn'
                    "
                  >
                    {{ engine.available ? "可用" : "需密钥" }}
                  </span>
                </label>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="extensions" class="tab-content">
            <SectionHeading
              eyebrow="04 · EXTENSIONS"
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
          @click="wizard.continueToSearchProfile"
        >
          继续
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
          继续配置密钥
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
          应用并继续
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
