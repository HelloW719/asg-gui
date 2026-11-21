<script setup lang="ts">
import BaseButton from "@/shared/ui/BaseButton.vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { ConfigLeaf } from "../composables/useSettings";

const value = defineModel<string>("value", { required: true });

defineProps<{
  field: ConfigLeaf;
  busy: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [];
}>();
</script>

<template>
  <section class="editor-drawer">
    <SectionHeading eyebrow="单字段编辑" :title="field.path">
      <BaseButton size="compact" @click="emit('cancel')">关闭</BaseButton>
    </SectionHeading>
    <label class="field">
      <span>值（字符串直接输入；对象和数组使用 JSON）</span>
      <textarea v-model="value" rows="8" spellcheck="false" />
    </label>
    <div class="action-row">
      <BaseButton @click="emit('cancel')">取消</BaseButton>
      <BaseButton variant="primary" :disabled="busy" @click="emit('save')">
        保存并重启
      </BaseButton>
    </div>
  </section>
</template>
