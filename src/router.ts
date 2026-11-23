import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/status" },
    {
      path: "/welcome",
      name: "welcome",
      component: () => import("@/features/welcome/WelcomePage.vue"),
      meta: { title: "欢迎使用" },
    },
    {
      path: "/status",
      name: "status",
      component: () => import("@/features/dashboard/DashboardPage.vue"),
      meta: { title: "状态" },
    },
    {
      path: "/explore",
      name: "explore",
      component: () => import("@/features/explorer/ExplorerPage.vue"),
      meta: { title: "检索" },
    },
    {
      path: "/sources",
      name: "sources",
      component: () => import("@/features/sources/SourcesPage.vue"),
      meta: { title: "来源" },
    },
    {
      path: "/logs",
      name: "logs",
      component: () => import("@/features/logs/LogsPage.vue"),
      meta: { title: "日志" },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/features/settings/SettingsPage.vue"),
      meta: { title: "设置" },
    },
    {
      path: "/maintenance",
      name: "maintenance",
      component: () => import("@/features/maintenance/MaintenancePage.vue"),
      meta: { title: "维护" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/status" },
  ],
});

export default router;

