<script setup lang="ts">
import {
  Blocks,
  Download,
  LoaderCircle,
  PackageCheck,
  Puzzle,
} from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import DisclosurePanel from "@/shared/ui/DisclosurePanel.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import { OFFICIAL_EXTENSIONS } from "../useWelcomeWizard";
import WelcomeStepLead from "./WelcomeStepLead.vue";
import type { WelcomeWizard } from "../useWelcomeWizard";

const props = defineProps<{
  wizard: WelcomeWizard;
  strengthLabel: string;
}>();
const wizard = props.wizard;

function isOfficialInstalled(id: string): boolean {
  return wizard.installedExtensionIds.value.has(id);
}
</script>

<template>
  <WelcomeStepLead
    eyebrow="04 · EXTENSIONS"
    title="按需添加站点扩展"
    description="安装官方站点扩展，或从可信的 ASG V2 仓库安装。没有需要的扩展时可以直接完成。"
    outcome="确认最终配置并进入系统状态页；本次安装扩展时会重启一次。"
    optional
  />

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
        :variant="isOfficialInstalled(extension.id) ? 'ghost' : 'secondary'"
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

  <section
    class="welcome-finish-check"
    aria-labelledby="welcome-finish-check-title"
  >
    <div class="welcome-finish-check__heading">
      <span class="welcome-feature-icon" aria-hidden="true">
        <Blocks :size="20" />
      </span>
      <div>
        <h3 id="welcome-finish-check-title">完成前检查</h3>
        <p>下面这些内容会在完成向导后继续保留。</p>
      </div>
    </div>
    <dl>
      <div>
        <dt>系统接入</dt>
        <dd>安装根有效，CLI 桥可用</dd>
      </div>
      <div>
        <dt>搜索能力</dt>
        <dd>{{ strengthLabel }}强度</dd>
      </div>
      <div>
        <dt>可选配置</dt>
        <dd>
          {{
            wizard.hasNewExtensions.value
              ? "本次扩展将在完成时重启生效"
              : "已安装扩展保持当前状态"
          }}
        </dd>
      </div>
    </dl>
  </section>
</template>
