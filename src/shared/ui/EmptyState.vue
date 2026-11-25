<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    compact?: boolean;
    embedded?: boolean;
  }>(),
  {
    compact: false,
    embedded: false,
  },
);
</script>

<template>
  <div
    class="empty-state"
    :class="{
      'empty-state--compact': compact,
      'empty-state--embedded': embedded,
    }"
    role="status"
  >
    <span v-if="$slots.icon" class="empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <div class="empty-state__copy">
      <strong>{{ title }}</strong>
      <p v-if="description">{{ description }}</p>
      <div v-if="$slots.default" class="empty-state__actions">
        <slot />
      </div>
    </div>
  </div>
</template>
