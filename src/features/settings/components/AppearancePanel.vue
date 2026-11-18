<script setup lang="ts">
import { Sparkles } from "@lucide/vue";
import { useAppearanceStore } from "@/stores/appearance";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import SwitchField from "@/shared/ui/SwitchField.vue";
import type { ThemePreference } from "@/types/cli";
import { isGlassFrameRate } from "@/types/appearance";

const appearance = useAppearanceStore();

function chooseTheme(theme: ThemePreference): void {
  void appearance.setTheme(theme);
}

function chooseFrameRate(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const frameRate =
    value === "auto" || value === "display" ? value : Number(value);
  if (isGlassFrameRate(frameRate)) appearance.setGlassFrameRate(frameRate);
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
    <label class="settings-row">
      <div>
        <strong>玻璃动效帧率</strong>
        <p>自动模式最高 60Hz 并在持续掉帧时降级；手动值不超过屏幕刷新率。</p>
      </div>
      <select
        class="glass-frame-rate-select"
        aria-label="玻璃动效帧率"
        :value="appearance.glassFrameRate"
        @change="chooseFrameRate"
      >
        <option value="auto">自动（60/45/30）</option>
        <option value="display">跟随屏幕（不封顶）</option>
        <option value="30">30 Hz</option>
        <option value="45">45 Hz</option>
        <option value="60">60 Hz</option>
        <option value="90">90 Hz</option>
        <option value="120">120 Hz</option>
        <option value="144">144 Hz</option>
        <option value="165">165 Hz</option>
        <option value="240">240 Hz</option>
      </select>
    </label>
    <SwitchField
      :model-value="appearance.reducedTransparency"
      label="减少透明"
      description="使用更不透明的玻璃表面，降低 WebView 合成开销。"
      @update:model-value="appearance.setReducedTransparency"
    />
  </section>
</template>
