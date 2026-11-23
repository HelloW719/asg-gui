<script setup lang="ts">
import { Eye, Search, SlidersHorizontal } from "@lucide/vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { ConfigGroup, ConfigLeaf } from "../composables/useSettings";

const search = defineModel<string>("search", { required: true });

defineProps<{
  groups: ConfigGroup[];
  rowCount: number;
  loading: boolean;
  groupLabels: Record<string, string>;
}>();

const emit = defineEmits<{
  edit: [row: ConfigLeaf];
}>();

function displayValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
</script>

<template>
  <section class="config-section">
    <SectionHeading title="高级设置" :description="`${rowCount} 个可编辑字段`">
      <label class="search-field config-search">
        <Search :size="15" />
        <input v-model="search" type="search" placeholder="搜索配置路径" />
      </label>
    </SectionHeading>

    <p v-if="loading" class="empty-copy">正在读取掩码配置…</p>
    <div v-else-if="groups.length === 0" class="empty-copy">
      没有匹配的配置字段。
    </div>
    <div v-else class="config-groups">
      <div
        v-for="[group, fields] in groups"
        :key="group"
        class="config-group"
      >
        <header>
          <SlidersHorizontal :size="17" />
          <h3>{{ groupLabels[group] ?? group }}</h3>
          <span>{{ fields.length }}</span>
        </header>
        <div class="config-table">
          <button
            v-for="row in fields"
            :key="row.path"
            class="config-field"
            type="button"
            @click="emit('edit', row)"
          >
            <span class="config-field__path">{{ row.path }}</span>
            <code>{{ row.secret ? "••••••" : displayValue(row.value) }}</code>
            <Eye :size="15" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
