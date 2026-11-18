<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
}>();
</script>

<template>
  <article class="maintenance-card glass-surface">
    <div class="maintenance-card__icon">
      <slot name="icon" />
    </div>
    <span class="eyebrow">{{ eyebrow }}</span>
    <h2>{{ title }}</h2>
    <slot />
    <div v-if="$slots.actions" class="action-row">
      <slot name="actions" />
    </div>
  </article>
</template>
