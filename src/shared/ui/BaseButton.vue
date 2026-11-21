<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

const buttonElement = ref<HTMLElement | null>(null);
const loadingWidth = ref<string>();

watch(
  () => props.loading,
  (loading) => {
    if (!loading) {
      loadingWidth.value = undefined;
      return;
    }

    const width = buttonElement.value?.getBoundingClientRect().width ?? 0;
    loadingWidth.value = width > 0 ? `${width}px` : undefined;
  },
  { flush: "sync" },
);
</script>

<template>
  <m3e-button
    ref="buttonElement"
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
    :style="{ width: loadingWidth }"
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
