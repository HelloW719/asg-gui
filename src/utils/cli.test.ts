import { describe, expect, it } from "vitest";
import {
  commandTextResultFromError,
  isCliResult,
  parseNdjson,
} from "./cli";

describe("CLI output helpers", () => {
  it("parses a valid schema version 1 result", () => {
    expect(
      isCliResult({
        schema_version: 1,
        ok: true,
        command: "status",
        data: {},
      }),
    ).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    expect(
      isCliResult({
        schema_version: 2,
        ok: true,
        command: "status",
      }),
    ).toBe(false);
  });

  it("requires error data on failed command results", () => {
    expect(
      isCliResult({
        schema_version: 1,
        ok: false,
        command: "config.set",
        error: { code: "CONFIG_INVALID", message: "invalid" },
      }),
    ).toBe(true);
    expect(
      isCliResult({
        schema_version: 1,
        ok: false,
        command: "config.set",
      }),
    ).toBe(false);
  });

  it("preserves data attached to a structured command error", () => {
    const error = Object.assign(new Error("upstream failed"), {
      data: {
        tool: "search",
        endpoint: "http://127.0.0.1:3000/mcp",
        elapsed_ms: 12,
        ok: false,
        code: "SEARCH_UPSTREAM",
        text: "[SEARCH_UPSTREAM] unavailable",
      },
    });

    expect(commandTextResultFromError(error)).toMatchObject({
      tool: "search",
      code: "SEARCH_UPSTREAM",
      text: "[SEARCH_UPSTREAM] unavailable",
    });
  });

  it("parses complete NDJSON records and preserves malformed lines", () => {
    const values = parseNdjson(
      '{"type":"event","event":"log","line":"a"}\nnot-json\n\n{"schema_version":1,"ok":true,"command":"logs"}',
    );
    expect(values).toHaveLength(3);
    expect(values[1]).toBe("not-json");
  });
});

