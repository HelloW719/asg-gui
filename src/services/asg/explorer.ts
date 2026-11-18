import type { CommandTextResult } from "../../types/cli";
import { buildFetchArgs, buildSearchArgs, type FetchForm, type SearchForm } from "../../utils/args";
import type { AsgCommandRunner } from "./command";

export function createExplorerService(runner: AsgCommandRunner) {
  return {
    search(form: SearchForm): Promise<CommandTextResult> {
      return runner.run<CommandTextResult>(buildSearchArgs(form), {
        label: "执行搜索",
        visualState: "loading",
      });
    },

    fetch(form: FetchForm): Promise<CommandTextResult> {
      return runner.run<CommandTextResult>(buildFetchArgs(form), {
        label: "执行抓取",
        visualState: "loading",
      });
    },
  };
}
