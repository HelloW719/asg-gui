<script setup lang="ts">
import {
  CheckCircle2,
  ShieldCheck,
  Terminal,
} from "@lucide/vue";
import WelcomeStepLead from "./WelcomeStepLead.vue";
import type { WelcomeWizard } from "../useWelcomeWizard";

const props = defineProps<{ wizard: WelcomeWizard }>();
const wizard = props.wizard;
</script>

<template>
  <WelcomeStepLead
    eyebrow="01 · CONNECT"
    title="ASG 安装已就绪"
    description="GUI 只使用安装根中的稳定入口。接下来会读取现有引擎和密钥需求，再让你确认要启用的能力。"
    outcome="进入搜索能力选择，已有配置会作为默认值载入。"
  />

  <section
    class="welcome-connection-status"
    aria-labelledby="welcome-install-status-title"
  >
    <span class="welcome-feature-icon" aria-hidden="true">
      <Terminal :size="22" />
    </span>
    <div class="welcome-connection-status__copy">
      <div class="welcome-connection-status__title">
        <strong id="welcome-install-status-title">安装根有效</strong>
        <span class="token token--ok">已连接</span>
      </div>
      <code class="path-copy">{{ wizard.session.root }}</code>
      <p>启动时已自动校验 CLI 入口，无需手动启动服务。</p>
    </div>
  </section>

  <div class="welcome-readiness-list" aria-label="安全与连接方式">
    <div>
      <CheckCircle2 :size="17" aria-hidden="true" />
      <span>
        <strong>固定 CLI 边界</strong>
        <small>业务操作通过参数数组交给 ASG CLI。</small>
      </span>
    </div>
    <div>
      <ShieldCheck :size="17" aria-hidden="true" />
      <span>
        <strong>密钥只走 stdin</strong>
        <small>敏感值不会进入命令行参数、日志或持久页面状态。</small>
      </span>
    </div>
    <div>
      <CheckCircle2 :size="17" aria-hidden="true" />
      <span>
        <strong>可随时返回</strong>
        <small>读取过的步骤可以重新打开，可选步骤不会阻止完成。</small>
      </span>
    </div>
  </div>
</template>
