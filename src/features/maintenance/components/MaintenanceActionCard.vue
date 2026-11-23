<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <article class="maintenance-card">
    <div class="maintenance-card__icon">
      <slot name="icon" />
    </div>
    <h2>{{ title }}</h2>
    <slot />
    <div v-if="$slots.actions" class="action-row">
      <slot name="actions" />
    </div>
  </article>
</template>
