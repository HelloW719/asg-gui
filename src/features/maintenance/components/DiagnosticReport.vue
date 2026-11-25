<script setup lang="ts">
import { CircleCheck, CircleX, Stethoscope } from "@lucide/vue";
import EmptyState from "@/shared/ui/EmptyState.vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { DoctorCheck } from "@/types/cli";

const props = defineProps<{
  checks: DoctorCheck[];
}>();
</script>

<template>
  <section class="diagnostic-table">
    <SectionHeading title="检查项">
      <span class="muted-copy">
        {{ checks.filter((check) => check.ok).length }} / {{ checks.length }} 通过
      </span>
    </SectionHeading>
    <div v-if="props.checks.length" class="check-list">
      <div v-for="check in props.checks" :key="check.name" class="check-row">
        <CircleCheck v-if="check.ok" :size="17" class="ok" />
        <CircleX v-else :size="17" :class="check.level" />
        <strong>{{ check.name }}</strong>
        <span>{{ check.message ?? check.code }}</span>
        <em>{{ check.level }}</em>
      </div>
    </div>
    <EmptyState
      v-else
      compact
      title="尚无诊断结果"
      description="运行一次环境诊断后，检查项与结果会显示在这里。"
    >
      <template #icon><Stethoscope :size="18" /></template>
    </EmptyState>
  </section>
</template>
