<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { LoaderCircle } from "@lucide/vue";
import AppSidebar from "./components/AppSidebar.vue";
import AppTitleBar from "./components/AppTitleBar.vue";
import InlineNotice from "./components/InlineNotice.vue";
import SetupView from "./views/SetupView.vue";
import { listenNavigate, listenQuitBlocked } from "./services/desktop";
import { inTauri } from "./services/desktop";
import { useAppStore } from "./stores/app";
import { useJobsStore } from "./stores/jobs";

const app = useAppStore();
const jobs = useJobsStore();
const router = useRouter();
const quitBlockedMessage = ref<string | null>(null);

const showShell = computed(() => app.rootValid);

onMounted(async () => {
  await app.initialize();
  if (inTauri) {
    await listenNavigate((route) => {
      void router.push(route === "logs" ? "/logs" : "/status");
    });
    await listenQuitBlocked((payload) => {
      quitBlockedMessage.value =
        payload.message ?? "写操作尚未完成，暂时不能退出 GUI。";
    });
  }
});

watch(
  () => app.resolvedTheme,
  () => app.applyTheme(),
);
</script>

<template>
  <div class="app-root">
    <div class="background-layer" aria-hidden="true" />
    <div class="ambient-layer" aria-hidden="true">
      <span class="ambient-shape ambient-shape--one" />
      <span class="ambient-shape ambient-shape--two" />
      <span class="ambient-shape ambient-shape--three" />
    </div>

    <div class="app-frame glass-surface">
      <AppTitleBar />

      <div v-if="!app.hydrated" class="app-loading">
        <LoaderCircle class="spin" :size="28" />
        <span>正在连接到桌面桥接…</span>
      </div>

      <div v-else-if="!app.bridgeAvailable" class="setup-wrap setup-wrap--preview">
        <div class="browser-preview">
          <InlineNotice
            tone="error"
            message="当前是浏览器预览。请在 Tauri 桌面窗口中运行以调用本机 ASG CLI：npm run tauri dev"
          />
          <SetupView preview />
        </div>
      </div>

      <div v-else class="app-workspace">
        <AppSidebar v-if="showShell" />
        <main class="app-content">
          <RouterView v-if="showShell" v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
          <SetupView v-else />
        </main>
      </div>

      <Transition name="activity">
        <div v-if="jobs.hasRunningOperation" class="activity-strip" role="status">
          <LoaderCircle class="spin" :size="15" />
          <span>{{ jobs.busyLabel }}</span>
          <span class="activity-strip__detail">任务运行中</span>
        </div>
      </Transition>

      <Transition name="activity">
        <InlineNotice
          v-if="quitBlockedMessage"
          class="global-toast"
          tone="error"
          :message="quitBlockedMessage"
          dismissible
          @dismiss="quitBlockedMessage = null"
        />
      </Transition>
    </div>
  </div>
</template>

