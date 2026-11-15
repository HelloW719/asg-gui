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
  { to: "/status", label: "状态", icon: Activity },
  { to: "/explore", label: "检索", icon: Compass },
  { to: "/sources", label: "来源", icon: Blocks },
  { to: "/logs", label: "日志", icon: FileText },
  { to: "/settings", label: "设置", icon: Settings2 },
  { to: "/maintenance", label: "维护", icon: Wrench },
];

const activePath = computed(() => route.path);
</script>

<template>
  <nav class="app-sidebar" aria-label="主导航">
    <div class="app-sidebar__label">控制台</div>
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ 'nav-item--active': activePath === item.to }"
    >
      <component :is="item.icon" :size="19" :stroke-width="1.8" />
      <span>{{ item.label }}</span>
    </RouterLink>
    <div class="app-sidebar__footer">
      <span class="app-sidebar__signal" />
      <span>仅通过 ASG CLI 工作</span>
    </div>
  </nav>
</template>

