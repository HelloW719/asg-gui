<script setup lang="ts">
import { Puzzle, Search } from "@lucide/vue";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui";
import ConfirmDialog from "@/shared/ui/ConfirmDialog.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import SecretDialog from "@/shared/ui/SecretDialog.vue";
import EnginesTab from "./components/EnginesTab.vue";
import ExtensionConfigEditor from "./components/ExtensionConfigEditor.vue";
import ExtensionsTab from "./components/ExtensionsTab.vue";
import { useSources } from "./composables/useSources";

const sources = useSources();
</script>

<template>
  <div class="page sources-page">
    <PageHeader
      eyebrow="能力来源"
      title="引擎与扩展"
      description="扩展仅展示 V2 manifest；后端 setup、配置和卸载均由 CLI 完成。"
    />

    <InlineNotice
      v-if="sources.error.value"
      tone="error"
      :message="sources.error.value"
      dismissible
      @dismiss="sources.error.value = null"
    />
    <InlineNotice
      v-if="sources.success.value"
      tone="success"
      :message="sources.success.value"
      dismissible
      @dismiss="sources.success.value = null"
    />

    <TabsRoot default-value="engines">
      <TabsList class="tab-list glass-surface">
        <TabsTrigger value="engines" class="tab-trigger">
          <Search :size="16" /> 搜索引擎
        </TabsTrigger>
        <TabsTrigger value="extensions" class="tab-trigger">
          <Puzzle :size="16" /> 扩展 V2
        </TabsTrigger>
      </TabsList>

      <TabsContent value="engines" class="tab-content">
        <EnginesTab
          :engines="sources.engines.value"
          :loading="sources.loading.engines"
          :busy="sources.jobs.hasRunningOperation"
          :route-drafts="sources.routeDrafts"
          @refresh="sources.loadEngines"
          @toggle="sources.toggleEngine"
          @route-change="sources.changeSearxngRoute"
          @save-route="sources.saveGatewayRoute"
          @secret="(engine) => (sources.engineSecret.value = engine)"
        />
      </TabsContent>

      <TabsContent value="extensions" class="tab-content">
        <ExtensionsTab
          :repo="sources.extensionRepo.value"
          :query="sources.extensionQuery.value"
          :extensions="sources.extensions.value"
          :results="sources.extensionResults.value"
          :loading="sources.loading.extensions"
          :busy="sources.jobs.hasRunningOperation"
          @install="(repo) => sources.installExtension(repo)"
          @search="sources.searchExtensions"
          @refresh="sources.loadExtensions"
          @setup="sources.runExtensionSetup"
          @configure="(extension) => (sources.configExtension.value = extension)"
          @secret="(extension) => (sources.extensionSecret.value = extension)"
          @remove="(extension) => (sources.extensionToRemove.value = extension)"
          @update:repo="sources.extensionRepo.value = $event"
          @update:query="sources.extensionQuery.value = $event"
        />
      </TabsContent>
    </TabsRoot>

    <ExtensionConfigEditor
      :extension="sources.configExtension.value"
      @close="sources.configExtension.value = null"
      @saved="sources.success.value = `${$event} 配置已保存。`"
    />

    <ConfirmDialog
      :open="Boolean(sources.extensionToRemove.value)"
      :title="`卸载 ${sources.extensionToRemove.value?.id ?? ''}？`"
      description="CLI 会先运行扩展后端的卸载 setup；成功后才删除扩展目录。失败时会保留扩展。"
      confirm-label="卸载"
      destructive
      @update:open="(open) => !open && (sources.extensionToRemove.value = null)"
      @confirm="sources.removeExtension"
    />
    <SecretDialog
      :open="Boolean(sources.engineSecret.value)"
      :title="`更新 ${sources.engineSecret.value?.name ?? ''} 密钥`"
      :description="sources.engineSecret.value?.requires?.join(' · ') ?? ''"
      :secret-names="sources.engineSecret.value?.requires"
      @update:open="(open) => !open && (sources.engineSecret.value = null)"
      @submit="sources.saveEngineSecret"
    />
    <SecretDialog
      :open="Boolean(sources.extensionSecret.value)"
      :title="`更新 ${sources.extensionSecret.value?.id ?? ''} 密钥`"
      description="密钥名由扩展定义；值只通过 stdin 发送。"
      editable-name
      @update:open="(open) => !open && (sources.extensionSecret.value = null)"
      @submit="sources.saveExtensionSecret"
    />
  </div>
</template>

<style src="./styles/sources.css"></style>
