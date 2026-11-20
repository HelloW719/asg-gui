<script setup lang="ts">
import { computed } from "vue";
import { LoaderCircle } from "@lucide/vue";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger";
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

const m3eVariant = computed(() => {
  switch (props.variant) {
    case "primary":
    case "danger":
      return "filled";
    case "secondary":
      return "tonal";
    default:
      return "text";
  }
});

const m3eSize = computed(() => {
  switch (props.size) {
    case "compact":
      return "extra-small";
    case "large":
      return "large";
    default:
      return "small";
  }
});
</script>

<template>
  <m3e-button
    :type="type"
    class="button neu-button"
    :variant="m3eVariant"
    :size="m3eSize"
    :class="[
      `button--${variant}`,
      { 'button--danger-text': dangerText },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" slot="icon" class="button__icon">
      <LoaderCircle class="spin" :size="15" />
    </span>
    <span v-else-if="$slots.icon" slot="icon" class="button__icon">
      <slot name="icon" />
    </span>
    <slot />
  </m3e-button>
</template>
