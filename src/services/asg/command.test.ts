import { describe, expect, it } from "vitest";
import { AsgCommandError } from "./command";

describe("AsgCommandError", () => {
  it("retains structured command data for failed data-plane calls", () => {
    const error = new AsgCommandError(
      { code: "SEARCH_UPSTREAM", message: "upstream failed" },
      "search",
      "搜索失败。",
      {
        tool: "search",
        text: "[SEARCH_UPSTREAM] upstream failed",
      },
    );

    expect(error).toMatchObject({
      code: "SEARCH_UPSTREAM",
      command: "search",
      message: "upstream failed",
      data: {
        tool: "search",
        text: "[SEARCH_UPSTREAM] upstream failed",
      },
    });
  });
});
