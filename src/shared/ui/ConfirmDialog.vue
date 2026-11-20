<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import BaseButton from "./BaseButton.vue";

defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent class="dialog-content glass-surface">
        <DialogTitle class="dialog-title">{{ title }}</DialogTitle>
        <DialogDescription class="dialog-description">{{ description }}</DialogDescription>
        <div class="dialog-actions">
          <BaseButton variant="ghost" @click="emit('update:open', false)">
            取消
          </BaseButton>
          <BaseButton
            :variant="destructive ? 'danger' : 'primary'"
            @click="
              emit('confirm');
              emit('update:open', false);
            "
          >
            {{ confirmLabel ?? "确认" }}
          </BaseButton>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

