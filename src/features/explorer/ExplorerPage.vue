<script setup lang="ts">
import { Globe2, Search } from "@lucide/vue";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import PageHeader from "@/shared/ui/PageHeader.vue";
import ExplorerResult from "./components/ExplorerResult.vue";
import FetchFormPanel from "./components/FetchFormPanel.vue";
import SearchFormPanel from "./components/SearchFormPanel.vue";
import { useExplorer } from "./composables/useExplorer";

const explorer = useExplorer();
</script>

<template>
  <div class="page">
    <PageHeader
      title="检索与抓取"
      index="02"
      label="SEARCH"
      description="调用运行中的 gateway，不修改配置，也不会重启服务。"
    />

    <InlineNotice
      v-if="explorer.error.value"
      tone="error"
      :message="explorer.error.value"
      dismissible
      @dismiss="explorer.error.value = null"
    />

    <TabsRoot default-value="search" class="explorer-tabs">
      <TabsList class="tab-list glass-surface" aria-label="检索模式">
        <TabsTrigger value="search" class="tab-trigger">
          <Search :size="16" />
          搜索
        </TabsTrigger>
        <TabsTrigger value="fetch" class="tab-trigger">
          <Globe2 :size="16" />
          抓取
        </TabsTrigger>
      </TabsList>

      <TabsContent value="search" class="tab-content">
        <SearchFormPanel
          :form="explorer.searchForm"
          :busy="explorer.jobs.hasRunningOperation"
          @submit="explorer.search"
          @choose-image="explorer.chooseImage"
        />
        <ExplorerResult
          :text="explorer.resultText.value"
          :meta="explorer.resultMeta.value"
          title="搜索结果"
        />
      </TabsContent>

      <TabsContent value="fetch" class="tab-content">
        <FetchFormPanel
          :form="explorer.fetchForm"
          :busy="explorer.jobs.hasRunningOperation"
          @submit="explorer.fetchPage"
        />
        <ExplorerResult
          :text="explorer.resultText.value"
          :meta="explorer.resultMeta.value"
          title="抓取结果"
        />
      </TabsContent>
    </TabsRoot>
  </div>
</template>

<style src="./styles/explorer.css"></style>
