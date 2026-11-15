import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/status" },
    {
      path: "/status",
      name: "status",
      component: () => import("./views/DashboardView.vue"),
      meta: { title: "状态" },
    },
    {
      path: "/explore",
      name: "explore",
      component: () => import("./views/ExplorerView.vue"),
      meta: { title: "检索" },
    },
    {
      path: "/sources",
      name: "sources",
      component: () => import("./views/SourcesView.vue"),
      meta: { title: "来源" },
    },
    {
      path: "/logs",
      name: "logs",
      component: () => import("./views/LogsView.vue"),
      meta: { title: "日志" },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("./views/SettingsView.vue"),
      meta: { title: "设置" },
    },
    {
      path: "/maintenance",
      name: "maintenance",
      component: () => import("./views/MaintenanceView.vue"),
      meta: { title: "维护" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/status" },
  ],
});

export default router;

