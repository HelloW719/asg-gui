<script setup lang="ts">
import SectionHeading from "@/shared/ui/SectionHeading.vue";
import ServiceCard from "./ServiceCard.vue";
import type { DashboardServiceCard } from "../composables/useDashboard";

defineProps<{
  services: DashboardServiceCard[];
}>();
</script>

<template>
  <section class="section-block">
    <SectionHeading eyebrow="服务探针" title="整栈组件">
      <span class="muted-copy">生命周期始终作用于整栈</span>
    </SectionHeading>
    <div class="service-grid">
      <ServiceCard
        v-for="service in services"
        :key="service.name"
        :name="service.name"
        :display-name="service.displayName"
        :probe="service.probe"
      />
    </div>
  </section>
</template>
