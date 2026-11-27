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
        <InlineNotice
          v-if="explorer.searchError.value"
          tone="error"
          :message="explorer.searchError.value"
          dismissible
          @dismiss="explorer.searchError.value = null"
        />
        <SearchFormPanel
          :form="explorer.searchForm"
          :busy="explorer.jobs.hasRunningOperation"
          @submit="explorer.search"
          @choose-image="explorer.chooseImage"
        />
        <ExplorerResult
          :text="explorer.searchResultText.value"
          :meta="explorer.searchResultMeta.value"
          title="搜索结果"
        />
      </TabsContent>

      <TabsContent value="fetch" class="tab-content">
        <InlineNotice
          v-if="explorer.fetchError.value"
          tone="error"
          :message="explorer.fetchError.value"
          dismissible
          @dismiss="explorer.fetchError.value = null"
        />
        <FetchFormPanel
          :form="explorer.fetchForm"
          :busy="explorer.jobs.hasRunningOperation"
          @submit="explorer.fetchPage"
        />
        <ExplorerResult
          :text="explorer.fetchResultText.value"
          :meta="explorer.fetchResultMeta.value"
          title="抓取结果"
        />
      </TabsContent>
    </TabsRoot>
  </div>
</template>

<style src="./styles/explorer.css"></style>
