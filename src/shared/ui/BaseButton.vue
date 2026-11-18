<script setup lang="ts">
import { LoaderCircle } from "@lucide/vue";

withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost";
    size?: "compact" | "regular" | "large";
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    dangerText?: boolean;
  }>(),
  {
    variant: "ghost",
    size: "regular",
    loading: false,
    disabled: false,
    type: "button",
    dangerText: false,
  },
);
</script>

<template>
  <button
    :type="type"
    class="button"
    :class="[
      `button--${variant}`,
      size !== 'regular' && `button--${size}`,
      { 'button--danger-text': dangerText },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <LoaderCircle v-if="loading" class="spin" :size="15" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>
