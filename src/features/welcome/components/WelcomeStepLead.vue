<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";

defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  outcome: string;
  optional?: boolean;
}>();
</script>

<template>
  <SectionHeading
    :eyebrow="eyebrow"
    :title="title"
    :description="description"
  >
    <span v-if="optional" class="token welcome-step-lead__optional">
      可选
    </span>
  </SectionHeading>

  <div class="welcome-step-outcome">
    <span class="welcome-step-outcome__label">完成本步后</span>
    <ArrowRight :size="15" aria-hidden="true" />
    <span>{{ outcome }}</span>
  </div>
</template>
