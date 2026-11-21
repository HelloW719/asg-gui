<script setup lang="ts">
import { FolderCog } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";

defineProps<{
  root: string | null;
}>();

const emit = defineEmits<{
  change: [];
  disconnect: [];
}>();
</script>

<template>
  <section class="settings-install">
    <FolderCog :size="21" />
    <div>
      <span class="eyebrow">ASG 安装</span>
      <strong>{{ root }}</strong>
      <p>切换安装根会停止 GUI 的状态轮询，但不会停止已有服务。</p>
    </div>
    <BaseButton size="compact" variant="secondary" @click="emit('change')">
      切换目录
    </BaseButton>
    <BaseButton size="compact" danger-text @click="emit('disconnect')">
      断开
    </BaseButton>
  </section>
</template>
