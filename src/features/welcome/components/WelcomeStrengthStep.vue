<script setup lang="ts">
import { Check, Image, LoaderCircle } from "@lucide/vue";
import { computed } from "vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import { SEARCH_STRENGTH_OPTIONS } from "../searchStrength";
import WelcomeStepLead from "./WelcomeStepLead.vue";
import type { WelcomeWizard } from "../useWelcomeWizard";

const props = defineProps<{ wizard: WelcomeWizard }>();
const wizard = props.wizard;

const selectedStrengthLabel = computed(
  () =>
    SEARCH_STRENGTH_OPTIONS.find(
      (option) => option.value === wizard.searchStrength.value,
    )?.label ?? "当前",
);

function optionState(value: string): string | null {
  if (value !== "medium" && value !== "high") return null;
  return wizard.deepseekReady.value ? "可用" : "需密钥";
}
</script>

<template>
  <WelcomeStepLead
    eyebrow="02 · SEARCH"
    title="选择搜索能力"
    description="根据已安装的引擎选择工作强度。默认值来自当前配置，返图源独立于强度，可单独启用。"
    outcome="保存搜索能力组合，然后检查是否还有密钥需要补齐。"
  />

  <p v-if="wizard.loadingSearchProfile.value" class="welcome-loading">
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
      <span class="welcome-strength-option__topline">
        <strong>{{ option.label }}</strong>
        <Check
          v-if="wizard.searchStrength.value === option.value"
          :size="16"
          aria-label="当前选择"
        />
        <span
          v-else-if="optionState(option.value)"
          class="token"
        >
          {{ optionState(option.value) }}
        </span>
      </span>
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
    当前选择为{{ selectedStrengthLabel }}强度。DeepSeek 尚未就绪，下一步可以补齐 API Key，也可以返回选择低强度。
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
        <strong id="reverse-image-sources-title">以图搜图来源</strong>
        <p>返图源独立于搜索强度；缺少密钥的来源会在下一步提示。</p>
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
</template>
