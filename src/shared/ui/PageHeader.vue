<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  index?: string;
  label?: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <div class="page-header__title-row">
        <h1>{{ title }}</h1>
        <span
          v-if="index || label"
          class="page-header__context"
          aria-hidden="true"
        >
          <template v-if="index">{{ index }}</template>
          <template v-if="index && label"> // </template>
          <template v-if="label">{{ label }}</template>
        </span>
        <slot name="meta" />
      </div>
      <p v-if="description || $slots.description">
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <span class="page-header__ghost" aria-hidden="true">{{ title }}</span>
    <div v-if="$slots.actions" class="action-row">
      <slot name="actions" />
    </div>
    <span class="page-header__baseline" aria-hidden="true" />
  </header>
</template>
