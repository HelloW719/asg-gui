<script setup lang="ts">
import { RefreshCw } from "@lucide/vue";
import {
  engineAvailabilityLabel,
  engineGroupDescription,
  engineGroupLabel,
  engineSecretRequirements,
} from "../enginePresentation";
import BaseButton from "@/shared/ui/BaseButton.vue";
import DisclosurePanel from "@/shared/ui/DisclosurePanel.vue";
import SelectField from "@/shared/ui/SelectField.vue";
import type { EngineInfo, EngineRouteDraft } from "@/types/cli";

defineProps<{
  engines: EngineInfo[];
  loading: boolean;
  busy: boolean;
  routeDrafts: Record<string, EngineRouteDraft>;
}>();

const emit = defineEmits<{
  refresh: [includeRemote: boolean];
  toggle: [engine: EngineInfo];
  routeChange: [engine: EngineInfo, route: string];
  saveRoute: [engine: EngineInfo];
  secret: [engine: EngineInfo];
}>();

const routeOptions = [
  { value: "none", label: "none" },
  { value: "resident", label: "resident" },
  { value: "rotating", label: "rotating" },
] as const;

function currentRoute(engine: EngineInfo): string {
  return ["resident", "rotating"].find((route) => engine.routing.includes(route)) ?? "none";
}
</script>

<template>
  <section class="source-toolbar">
    <span>{{ engines.length }} 个本地引擎</span>
    <div class="action-row">
      <BaseButton
        size="compact"
        :disabled="busy || loading"
        @click="emit('refresh', false)"
      >
        <template #icon><RefreshCw :size="15" /></template>
        本地
      </BaseButton>
      <BaseButton
        size="compact"
        variant="secondary"
        :disabled="busy || loading"
        @click="emit('refresh', true)"
      >
        包含远端目录
      </BaseButton>
    </div>
  </section>

  <p v-if="loading" class="empty-copy">正在读取引擎…</p>
  <p v-else-if="engines.length === 0" class="empty-copy">没有可显示的搜索引擎。</p>
  <div v-else class="engine-grid">
    <article
      v-for="engine in engines"
      :key="engine.id"
      class="engine-card"
    >
      <header>
        <div>
          <span class="eyebrow">{{ engineGroupLabel(engine.group) }}</span>
          <h2>{{ engine.name }}</h2>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :aria-label="`${engine.name} 的启用状态`"
            :checked="engine.enabled"
            :disabled="busy"
            @change="emit('toggle', engine)"
          />
          <span aria-hidden="true" />
        </label>
      </header>
      <div class="token-row">
        <span :class="engine.available ? 'token token--ok' : 'token token--warn'">
          {{ engineAvailabilityLabel(engine) }}
        </span>
        <span v-for="route in engine.routing" :key="route" class="token">
          {{ route }}
        </span>
      </div>
      <p
        v-if="engineGroupDescription(engine.group)"
        class="field-note engine-group-note"
      >
        {{ engineGroupDescription(engine.group) }}
      </p>
      <p v-if="engine.requires?.length" class="field-note">
        依赖：{{ engine.requires.join(" · ") }}
      </p>
      <div v-if="engine.group === 'searxng'" class="inline-field">
        <SelectField
          :model-value="currentRoute(engine)"
          :options="routeOptions"
          :disabled="busy"
          :accessible-label="`${engine.name} 路由`"
          @update:model-value="emit('routeChange', engine, $event)"
        />
      </div>
      <DisclosurePanel
        v-else-if="engine.group === 'gateway.search'"
        class="route-editor"
        label="编辑类别路由"
      >
        <label class="field">
          <span>Category</span>
          <input v-model="routeDrafts[engine.id]!.category" placeholder="news" />
        </label>
        <label class="field">
          <span>Hot category</span>
          <input v-model="routeDrafts[engine.id]!.hotCategory" placeholder="news_hot" />
        </label>
        <BaseButton
          size="compact"
          variant="secondary"
          :disabled="busy"
          @click="emit('saveRoute', engine)"
        >
          保存路由
        </BaseButton>
      </DisclosurePanel>
      <BaseButton
        v-if="engineSecretRequirements(engine).length"
        size="compact"
        :disabled="busy"
        @click="emit('secret', engine)"
      >
        设置密钥
      </BaseButton>
    </article>
  </div>
</template>
