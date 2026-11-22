<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="page-header">
    <span class="page-header__rail" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
    <div class="page-header__copy">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <div class="page-header__title-row">
        <h1>{{ title }}</h1>
        <slot name="meta" />
      </div>
      <p v-if="description || $slots.description">
        <slot name="description">{{ description }}</slot>
      </p>
      <span class="page-header__ghost" aria-hidden="true">{{ title }}</span>
    </div>
    <div v-if="$slots.actions" class="action-row">
      <slot name="actions" />
    </div>
  </header>
</template>
