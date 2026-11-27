import { describe, expect, it } from "vitest";
import {
  commandTextResultFromError,
  isAdlistUpdateResult,
  isCliResult,
  isConfigMutationResult,
  isConfigValidationResult,
  isEngineSecretRequirement,
  isExtensionConfigFieldsResult,
  isExtensionConfigResult,
  isExtensionOperationResult,
  isJobEvent,
  isLifecycleResult,
  isLogFollowResult,
  isLogCliEvent,
  isSearxngApiKeyRequirement,
  isStackStatus,
  isUpdateApplyStatus,
  parseCliData,
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

  it("recognizes current engine secret requirement forms", () => {
    expect(isSearxngApiKeyRequirement("searxng.engines.exaapi.api_key")).toBe(
      true,
    );
    expect(
      isSearxngApiKeyRequirement("searxng.engines.zhihu web.api_key"),
    ).toBe(true);
    expect(isSearxngApiKeyRequirement("config:extensions.demo.enabled")).toBe(
      false,
    );
    expect(isEngineSecretRequirement("secrets.search.deepseek.api_key")).toBe(
      true,
    );
    expect(isEngineSecretRequirement("secret:cookie")).toBe(true);
    expect(isEngineSecretRequirement("searxng.engines.tavily.api_key")).toBe(
      true,
    );
    expect(isEngineSecretRequirement("config:extensions.demo.enabled")).toBe(
      false,
    );
  });

  it("parses complete NDJSON records and preserves malformed lines", () => {
    const values = parseNdjson(
      '{"type":"event","event":"log","line":"a"}\nnot-json\n\n{"schema_version":1,"ok":true,"command":"logs"}',
    );
    expect(values).toHaveLength(3);
    expect(values[1]).toBe("not-json");
  });

  it("rejects an event whose CLI schema version is unknown", () => {
    expect(
      isJobEvent({
        jobId: "job-1",
        kind: "stdout",
        data: {
          type: "event",
          schema_version: 2,
          event: "log",
          service: "gateway",
          line: "ignored",
        },
      }),
    ).toBe(false);
    expect(
      isLogCliEvent({
        type: "event",
        schema_version: 2,
        event: "log",
        service: "gateway",
        line: "ignored",
      }),
    ).toBe(false);
  });

  it("accepts only contract-complete stack status data", () => {
    expect(
      isStackStatus({
        services: {
          gateway: { up: true },
          searxng: { up: false, error: "ECONNREFUSED" },
          flaresolverr: { up: true },
        },
        supervisor: { managed: true, mode: "schtasks", active: true },
      }),
    ).toBe(true);
    expect(
      isStackStatus({
        services: {
          gateway: { up: true },
          searxng: { up: false },
          flaresolverr: { up: true },
        },
        supervisor: { managed: true, mode: "schtasks", active: true },
      }),
    ).toBe(false);
    expect(
      isStackStatus({
        services: {
          gateway: { up: true },
          searxng: { up: true },
          flaresolverr: { up: true },
        },
        supervisor: { managed: true, mode: ["pid"], active: true },
      }),
    ).toBe(false);
  });

  it("throws when a successful command returns a different data shape", () => {
    const parseStatus = parseCliData("status", isStackStatus);
    expect(() => parseStatus({ services: {} })).toThrow(
      "ASG status 返回的数据不符合 schema_version 1 契约",
    );
  });

  it("requires complete extension config read and describe responses", () => {
    expect(isExtensionConfigResult({})).toBe(false);
    expect(
      isExtensionConfigResult({
        id: "demo",
        fields: [],
      }),
    ).toBe(false);
    expect(
      isExtensionConfigResult({
        id: "demo",
        config: {},
        valid: false,
      }),
    ).toBe(false);
    expect(
      isExtensionConfigResult({
        id: "demo",
        config: {},
        valid: false,
        error: "invalid config",
      }),
    ).toBe(true);
    expect(isExtensionConfigFieldsResult({ id: "demo" })).toBe(false);
    expect(
      isExtensionConfigFieldsResult({
        id: "demo",
        config: {},
      }),
    ).toBe(false);
    expect(
      isExtensionConfigFieldsResult({
        id: "demo",
        fields: [],
      }),
    ).toBe(true);
  });

  it("preserves structured mutation and validation status", () => {
    expect(
      isConfigValidationResult({
        valid: true,
        warnings: ["deprecated option"],
      }),
    ).toBe(true);
    expect(
      isConfigMutationResult({
        changed: ["gateway.port"],
        restart: "all",
        restarted: true,
      }),
    ).toBe(true);
    expect(
      isAdlistUpdateResult({
        level: "off",
        entries: 0,
        path: "/data/adblock/hosts",
        restart: "all",
        restarted: false,
      }),
    ).toBe(true);
    expect(
      isUpdateApplyStatus({
        action: "apply",
        version: null,
        restarted: false,
      }),
    ).toBe(true);
    expect(
      isExtensionOperationResult({
        id: "demo-fetch",
        plugin_id: "demo-fetch",
        backend_ids: ["api"],
        restarted: false,
      }),
    ).toBe(true);
    expect(
      isLifecycleResult({
        state: "started",
        supervisor: {
          managed: true,
          mode: "schtasks",
          active: true,
        },
      }),
    ).toBe(true);
    expect(
      isLifecycleResult({
        state: "started",
      }),
    ).toBe(false);
    expect(isLogFollowResult({ streamed: true, services: [] })).toBe(true);
    expect(isLogFollowResult({ streamed: false, services: [] })).toBe(false);
  });
});

