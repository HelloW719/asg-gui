<script setup lang="ts">
import { FileImage, Send } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";
import type { SearchForm } from "@/utils/args";

defineProps<{
  form: SearchForm;
  busy: boolean;
}>();

const emit = defineEmits<{
  submit: [];
  chooseImage: [];
}>();
</script>

<template>
  <form class="query-card glass-surface" @submit.prevent="emit('submit')">
    <div class="query-hero">
      <label class="field field--hero">
        <span>查询词</span>
        <input
          v-model="form.query"
          type="search"
          placeholder="输入问题、关键词或站点范围"
        />
      </label>
      <BaseButton type="submit" size="large" variant="primary" :disabled="busy">
        <template #icon><Send :size="18" /></template>
        开始搜索
      </BaseButton>
    </div>

    <details class="advanced-fields">
      <summary>搜索参数</summary>
      <div class="form-grid">
        <label class="field">
          <span>类别</span>
          <input v-model="form.categories" placeholder="news,science" />
        </label>
        <label class="field">
          <span>引擎</span>
          <input v-model="form.engines" placeholder="google,bing" />
        </label>
        <label class="field">
          <span>语言</span>
          <input v-model="form.language" placeholder="zh-CN" />
        </label>
        <label class="field">
          <span>安全搜索</span>
          <select v-model="form.safesearch">
            <option value="">默认</option>
            <option value="0">0 · 关闭</option>
            <option value="1">1 · 中等</option>
            <option value="2">2 · 严格</option>
          </select>
        </label>
        <label class="field">
          <span>结果数量</span>
          <input v-model="form.numResults" type="number" min="1" max="1000" />
        </label>
        <label class="field">
          <span>Fanout</span>
          <input v-model="form.fanout" type="number" min="1" max="4" />
        </label>
        <label class="field">
          <span>最低分</span>
          <input v-model="form.minScore" type="number" min="0" max="1" step="0.01" />
        </label>
        <label class="field">
          <span>超时（秒）</span>
          <input v-model="form.timeout" type="number" min="1" />
        </label>
      </div>
      <div class="inline-field file-picker">
        <input v-model="form.imagePath" placeholder="本地图片路径，用于反向图搜" />
        <BaseButton variant="secondary" @click="emit('chooseImage')">
          <template #icon><FileImage :size="16" /></template>
          选择图片
        </BaseButton>
      </div>
    </details>
  </form>
</template>
