import { describe, expect, it } from "vitest";
import { buildFetchArgs, buildSearchArgs } from "./args";

describe("CLI argument builders", () => {
  it("keeps a spaced search query as one argv value", () => {
    expect(buildSearchArgs({ query: "rust async runtime", fanout: "2" })).toEqual([
      "search",
      "rust async runtime",
      "--fanout",
      "2",
    ]);
  });

  it("omits empty optional values", () => {
    expect(
      buildSearchArgs({
        query: "vue",
        categories: " ",
        engines: "",
        timeout: "",
      }),
    ).toEqual(["search", "vue"]);
  });

  it("never treats a key value as part of an argument string", () => {
    const args = buildFetchArgs({
      url: "https://example.com/a;touch-pwned",
      render: "always",
      maxChars: "4000",
    });
    expect(args).toEqual([
      "fetch",
      "https://example.com/a;touch-pwned",
      "--render",
      "always",
      "--max-chars",
      "4000",
    ]);
    expect(args).toHaveLength(6);
  });
});

