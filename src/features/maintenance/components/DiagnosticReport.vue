<script setup lang="ts">
import { CircleCheck, CircleX } from "@lucide/vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { DoctorCheck } from "@/types/cli";

const props = defineProps<{
  checks: DoctorCheck[];
}>();
</script>

<template>
  <section class="diagnostic-table">
    <SectionHeading eyebrow="完整报告" title="检查项">
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
    <p v-else class="empty-copy">诊断结果将在这里显示。</p>
  </section>
</template>
