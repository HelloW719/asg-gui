<script setup lang="ts">
import type { VisualState } from "@/types/cli";
import GlassScene from "./GlassScene.vue";

defineProps<{
  visualState: VisualState;
  theme: "dark" | "light";
  reducedMotion: boolean;
}>();
</script>

<template>
  <div class="background-layer" aria-hidden="true" />
  <GlassScene
    :visual-state="visualState"
    :theme="theme"
    :reduced-motion="reducedMotion"
  />
  <div class="glass-frost-layer" aria-hidden="true" />
  <slot />
</template>
