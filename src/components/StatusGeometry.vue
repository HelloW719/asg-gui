<script setup lang="ts">
import { computed } from "vue";
import type { VisualState } from "../types/cli";

const props = defineProps<{
  state: VisualState;
  reducedMotion?: boolean;
}>();

const stateClass = computed(() => `geometry--${props.state}`);
</script>

<template>
  <div
    class="status-geometry"
    :class="[stateClass, { 'status-geometry--reduced': reducedMotion }]"
    role="img"
    :aria-label="`当前状态：${state}`"
  >
    <svg viewBox="0 0 440 440" aria-hidden="true">
      <defs>
        <filter id="geometry-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      <circle class="geometry-halo" cx="220" cy="220" r="142" />
      <circle class="geometry-track geometry-track--outer" cx="220" cy="220" r="125" />
      <circle class="geometry-track geometry-track--middle" cx="220" cy="220" r="88" />
      <circle class="geometry-track geometry-track--inner" cx="220" cy="220" r="49" />

      <g class="geometry-stable">
        <circle class="geometry-core" cx="220" cy="220" r="22" />
        <circle class="geometry-breath geometry-breath--one" cx="220" cy="220" r="70" />
        <circle class="geometry-breath geometry-breath--two" cx="220" cy="220" r="103" />
      </g>

      <g class="geometry-loading">
        <path class="geometry-arc" d="M 220 92 A 128 128 0 0 1 348 220" />
        <circle class="geometry-dot geometry-dot--one" cx="220" cy="92" r="8" />
        <circle class="geometry-dot geometry-dot--two" cx="304" cy="304" r="5" />
      </g>

      <g class="geometry-rotating">
        <path class="geometry-arc geometry-arc--one" d="M 126 145 A 116 116 0 0 1 326 161" />
        <path class="geometry-arc geometry-arc--two" d="M 314 276 A 116 116 0 0 1 119 265" />
        <circle class="geometry-core geometry-core--small" cx="220" cy="220" r="14" />
      </g>

      <g class="geometry-stopped">
        <circle class="geometry-stopped-ring" cx="220" cy="220" r="64" />
        <path class="geometry-pause" d="M 205 199 L 205 241 M 235 199 L 235 241" />
      </g>

      <g class="geometry-degraded">
        <path class="geometry-gap" d="M 220 99 A 121 121 0 1 0 322 283" />
        <circle class="geometry-warning" cx="220" cy="220" r="11" />
      </g>

      <g class="geometry-failed">
        <path class="geometry-fracture" d="M 155 130 L 220 93 L 267 153 L 335 171 L 298 240" />
        <path class="geometry-fracture" d="M 302 270 L 249 329 L 181 307 L 128 251" />
        <path class="geometry-crack" d="M 210 199 L 236 212 L 218 241 L 247 261" />
      </g>

      <g class="geometry-open">
        <path class="geometry-open-arc" d="M 220 96 A 124 124 0 1 0 311 293" />
        <path class="geometry-open-line" d="M 285 293 L 345 293" />
      </g>
    </svg>
    <span class="geometry-shine" />
  </div>
</template>

