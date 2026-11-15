import { describe, expect, it } from "vitest";
import { isCliResult, parseNdjson } from "./cli";

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

  it("parses complete NDJSON records and preserves malformed lines", () => {
    const values = parseNdjson(
      '{"type":"event","event":"log","line":"a"}\nnot-json\n\n{"schema_version":1,"ok":true,"command":"logs"}',
    );
    expect(values).toHaveLength(3);
    expect(values[1]).toBe("not-json");
  });
});

