<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";

defineProps<{
  label: string;
}>();
</script>

<template>
  <details class="disclosure-panel">
    <summary class="disclosure-panel__summary">
      <strong>{{ label }}</strong>
      <span class="disclosure-panel__icon" aria-hidden="true">
        <ChevronDown :size="16" />
      </span>
    </summary>
    <div class="disclosure-panel__body">
      <slot />
    </div>
  </details>
</template>
