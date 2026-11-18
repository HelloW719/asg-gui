<script setup lang="ts">
import { Sparkles } from "@lucide/vue";
import { useAppearanceStore } from "@/stores/appearance";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import SwitchField from "@/shared/ui/SwitchField.vue";
import type { ThemePreference } from "@/types/cli";

const appearance = useAppearanceStore();

function chooseTheme(theme: ThemePreference): void {
  void appearance.setTheme(theme);
}
</script>

<template>
  <section class="settings-appearance glass-surface">
    <SectionHeading eyebrow="应用外观" title="主题与效果">
      <Sparkles :size="21" />
    </SectionHeading>
    <div class="settings-row">
      <div>
        <strong>主题</strong>
        <p>默认跟随系统，也可以固定为深色或浅色。</p>
      </div>
      <div class="segmented-control">
        <button
          type="button"
          :class="{ active: appearance.themePreference === 'system' }"
          @click="chooseTheme('system')"
        >
          跟随系统
        </button>
        <button
          type="button"
          :class="{ active: appearance.themePreference === 'dark' }"
          @click="chooseTheme('dark')"
        >
          深色
        </button>
        <button
          type="button"
          :class="{ active: appearance.themePreference === 'light' }"
          @click="chooseTheme('light')"
        >
          浅色
        </button>
      </div>
    </div>
    <SwitchField
      :model-value="appearance.reducedMotion"
      label="减少动态"
      description="关闭状态几何的呼吸、旋转和轨迹动画。"
      @update:model-value="appearance.setReducedMotion"
    />
    <SwitchField
      :model-value="appearance.reducedTransparency"
      label="减少透明"
      description="使用更不透明的玻璃表面，降低 WebView 合成开销。"
      @update:model-value="appearance.setReducedTransparency"
    />
  </section>
</template>
