<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
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

const editor = ref<HTMLElement | null>(null);
const input = ref<HTMLTextAreaElement | null>(null);

onMounted(async () => {
  await nextTick();
  editor.value?.scrollIntoView({ block: "nearest" });
  input.value?.focus({ preventScroll: true });
});
</script>

<template>
  <section ref="editor" class="config-editor">
    <SectionHeading
      eyebrow="配置字段"
      :title="field.path"
      description="字符串直接输入；对象和数组使用 JSON。"
    >
      <BaseButton variant="ghost" size="compact" @click="emit('cancel')">
        关闭
      </BaseButton>
    </SectionHeading>
    <label class="field">
      <span>字段值</span>
      <textarea
        ref="input"
        v-model="value"
        rows="5"
        spellcheck="false"
      />
    </label>
    <div class="action-row">
      <BaseButton @click="emit('cancel')">取消</BaseButton>
      <BaseButton variant="primary" :disabled="busy" @click="emit('save')">
        保存并重启
      </BaseButton>
    </div>
  </section>
</template>
