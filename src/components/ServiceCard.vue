<script setup lang="ts">
import { computed } from "vue";
import { CircleCheck, CircleX, Gauge } from "@lucide/vue";
import type { ServiceProbe } from "../types/cli";

const props = defineProps<{
  name: string;
  displayName: string;
  probe: ServiceProbe;
}>();

const statusText = computed(() => (props.probe.up ? "可达" : "不可达"));
</script>

<template>
  <article class="service-card" :class="{ 'service-card--down': !probe.up }">
    <div class="service-card__heading">
      <div>
        <span class="eyebrow">{{ name }}</span>
        <h3>{{ displayName }}</h3>
      </div>
      <span class="service-card__state">
        <CircleCheck v-if="probe.up" :size="18" />
        <CircleX v-else :size="18" />
        {{ statusText }}
      </span>
    </div>
    <dl class="service-card__meta">
      <div>
        <dt><Gauge :size="14" /> 延迟</dt>
        <dd>{{ probe.latency_ms !== undefined ? `${probe.latency_ms} ms` : "—" }}</dd>
      </div>
      <div v-if="probe.version">
        <dt>版本</dt>
        <dd>{{ probe.version }}</dd>
      </div>
      <div v-if="probe.error">
        <dt>错误</dt>
        <dd :title="probe.error">{{ probe.error }}</dd>
      </div>
    </dl>
  </article>
</template>

