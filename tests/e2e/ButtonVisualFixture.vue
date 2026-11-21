<script setup lang="ts">
import { ref } from "vue";
import { Search, Save, Trash2 } from "@lucide/vue";
import BaseButton from "@/shared/ui/BaseButton.vue";

defineProps<{
  scheme: "dark" | "light";
}>();

const loading = ref(false);
</script>

<template>
  <m3e-theme
    color="#5ad1c0"
    variant="expressive"
    :scheme="scheme"
    motion="expressive"
    density="-1"
    strong-focus
  >
    <div class="app-root button-fixture">
      <header>
        <span class="eyebrow">Visual contract fixture</span>
        <h1>M3E Button States</h1>
        <p>用于 E2E 验收按钮变体、尺寸、焦点、按下、禁用、加载和浅色主题。</p>
      </header>

      <section class="button-contract-panel">
        <div class="button-contract-row">
          <span>Primary</span>
          <BaseButton variant="primary" data-testid="button-primary">
            <template #icon><Search :size="16" /></template>
            开始搜索
          </BaseButton>
        </div>

        <div class="button-contract-row">
          <span>Secondary</span>
          <BaseButton variant="secondary" data-testid="button-secondary">
            <template #icon><Save :size="16" /></template>
            保存路由
          </BaseButton>
        </div>

        <div class="button-contract-row">
          <span>Ghost</span>
          <BaseButton variant="ghost" data-testid="button-ghost">
            取消
          </BaseButton>
        </div>

        <div class="button-contract-row">
          <span>Danger</span>
          <BaseButton variant="danger" data-testid="button-danger">
            <template #icon><Trash2 :size="16" /></template>
            删除扩展
          </BaseButton>
        </div>

        <div class="button-contract-row">
          <span>Danger text</span>
          <BaseButton danger-text data-testid="button-danger-text">
            停止
          </BaseButton>
        </div>
      </section>

      <section class="button-contract-panel">
        <div class="button-contract-row button-contract-row--sizes">
          <span>Compact</span>
          <BaseButton size="compact" data-testid="button-compact">紧凑</BaseButton>
          <span>Regular</span>
          <BaseButton data-testid="button-regular">常规</BaseButton>
          <span>Large</span>
          <BaseButton size="large" variant="primary" data-testid="button-large">
            主要操作
          </BaseButton>
        </div>

        <div class="button-contract-row">
          <span>Disabled</span>
          <BaseButton disabled data-testid="button-disabled">不可用</BaseButton>
        </div>

        <div class="button-contract-row">
          <span>Loading</span>
          <BaseButton
            variant="primary"
            :loading="loading"
            data-testid="button-loading"
          >
            保存配置
          </BaseButton>
          <BaseButton
            size="compact"
            variant="secondary"
            data-testid="button-toggle-loading"
            @click="loading = !loading"
          >
            切换加载
          </BaseButton>
        </div>
      </section>
    </div>
  </m3e-theme>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: 100%;
  margin: 0;
  overflow: visible;
}

:global(body) {
  overflow: auto;
  background: var(--background);
}

.button-fixture {
  min-height: 100vh;
  padding: 32px;
  overflow: visible;
  background:
    radial-gradient(
      circle at 78% 12%,
      color-mix(in srgb, var(--sage) 20%, transparent),
      transparent 38%
    ),
    linear-gradient(145deg, var(--background), var(--background-raised));
}

.button-fixture header {
  width: min(760px, 100%);
  margin-bottom: 22px;
}

.button-fixture h1 {
  margin-bottom: 8px;
  font-size: clamp(1.8rem, 4vw, 2.55rem);
  font-weight: 500;
}

.button-fixture p {
  margin-bottom: 0;
  color: var(--text-soft);
  font-size: 0.82rem;
}

.button-contract-panel {
  width: min(760px, 100%);
  padding: 18px;
  border: 1px solid var(--surface-card-border);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  box-shadow:
    inset 0 1px 0 var(--surface-card-highlight-top),
    inset 0 -1px 0 var(--surface-card-highlight-bottom);
}

.button-contract-panel + .button-contract-panel {
  margin-top: 12px;
}

.button-contract-row {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.button-contract-row + .button-contract-row {
  border-top: 1px solid var(--surface-card-divider);
}

.button-contract-row > span {
  width: 82px;
  flex: 0 0 auto;
  color: var(--text-faint);
  font-size: 0.68rem;
  font-weight: 600;
}

.button-contract-row--sizes {
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .button-fixture {
    padding: 20px;
  }

  .button-contract-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .button-contract-row--sizes {
    display: grid;
    grid-template-columns: auto 1fr;
  }
}
</style>
