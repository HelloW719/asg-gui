<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <label class="settings-row">
    <div>
      <strong>{{ label }}</strong>
      <p v-if="description">{{ description }}</p>
    </div>
    <span class="switch">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span aria-hidden="true" />
    </span>
  </label>
</template>
