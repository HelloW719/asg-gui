<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { LoaderCircle } from "@lucide/vue";
import { useAppBootstrap } from "@/app/useAppBootstrap";
import { useAppStatus } from "@/app/useAppStatus";
import AppSidebar from "@/app/components/AppSidebar.vue";
import AppTitleBar from "@/app/components/AppTitleBar.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import GlassShell from "@/visual/glass/GlassShell.vue";
import SetupPage from "@/features/setup/SetupPage.vue";
import { useAppearanceStore } from "@/stores/appearance";
import { useJobsStore } from "@/stores/jobs";
import { useSessionStore } from "@/stores/session";

const session = useSessionStore();
const appearance = useAppearanceStore();
const jobs = useJobsStore();
const appStatus = useAppStatus();
const router = useRouter();
const quitBlockedMessage = ref<string | null>(null);

const showShell = computed(() => session.rootValid);

useAppBootstrap({
  onNavigate: (route) => {
    void router.push(route);
  },
  onQuitBlocked: (message) => {
    quitBlockedMessage.value = message;
  },
});
</script>

<template>
  <div class="app-root">
    <GlassShell
      :visual-state="appStatus.visualState.value"
      :theme="appearance.resolvedTheme"
      :reduced-motion="appearance.reducedMotion"
      :frame-rate="appearance.glassFrameRate"
    >
      <div class="app-frame">
        <AppTitleBar />

        <div v-if="!session.hydrated" class="app-loading">
          <LoaderCircle class="spin" :size="28" />
          <span>正在连接到桌面桥接…</span>
        </div>

        <div v-else-if="!session.bridgeAvailable" class="setup-wrap setup-wrap--preview">
          <div class="browser-preview">
            <InlineNotice
              tone="error"
              message="当前是浏览器预览。请在 Tauri 桌面窗口中运行以调用本机 ASG CLI：npm run tauri dev"
            />
            <SetupPage preview />
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
            <SetupPage v-else />
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
    </GlassShell>
  </div>
</template>

