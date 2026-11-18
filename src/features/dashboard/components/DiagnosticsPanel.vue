<script setup lang="ts">
import { computed } from "vue";
import { Stethoscope } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { DoctorCheck } from "@/types/cli";

const props = defineProps<{
  checks: DoctorCheck[];
  loaded: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  run: [];
}>();

const failingChecks = computed(() => props.checks.filter((check) => !check.ok));
</script>

<template>
  <section class="content-card glass-surface">
    <SectionHeading eyebrow="环境健康" title="诊断摘要">
      <BaseButton size="compact" :disabled="busy" @click="emit('run')">
        <template #icon><Stethoscope :size="15" /></template>
        运行诊断
      </BaseButton>
    </SectionHeading>
    <template v-if="loaded">
      <p v-if="failingChecks.length === 0" class="diagnostic-ok">
        所有诊断项均已通过。
      </p>
      <div v-else class="diagnostic-list">
        <div
          v-for="check in failingChecks.slice(0, 4)"
          :key="check.name"
          class="diagnostic-item"
        >
          <span :class="check.level">
            {{ check.level === "error" ? "错误" : "警告" }}
          </span>
          <div>
            <strong>{{ check.name }}</strong>
            <p>{{ check.message ?? check.code }}</p>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="empty-copy">
      运行诊断可检查安装、Node、配置、端口、supervisor 与浏览器状态。
    </p>
  </section>
</template>
