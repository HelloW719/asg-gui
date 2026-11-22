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
  <div
    class="tactical-plane"
    :data-visual-state="visualState"
    aria-hidden="true"
  >
    <span class="tactical-plane__grid" />
    <span class="tactical-plane__plate tactical-plane__plate--primary" />
    <span class="tactical-plane__plate tactical-plane__plate--secondary" />
    <span class="tactical-plane__axis tactical-plane__axis--x" />
    <span class="tactical-plane__axis tactical-plane__axis--y" />
    <span class="tactical-plane__scan" />
  </div>
  <div class="glass-frost-layer" aria-hidden="true" />
  <slot />
</template>
