<script setup lang="ts">
import { computed } from "vue";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Network,
  Search,
  ShieldCheck,
} from "@lucide/vue";
import type { ServiceProbe } from "@/types/cli";

const props = defineProps<{
  name: string;
  displayName: string;
  probe: ServiceProbe;
}>();

const statusText = computed(() => (props.probe.up ? "可达" : "不可达"));

const uptimeText = computed(() => {
  const seconds = props.probe.uptime_s;
  if (seconds === undefined) return null;
  if (seconds >= 86_400) return `${Math.floor(seconds / 86_400)} 天`;
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)} 小时`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} 分钟`;
  return `${Math.floor(seconds)} 秒`;
});
</script>

<template>
  <article
    class="service-card"
    :class="[
      `service-card--${name}`,
      { 'service-card--down': !probe.up },
    ]"
    :aria-label="`${displayName}，${statusText}`"
  >
    <header class="service-card__heading">
      <span class="service-card__icon" aria-hidden="true">
        <Network v-if="name === 'gateway'" :size="22" :stroke-width="1.8" />
        <Search v-else-if="name === 'searxng'" :size="22" :stroke-width="1.8" />
        <ShieldCheck v-else :size="22" :stroke-width="1.8" />
      </span>
      <div class="service-card__identity">
        <h3>{{ displayName }}</h3>
        <span class="service-card__label">{{ name }}</span>
      </div>
      <span class="service-card__state" role="status">
        <CircleCheck v-if="probe.up" :size="16" :stroke-width="2" />
        <CircleX v-else :size="16" :stroke-width="2" />
        {{ statusText }}
      </span>
    </header>

    <div class="service-card__latency">
      <span>响应延迟</span>
      <div>
        <strong>{{ probe.latency_ms ?? "—" }}</strong>
        <small v-if="probe.latency_ms !== undefined">ms</small>
      </div>
    </div>

    <dl class="service-card__meta">
      <div>
        <dt>版本</dt>
        <dd>{{ probe.version ?? "未提供" }}</dd>
      </div>
      <div>
        <dt>可用时长</dt>
        <dd>{{ uptimeText ?? "未提供" }}</dd>
      </div>
    </dl>

    <p v-if="probe.error" class="service-card__error" :title="probe.error">
      <CircleAlert :size="15" :stroke-width="1.8" aria-hidden="true" />
      {{ probe.error }}
    </p>
  </article>
</template>

