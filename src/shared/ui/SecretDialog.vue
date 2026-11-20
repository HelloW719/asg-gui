<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { nextTick, ref, watch } from "vue";
import BaseButton from "./BaseButton.vue";

const props = defineProps<{
  open: boolean;
  title: string;
  description: string;
  secretNames?: string[];
  editableName?: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: { name?: string; secret: string }];
}>();

const secret = ref("");
const selectedName = ref("");
const customName = ref("");
const input = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    secret.value = "";
    selectedName.value = props.secretNames?.[0] ?? "";
    customName.value = "";
    await nextTick();
    input.value?.focus();
  },
);

function submit(): void {
  if (!secret.value.trim()) return;
  emit("submit", {
    name: props.editableName
      ? customName.value.trim() || undefined
      : selectedName.value || undefined,
    secret: secret.value,
  });
  secret.value = "";
  emit("update:open", false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent class="dialog-content glass-surface">
        <DialogTitle class="dialog-title">{{ title }}</DialogTitle>
        <DialogDescription class="dialog-description">{{ description }}</DialogDescription>
        <label v-if="secretNames && secretNames.length > 1" class="field">
          <span>密钥名称</span>
          <select v-model="selectedName">
            <option v-for="name in secretNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label v-if="editableName" class="field">
          <span>密钥名称</span>
          <input
            v-model="customName"
            type="text"
            placeholder="例如 api_key"
            pattern="[a-z][a-z0-9_-]*"
          />
        </label>
        <label class="field">
          <span>密钥值</span>
          <input
            ref="input"
            v-model="secret"
            type="password"
            autocomplete="new-password"
            placeholder="输入后仅通过 stdin 发送"
            @keydown.enter.prevent="submit"
          />
        </label>
        <p class="field-note">密钥不会写入 GUI 配置、日志或任务参数。</p>
        <div class="dialog-actions">
          <BaseButton variant="ghost" @click="emit('update:open', false)">
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!secret.trim() || (editableName && !customName.trim())"
            @click="submit"
          >
            保存并重启
          </BaseButton>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

