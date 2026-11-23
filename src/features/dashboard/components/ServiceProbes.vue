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
    <SectionHeading title="整栈组件" />
    <m3e-card class="service-board" variant="filled">
      <div slot="content" class="service-grid">
        <ServiceCard
          v-for="service in services"
          :key="service.name"
          :name="service.name"
          :display-name="service.displayName"
          :probe="service.probe"
        />
      </div>
    </m3e-card>
  </section>
</template>
