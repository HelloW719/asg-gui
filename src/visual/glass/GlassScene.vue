<script setup lang="ts">
import { ref } from "vue";
import type { VisualState } from "@/types/cli";
import { useGlassSceneRenderer } from "./useGlassSceneRenderer";

const props = defineProps<{
  visualState: VisualState;
  theme: "dark" | "light";
  reducedMotion: boolean;
}>();

const root = ref<HTMLElement | null>(null);
const motionCanvas = ref<HTMLCanvasElement | null>(null);
const blurCanvas = ref<HTMLCanvasElement | null>(null);

useGlassSceneRenderer({
  root,
  motionCanvas,
  blurCanvas,
  visualState: () => props.visualState,
  theme: () => props.theme,
  reducedMotion: () => props.reducedMotion,
});
</script>

<template>
  <div ref="root" class="glass-scene" aria-hidden="true">
    <canvas ref="motionCanvas" class="glass-scene__motion" />
    <canvas ref="blurCanvas" class="glass-scene__blur" />
  </div>
</template>
