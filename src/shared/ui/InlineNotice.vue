<script setup lang="ts">
import { AlertCircle, CircleCheck, Info, X } from "@lucide/vue";

withDefaults(
  defineProps<{
    tone?: "info" | "success" | "error";
    message: string;
    dismissible?: boolean;
  }>(),
  { tone: "info", dismissible: false },
);

const emit = defineEmits<{ dismiss: [] }>();
</script>

<template>
  <div class="inline-notice" :class="`inline-notice--${tone}`" role="status">
    <CircleCheck v-if="tone === 'success'" :size="17" />
    <AlertCircle v-else-if="tone === 'error'" :size="17" />
    <Info v-else :size="17" />
    <span>{{ message }}</span>
    <button
      v-if="dismissible"
      class="inline-notice__close"
      type="button"
      aria-label="关闭提示"
      @click="emit('dismiss')"
    >
      <X :size="14" />
    </button>
  </div>
</template>

