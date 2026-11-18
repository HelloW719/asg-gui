<script setup lang="ts">
import { Minus, Moon, Square, Sun, X } from "@lucide/vue";
import {
  closeWindow,
  minimizeWindow,
  toggleMaximizeWindow,
} from "@/services/desktop";
import { useAppearanceStore } from "@/stores/appearance";
import { useSessionStore } from "@/stores/session";

const session = useSessionStore();
const appearance = useAppearanceStore();

async function minimize(): Promise<void> {
  await minimizeWindow();
}

async function maximize(): Promise<void> {
  await toggleMaximizeWindow();
}

async function close(): Promise<void> {
  await closeWindow();
}
</script>

<template>
  <header class="app-titlebar" data-tauri-drag-region>
    <div class="app-titlebar__identity" data-tauri-drag-region>
      <span class="app-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span class="app-titlebar__name">Agent Search Gateway</span>
      <span class="app-titlebar__version">{{ session.guiVersion }}</span>
    </div>

    <div class="app-titlebar__actions">
      <button
        class="icon-button titlebar-tool"
        type="button"
        :aria-label="appearance.resolvedTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
        @click="appearance.toggleTheme"
      >
        <Sun v-if="appearance.resolvedTheme === 'dark'" :size="16" />
        <Moon v-else :size="16" />
      </button>
      <div v-if="session.platform !== 'macos'" class="window-controls">
        <button type="button" aria-label="最小化" @click="minimize">
          <Minus :size="16" />
        </button>
        <button type="button" aria-label="最大化" @click="maximize">
          <Square :size="13" />
        </button>
        <button class="window-controls__close" type="button" aria-label="关闭" @click="close">
          <X :size="16" />
        </button>
      </div>
    </div>
  </header>
</template>

