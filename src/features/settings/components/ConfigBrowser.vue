<script setup lang="ts">
import { Eye, Search, SearchX, SlidersHorizontal } from "@lucide/vue";
import EmptyState from "@/shared/ui/EmptyState.vue";
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import type { ConfigGroup, ConfigLeaf } from "../composables/useSettings";

const search = defineModel<string>("search", { required: true });

defineProps<{
  groups: ConfigGroup[];
  rowCount: number;
  loading: boolean;
  groupLabels: Record<string, string>;
  editingPath?: string | null;
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
    <EmptyState
      v-else-if="groups.length === 0"
      compact
      :title="search.trim() ? '没有匹配的配置字段' : '没有可显示的配置字段'"
      :description="
        search.trim()
          ? '尝试缩短搜索内容或清除筛选。'
          : '配置读取完成后，可编辑字段会按分组显示。'
      "
    >
      <template #icon><SearchX :size="18" /></template>
    </EmptyState>
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
          <template v-for="row in fields" :key="row.path">
            <button
              class="config-field"
              :class="{ 'config-field--active': row.path === editingPath }"
              type="button"
              :aria-expanded="row.path === editingPath"
              @click="emit('edit', row)"
            >
              <span class="config-field__path">{{ row.path }}</span>
              <code>{{ row.secret ? "••••••" : displayValue(row.value) }}</code>
              <Eye :size="15" />
            </button>
            <slot
              v-if="row.path === editingPath"
              name="editor"
              :field="row"
            />
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
