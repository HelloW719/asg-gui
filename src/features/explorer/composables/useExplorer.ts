import { reactive, ref } from "vue";
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
  const resultText = ref("");
  const resultMeta = ref("");
  const error = ref<string | null>(null);

  function applyResult(data: CommandTextResult): void {
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
    error.value = null;
    resultText.value = "";
    resultMeta.value = "";
    if (
      !searchForm.query.trim() &&
      !searchForm.imagePath?.trim() &&
      !searchForm.categories?.trim()
    ) {
      error.value = "请输入查询词，或者提供图片或类别。";
      return;
    }
    try {
      applyResult(await serviceClient.explorer.search(searchForm));
    } catch (cause) {
      const failedResult = commandTextResultFromError(cause);
      if (failedResult) applyResult(failedResult);
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function fetchPage(): Promise<void> {
    error.value = null;
    resultText.value = "";
    resultMeta.value = "";
    if (!fetchForm.url.trim()) {
      error.value = "请输入 http/https URL。";
      return;
    }
    try {
      applyResult(await serviceClient.explorer.fetch(fetchForm));
    } catch (cause) {
      const failedResult = commandTextResultFromError(cause);
      if (failedResult) applyResult(failedResult);
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  return {
    jobs,
    searchForm,
    fetchForm,
    resultText,
    resultMeta,
    error,
    chooseImage,
    search,
    fetchPage,
  };
}
