<script setup lang="ts">
import { Send } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import type { FetchForm } from "@/utils/args";

defineProps<{
  form: FetchForm;
  busy: boolean;
}>();

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
    <details class="advanced-fields">
      <summary>抓取参数</summary>
      <div class="form-grid">
        <label class="field">
          <span>渲染模式</span>
          <select v-model="form.render">
            <option value="auto">auto</option>
            <option value="always">always</option>
            <option value="never">never</option>
          </select>
        </label>
        <label class="field">
          <span>最大字符</span>
          <input v-model="form.maxChars" type="number" min="1" max="200000" />
        </label>
        <label class="field">
          <span>超时（秒）</span>
          <input v-model="form.timeout" type="number" min="1" />
        </label>
      </div>
    </details>
  </form>
</template>
