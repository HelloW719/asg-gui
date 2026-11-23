<script setup lang="ts">
import { Sparkles } from "@lucide/vue";
import { useAppearanceStore } from "@/stores/appearance";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import SelectField from "@/shared/ui/SelectField.vue";
import SwitchField from "@/shared/ui/SwitchField.vue";
import type { ThemePreference } from "@/types/cli";
import { isGlassFrameRate } from "@/types/appearance";

const appearance = useAppearanceStore();
const frameRateOptions = [
  { value: "auto", label: "自动（60/45/30）" },
  { value: "display", label: "跟随屏幕（不封顶）" },
  { value: "30", label: "30 Hz" },
  { value: "45", label: "45 Hz" },
  { value: "60", label: "60 Hz" },
  { value: "90", label: "90 Hz" },
  { value: "120", label: "120 Hz" },
  { value: "144", label: "144 Hz" },
  { value: "165", label: "165 Hz" },
  { value: "240", label: "240 Hz" },
] as const;

function chooseTheme(theme: ThemePreference): void {
  void appearance.setTheme(theme);
}

function chooseFrameRate(value: string): void {
  const frameRate =
    value === "auto" || value === "display" ? value : Number(value);
  if (isGlassFrameRate(frameRate)) appearance.setGlassFrameRate(frameRate);
}
</script>

<template>
  <section class="settings-appearance">
    <SectionHeading title="主题与效果">
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
    <div class="settings-row">
      <div>
        <strong>玻璃动效帧率</strong>
        <p>自动模式最高 60Hz 并在持续掉帧时降级；手动值不超过屏幕刷新率。</p>
      </div>
      <SelectField
        class="glass-frame-rate-select"
        :model-value="String(appearance.glassFrameRate)"
        :options="frameRateOptions"
        accessible-label="玻璃动效帧率"
        @update:model-value="chooseFrameRate"
      />
    </div>
    <SwitchField
      :model-value="appearance.reducedTransparency"
      label="减少透明"
      description="使用更不透明的玻璃表面，降低 WebView 合成开销。"
      @update:model-value="appearance.setReducedTransparency"
    />
  </section>
</template>
