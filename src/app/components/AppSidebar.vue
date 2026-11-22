<script setup lang="ts">
import {
  Activity,
  Blocks,
  Compass,
  FileText,
  Settings2,
  Wrench,
} from "@lucide/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const items = [
  { to: "/status", label: "状态", sub: "STATUS", code: "01", icon: Activity },
  { to: "/explore", label: "检索", sub: "SEARCH", code: "02", icon: Compass },
  { to: "/sources", label: "来源", sub: "SOURCES", code: "03", icon: Blocks },
  { to: "/logs", label: "日志", sub: "LOGS", code: "04", icon: FileText },
  { to: "/settings", label: "设置", sub: "SETTINGS", code: "05", icon: Settings2 },
  { to: "/maintenance", label: "维护", sub: "MAINTENANCE", code: "06", icon: Wrench },
];

const activePath = computed(() => route.path);
</script>

<template>
  <nav class="app-sidebar" aria-label="主导航">
    <div class="app-sidebar__label">
      <i aria-hidden="true" />
      <span>
        <strong>控制矩阵</strong>
        <small>CONTROL MATRIX</small>
      </span>
    </div>
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ 'nav-item--active': activePath === item.to }"
      :aria-label="item.label"
      :aria-current="activePath === item.to ? 'page' : undefined"
      :title="`${item.label} · ${item.sub}`"
    >
      <span class="nav-item__index" aria-hidden="true">{{ item.code }}</span>
      <component
        :is="item.icon"
        class="nav-item__icon"
        :size="19"
        :stroke-width="1.8"
      />
      <span class="nav-item__copy" aria-hidden="true">
        <strong>{{ item.label }}</strong>
        <small>{{ item.sub }}</small>
      </span>
    </RouterLink>
    <div class="app-sidebar__footer">
      <span class="app-sidebar__signal" />
      <span>
        <small>LOCAL CHANNEL</small>
        仅通过 ASG CLI 工作
      </span>
    </div>
  </nav>
</template>

