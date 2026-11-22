<script setup lang="ts">
import { Send } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import DisclosurePanel from "@/shared/ui/DisclosurePanel.vue";
import SelectField from "@/shared/ui/SelectField.vue";
import type { FetchForm } from "@/utils/args";

defineProps<{
  form: FetchForm;
  busy: boolean;
}>();

const renderOptions = [
  { value: "auto", label: "auto" },
  { value: "always", label: "always" },
  { value: "never", label: "never" },
] as const;

const emit = defineEmits<{
  submit: [];
}>();
</script>

<template>
  <form class="query-card glass-surface" @submit.prevent="emit('submit')">
    <div class="query-hero">
      <label class="field field--hero">
        <span>URL</span>
        <input
          v-model="form.url"
          type="url"
          placeholder="https://example.com/article"
        />
      </label>
      <BaseButton type="submit" size="large" variant="primary" :disabled="busy">
        <template #icon><Send :size="18" /></template>
        抓取正文
      </BaseButton>
    </div>
    <DisclosurePanel label="抓取参数">
      <div class="form-grid">
        <div class="field">
          <span>渲染模式</span>
          <SelectField
            v-model="form.render"
            :options="renderOptions"
            accessible-label="渲染模式"
          />
        </div>
        <label class="field">
          <span>最大字符</span>
          <input v-model="form.maxChars" type="number" min="1" max="200000" />
        </label>
        <label class="field">
          <span>超时（秒）</span>
          <input v-model="form.timeout" type="number" min="1" />
        </label>
      </div>
    </DisclosurePanel>
  </form>
</template>
