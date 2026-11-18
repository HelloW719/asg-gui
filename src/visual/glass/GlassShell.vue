<script setup lang="ts">
import type { VisualState } from "@/types/cli";
import type { GlassFrameRate } from "@/types/appearance";
import GlassScene from "./GlassScene.vue";

defineProps<{
  visualState: VisualState;
  theme: "dark" | "light";
  reducedMotion: boolean;
  frameRate: GlassFrameRate;
}>();
</script>

<template>
  <div class="background-layer" aria-hidden="true" />
  <GlassScene
    :visual-state="visualState"
    :theme="theme"
    :reduced-motion="reducedMotion"
    :frame-rate="frameRate"
  />
  <div class="glass-frost-layer" aria-hidden="true" />
  <slot />
</template>
