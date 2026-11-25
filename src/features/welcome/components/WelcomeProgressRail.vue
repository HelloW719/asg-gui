<script setup lang="ts">
import { CheckCircle2, ShieldCheck } from "@lucide/vue";
import { TabsList, TabsTrigger } from "reka-ui";
import type { WelcomeStep } from "../useWelcomeWizard";

interface WelcomeStepDefinition {
  value: WelcomeStep;
  index: string;
  label: string;
  description: string;
  optional: boolean;
}

defineProps<{
  steps: readonly WelcomeStepDefinition[];
  currentStep: WelcomeStep;
  progressLabel: string;
  strengthSummary: string;
  secretSummary: string;
  extensionSummary: string;
  stepEnabled: (step: WelcomeStep) => boolean;
  stepComplete: (step: WelcomeStep) => boolean;
}>();
</script>

<template>
  <aside class="welcome-rail" aria-label="欢迎向导进度">
    <div class="welcome-rail__heading">
      <div>
        <span class="eyebrow">SETUP ROUTE</span>
        <strong>准备搜索网关</strong>
      </div>
      <span class="welcome-progress-count">{{ progressLabel }}</span>
    </div>

    <TabsList class="tab-list welcome-step-list" aria-label="欢迎向导步骤">
      <TabsTrigger
        v-for="step in steps"
        :key="step.value"
        :value="step.value"
        class="tab-trigger welcome-step-trigger"
        :data-complete="stepComplete(step.value) || undefined"
        :disabled="!stepEnabled(step.value)"
      >
        <span class="welcome-step-index">{{ step.index }}</span>
        <span class="welcome-step-copy">
          <strong>
            {{ step.label }}
            <span
              v-if="step.optional"
              class="welcome-step-optional"
            >
              可选
            </span>
          </strong>
          <small>{{ step.description }}</small>
        </span>
        <span class="welcome-step-state">
          <CheckCircle2
            v-if="stepComplete(step.value)"
            :size="16"
            aria-label="已完成"
          />
          <span
            v-else
            class="welcome-step-state__dot"
            :class="{
              'welcome-step-state__dot--active':
                step.value === currentStep,
            }"
            aria-hidden="true"
          />
        </span>
      </TabsTrigger>
    </TabsList>

    <section class="welcome-rail__preview" aria-labelledby="welcome-preview-title">
      <div class="welcome-rail__preview-heading">
        <span id="welcome-preview-title">配置预览</span>
        <span>实时</span>
      </div>
      <dl>
        <div>
          <dt>搜索能力</dt>
          <dd>{{ strengthSummary }}</dd>
        </div>
        <div>
          <dt>密钥</dt>
          <dd>{{ secretSummary }}</dd>
        </div>
        <div>
          <dt>扩展</dt>
          <dd>{{ extensionSummary }}</dd>
        </div>
      </dl>
    </section>

    <p class="welcome-rail__note">
      <ShieldCheck :size="15" aria-hidden="true" />
      <span>密钥和扩展可以稍后配置；完成时只应用你已经确认的改动。</span>
    </p>
  </aside>
</template>
