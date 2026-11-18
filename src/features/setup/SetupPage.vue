<script setup lang="ts">
import { ref } from "vue";
import { FolderSearch, Link2, ShieldCheck } from "@lucide/vue";
import { useSessionStore } from "@/stores/session";
import InlineNotice from "@/shared/ui/InlineNotice.vue";

const session = useSessionStore();
const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false });
const manualPath = ref("");
const checking = ref(false);
const error = ref<string | null>(null);

async function choose(): Promise<void> {
  checking.value = true;
  error.value = null;
  try {
    const selection = await session.chooseRoot();
    if (selection && !selection.valid) error.value = selection.reason ?? "目录校验失败。";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    checking.value = false;
  }
}

async function usePath(): Promise<void> {
  if (!manualPath.value.trim()) return;
  checking.value = true;
  error.value = null;
  try {
    const selection = await session.chooseRootPath(manualPath.value.trim());
    if (!selection.valid) error.value = selection.reason ?? "目录校验失败。";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    checking.value = false;
  }
}
</script>

<template>
  <div class="setup-view">
    <section class="setup-hero">
      <div class="setup-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span class="eyebrow">独立桌面控制面</span>
      <h1>连接你的 ASG 安装</h1>
      <p>
        GUI 只读取安装目录中的 CLI 入口，并通过结构化输出管理系统。配置文件、密钥、进程和日志仍由同一个
        <code>asg</code> 入口管理。
      </p>
      <button class="button button--primary button--large" type="button" :disabled="checking || props.preview" @click="choose">
        <FolderSearch :size="19" />
        选择 ASG 安装目录
      </button>
    </section>

    <aside class="setup-card glass-surface">
      <div class="setup-card__item">
        <Link2 :size="20" />
        <div>
          <h2>稳定的 CLI 入口</h2>
          <p>需要 <code>bin/asg.mjs</code>、<code>gateway.yaml</code> 与安装器准备的本地 Node。</p>
        </div>
      </div>
      <div class="setup-card__item">
        <ShieldCheck :size="20" />
        <div>
          <h2>密钥不经过界面留存</h2>
          <p>需要写入密钥时，GUI 只会通过 stdin 发送一次，不写入应用配置或日志。</p>
        </div>
      </div>

      <div class="divider" />

      <label class="field">
        <span>已有安装路径</span>
        <div class="inline-field">
          <input
            v-model="manualPath"
            type="text"
            placeholder="例如 D:\AgentSearchGateway"
            autocomplete="off"
            @keydown.enter.prevent="usePath"
          />
          <button class="button button--secondary" type="button" :disabled="!manualPath.trim() || checking || props.preview" @click="usePath">
            连接
          </button>
        </div>
      </label>
      <p v-if="session.invalidReason && !error" class="field-note">{{ session.invalidReason }}</p>
      <InlineNotice v-if="error" tone="error" :message="error" />
    </aside>
  </div>
</template>

