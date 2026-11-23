<script setup lang="ts">
import { Activity, CircleStop, Play, RotateCcw } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import type { StackStatus, VisualState } from "@/types/cli";
import { describeMode } from "@/utils/cli";
import { visualStateDescription, visualStateLabels } from "@/utils/state";

defineProps<{
  visualState: VisualState;
  status: StackStatus | null;
  onlineCount: number;
  pending: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  start: [];
  restart: [];
  stop: [];
}>();
</script>

<template>
  <section class="status-hero glass-surface">
    <div class="status-hero__copy">
      <div class="status-kicker">
        <span
          class="status-pill"
          :class="`status-pill--${visualState}`"
          aria-hidden="true"
        >
          <Activity :size="16" />
        </span>
        <span>当前运行状态</span>
      </div>
      <h2>{{ visualStateLabels[visualState] }}</h2>
      <p>{{ visualStateDescription(visualState) }}</p>
      <div class="action-row">
        <BaseButton variant="primary" :disabled="busy" @click="emit('start')">
          <template #icon><Play :size="16" /></template>
          启动
        </BaseButton>
        <BaseButton variant="secondary" :disabled="busy" @click="emit('restart')">
          <template #icon><RotateCcw :size="16" /></template>
          重启
        </BaseButton>
        <BaseButton variant="ghost" danger-text :disabled="busy" @click="emit('stop')">
          <template #icon><CircleStop :size="16" /></template>
          停止
        </BaseButton>
      </div>
    </div>
    <dl class="status-summary">
      <div>
        <dt>在线服务</dt>
        <dd><strong>{{ onlineCount }}</strong><span>/ 3</span></dd>
      </div>
      <div>
        <dt>Supervisor</dt>
        <dd>{{ status ? describeMode(status.supervisor.mode) : "—" }}</dd>
      </div>
      <div>
        <dt>状态探测</dt>
        <dd>{{ pending ? "进行中" : "已就绪" }}</dd>
      </div>
    </dl>
  </section>
</template>
