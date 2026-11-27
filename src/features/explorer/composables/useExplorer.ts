import { reactive, ref, type Ref } from "vue";
import { useDesktopIntegration } from "@/app/useDesktopIntegration";
import { useAsgServices } from "@/app/useAsgServices";
import { useJobsStore } from "@/stores/jobs";
import type { CommandTextResult } from "@/types/cli";
import type { FetchForm, SearchForm } from "@/utils/args";
import { commandTextResultFromError } from "@/utils/cli";

export function useExplorer() {
  const jobs = useJobsStore();
  const serviceClient = useAsgServices();
  const desktop = useDesktopIntegration();
  const searchForm = reactive<SearchForm>({
    query: "",
    categories: "",
    engines: "",
    language: "",
    safesearch: "",
    numResults: "",
    fanout: "",
    minScore: "",
    imagePath: "",
    timeout: "",
  });
  const fetchForm = reactive<FetchForm>({
    url: "",
    render: "auto",
    maxChars: "",
    timeout: "",
  });
  const searchResultText = ref("");
  const searchResultMeta = ref("");
  const fetchResultText = ref("");
  const fetchResultMeta = ref("");
  const searchError = ref<string | null>(null);
  const fetchError = ref<string | null>(null);

  function applyResult(
    resultText: Ref<string>,
    resultMeta: Ref<string>,
    data: CommandTextResult,
  ): void {
    if (data.text) resultText.value = data.text;
    resultMeta.value = [
      data.elapsed_ms !== undefined ? `${data.elapsed_ms} ms` : "",
      data.code ? `错误码 ${data.code}` : "调用成功",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  async function chooseImage(): Promise<void> {
    const selected = await desktop.chooseImageFile();
    if (selected) searchForm.imagePath = selected;
  }

  async function search(): Promise<void> {
    searchError.value = null;
    searchResultText.value = "";
    searchResultMeta.value = "";
    if (
      !searchForm.query.trim() &&
      !searchForm.imagePath?.trim() &&
      !searchForm.categories?.trim()
    ) {
      searchError.value = "请输入查询词，或者提供图片或类别。";
      return;
    }
    try {
      applyResult(
        searchResultText,
        searchResultMeta,
        await serviceClient.explorer.search(searchForm),
      );
    } catch (cause) {
      const failedResult = commandTextResultFromError(cause);
      if (failedResult) {
        applyResult(searchResultText, searchResultMeta, failedResult);
      }
      searchError.value =
        cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function fetchPage(): Promise<void> {
    fetchError.value = null;
    fetchResultText.value = "";
    fetchResultMeta.value = "";
    if (!fetchForm.url.trim()) {
      fetchError.value = "请输入 http/https URL。";
      return;
    }
    try {
      applyResult(
        fetchResultText,
        fetchResultMeta,
        await serviceClient.explorer.fetch(fetchForm),
      );
    } catch (cause) {
      const failedResult = commandTextResultFromError(cause);
      if (failedResult) {
        applyResult(fetchResultText, fetchResultMeta, failedResult);
      }
      fetchError.value =
        cause instanceof Error ? cause.message : String(cause);
    }
  }

  return {
    jobs,
    searchForm,
    fetchForm,
    searchResultText,
    searchResultMeta,
    fetchResultText,
    fetchResultMeta,
    searchError,
    fetchError,
    chooseImage,
    search,
    fetchPage,
  };
}
