import type { CommandTextResult } from "../../types/cli";
import { buildFetchArgs, buildSearchArgs, type FetchForm, type SearchForm } from "../../utils/args";
import { isCommandTextResult, parseCliData } from "../../utils/cli";
import type { AsgCommandRunner } from "./command";

export function createExplorerService(runner: AsgCommandRunner) {
  return {
    search(form: SearchForm): Promise<CommandTextResult> {
      return runner.run(
        buildSearchArgs(form),
        {
          label: "执行搜索",
          visualState: "loading",
        },
        parseCliData("search", isCommandTextResult),
      );
    },

    fetch(form: FetchForm): Promise<CommandTextResult> {
      return runner.run(
        buildFetchArgs(form),
        {
          label: "执行抓取",
          visualState: "loading",
        },
        parseCliData("fetch", isCommandTextResult),
      );
    },
  };
}
