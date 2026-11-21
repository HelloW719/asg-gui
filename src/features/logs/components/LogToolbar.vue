<script setup lang="ts">
import { Search, Trash2 } from "@lucide/vue";

const query = defineModel<string>("query", { required: true });
const autoScroll = defineModel<boolean>("autoScroll", { required: true });

const props = defineProps<{
  selectedServices: string[];
  following: boolean;
  options: ReadonlyArray<{ value: string; label: string }>;
}>();

const emit = defineEmits<{
  "update:selectedServices": [services: string[]];
  clear: [];
}>();

function toggleService(service: string, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  const next = checked
    ? [...props.selectedServices, service]
    : props.selectedServices.filter((item) => item !== service);
  emit("update:selectedServices", next);
}
</script>

<template>
  <section class="log-toolbar">
    <div class="service-filters">
      <label v-for="service in options" :key="service.value" class="check-label">
        <input
          type="checkbox"
          :checked="selectedServices.includes(service.value)"
          :disabled="following"
          @change="toggleService(service.value, $event)"
        />
        {{ service.label }}
      </label>
    </div>
    <label class="search-field">
      <Search :size="15" />
      <input v-model="query" type="search" placeholder="筛选日志" />
    </label>
    <label class="check-label">
      <input v-model="autoScroll" type="checkbox" />
      自动滚动
    </label>
    <button class="icon-button" type="button" title="清空视图" @click="emit('clear')">
      <Trash2 :size="16" />
    </button>
  </section>
</template>
