<script setup lang="ts">
import { ref } from "vue";
import type { VisualState } from "@/types/cli";
import type { GlassFrameRate } from "@/types/appearance";
import { useGlassSceneRenderer } from "./useGlassSceneRenderer";

const props = defineProps<{
  visualState: VisualState;
  theme: "dark" | "light";
  reducedMotion: boolean;
  frameRate: GlassFrameRate;
}>();

const root = ref<HTMLElement | null>(null);
const motionCanvas = ref<HTMLCanvasElement | null>(null);
const blurCanvas = ref<HTMLCanvasElement | null>(null);
const particleCanvas = ref<HTMLCanvasElement | null>(null);

useGlassSceneRenderer({
  root,
  motionCanvas,
  blurCanvas,
  particleCanvas,
  visualState: () => props.visualState,
  theme: () => props.theme,
  reducedMotion: () => props.reducedMotion,
  frameRate: () => props.frameRate,
});
</script>

<template>
  <div ref="root" class="glass-scene" aria-hidden="true">
    <canvas ref="motionCanvas" class="glass-scene__motion" />
    <canvas ref="blurCanvas" class="glass-scene__blur" />
    <canvas ref="particleCanvas" class="glass-scene__particles" />
  </div>
</template>
