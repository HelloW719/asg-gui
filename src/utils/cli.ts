import type {
  BrowserInstallStatus,
  BrowserStatus,
  CliErrorPayload,
  CliEvent,
  CliResult,
  CommandTextResult,
  ConfigFieldInfo,
  DoctorCheck,
  EngineInfo,
  ExtensionBackendInfo,
  ExtensionFetchChannelInfo,
  ExtensionInfo,
  ExtensionSearchEngineInfo,
  ExtensionSearchItem,
  JobEvent,
  LogCliEvent,
  LogLine,
  ProgressCliEvent,
  StackStatus,
  UpdateCheckStatus,
} from "../types/cli";

export type CliDataGuard<T> = (value: unknown) => value is T;

export type LogReadResult = {
  lines: LogLine[];
};

export type DoctorResult = {
  checks: DoctorCheck[];
};

export type EnginesResult = {
  engines: EngineInfo[];
};

export type ExtensionsResult = {
  extensions: ExtensionInfo[];
};

export type ExtensionSearchResult = {
  results: ExtensionSearchItem[];
};

export type ExtensionConfigResult = {
  config?: Record<string, unknown>;
};

export type ExtensionConfigFieldsResult = {
  fields?: ConfigFieldInfo[];
};

export function parseCliData<T>(
  command: string,
  guard: CliDataGuard<T>,
): (value: unknown) => T {
  return (value) => {
    if (!guard(value)) {
      throw new Error(`ASG ${command} 返回的数据不符合 schema_version 1 契约。`);
    }
    return value;
  };
}

export function parseVoidData(_value: unknown): void {}

export function cliData<T>(result: CliResult, guard: CliDataGuard<T>): T | null {
  return result.ok && guard(result.data) ? result.data : null;
}

export function formatCliError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function parseNdjson(jsonl: string): unknown[] {
  return jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return line;
      }
    });
}

export function isCliResult(value: unknown): value is CliResult<unknown> {
  if (!isRecord(value)) return false;
  const record = value;
  if (
    record.schema_version !== 1 ||
    typeof record.ok !== "boolean" ||
    typeof record.command !== "string"
  ) {
    return false;
  }

  if (record.ok) {
    return record.data !== undefined && record.error === undefined;
  }
  return isCliErrorPayload(record.error);
}

export function isCliErrorPayload(value: unknown): value is CliErrorPayload {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

export function isCommandTextResult(value: unknown): value is CommandTextResult {
  if (!isRecord(value)) return false;
  return (
    (value.tool === "search" || value.tool === "fetch") &&
    typeof value.endpoint === "string" &&
    typeof value.elapsed_ms === "number" &&
    typeof value.ok === "boolean" &&
    (value.code === null || typeof value.code === "string") &&
    typeof value.text === "string" &&
    (value.render === undefined ||
      value.render === "auto" ||
      value.render === "always" ||
      value.render === "never")
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isLogLine(value: unknown): value is LogLine {
  return (
    isRecord(value) &&
    typeof value.service === "string" &&
    typeof value.line === "string" &&
    isOptionalString(value.at)
  );
}

export function isLogReadResult(value: unknown): value is LogReadResult {
  return isRecord(value) && isArrayOf(value.lines, isLogLine);
}

function isServiceProbe(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.up === "boolean" &&
    isOptionalNumber(value.latency_ms) &&
    isOptionalString(value.version) &&
    isOptionalNumber(value.uptime_s) &&
    isOptionalString(value.error) &&
    (value.up || typeof value.error === "string")
  );
}

export function isStackStatus(value: unknown): value is StackStatus {
  if (!isRecord(value) || !isRecord(value.services) || !isRecord(value.supervisor)) {
    return false;
  }
  return (
    isServiceProbe(value.services.gateway) &&
    isServiceProbe(value.services.searxng) &&
    isServiceProbe(value.services.flaresolverr) &&
    typeof value.supervisor.managed === "boolean" &&
    typeof value.supervisor.active === "boolean" &&
    typeof value.supervisor.mode === "string" &&
    ["systemd", "launchd", "schtasks", "pid", "none"].includes(
      value.supervisor.mode,
    )
  );
}

export function isDoctorResult(value: unknown): value is DoctorResult {
  return isRecord(value) && isArrayOf(value.checks, isDoctorCheck);
}

export function isBrowserStatus(value: unknown): value is BrowserStatus {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    typeof value.headless_shell === "boolean" &&
    typeof value.chromium === "boolean"
  );
}

export function isBrowserInstallStatus(
  value: unknown,
): value is BrowserInstallStatus {
  return (
    isBrowserStatus(value) &&
    "full" in value &&
    typeof value.full === "boolean"
  );
}

export function isUpdateCheckStatus(
  value: unknown,
): value is UpdateCheckStatus {
  return (
    isRecord(value) &&
    value.action === "check" &&
    (value.version === null || typeof value.version === "string") &&
    typeof value.restarted === "boolean" &&
    (value.current_version === undefined ||
      value.current_version === null ||
      typeof value.current_version === "string") &&
    (value.up_to_date === undefined || typeof value.up_to_date === "boolean")
  );
}

export function isEnginesResult(value: unknown): value is EnginesResult {
  return isRecord(value) && isArrayOf(value.engines, isEngineInfo);
}

export function isExtensionsResult(
  value: unknown,
): value is ExtensionsResult {
  return isRecord(value) && isArrayOf(value.extensions, isExtensionInfo);
}

export function isExtensionSearchResult(
  value: unknown,
): value is ExtensionSearchResult {
  return isRecord(value) && isArrayOf(value.results, isExtensionSearchItem);
}

export function isExtensionConfigResult(
  value: unknown,
): value is ExtensionConfigResult {
  return (
    isRecord(value) &&
    (value.config === undefined || isRecord(value.config))
  );
}

export function isExtensionConfigFieldsResult(
  value: unknown,
): value is ExtensionConfigFieldsResult {
  return (
    isRecord(value) &&
    (value.fields === undefined || isArrayOf(value.fields, isConfigFieldInfo))
  );
}

export function isCliEvent(value: unknown): value is CliEvent {
  return (
    isRecord(value) &&
    value.type === "event" &&
    value.schema_version === 1 &&
    typeof value.event === "string"
  );
}

export function isLogCliEvent(value: unknown): value is LogCliEvent {
  return (
    isCliEvent(value) &&
    value.event === "log" &&
    typeof value.service === "string" &&
    typeof value.line === "string" &&
    isOptionalString(value.at) &&
    isOptionalString(value.message)
  );
}

export function isProgressCliEvent(value: unknown): value is ProgressCliEvent {
  return (
    isCliEvent(value) &&
    value.event === "progress" &&
    isOptionalString(value.job) &&
    isOptionalNumber(value.percent) &&
    isOptionalString(value.message)
  );
}

export function isJobEvent(value: unknown): value is JobEvent {
  if (
    !isRecord(value) ||
    typeof value.jobId !== "string" ||
    typeof value.kind !== "string"
  ) {
    return false;
  }
  switch (value.kind) {
    case "started":
    case "cancelled":
      return value.data === undefined;
    case "stdout":
      return typeof value.data === "string" || isCliEvent(value.data);
    case "stderr":
      return typeof value.data === "string";
    case "result":
      return isCliResult(value.data);
    case "exit":
      return typeof value.data === "number" || value.data === null;
    default:
      return false;
  }
}

/** Preserve command data carried by a structured job error. */
export function commandTextResultFromError(
  error: unknown,
): CommandTextResult | null {
  if (!(error instanceof Error)) return null;
  const data = (error as Error & { data?: unknown }).data;
  return isCommandTextResult(data) ? data : null;
}

export function describeMode(mode: "systemd" | "launchd" | "schtasks" | "pid" | "none"): string {
  return {
    systemd: "systemd 用户服务",
    launchd: "macOS LaunchAgent",
    schtasks: "Windows 计划任务",
    pid: "独立 supervisor",
    none: "未检测到 supervisor",
  }[mode];
}

function isDoctorCheck(value: unknown): value is DoctorCheck {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.ok === "boolean" &&
    (value.level === "error" || value.level === "warn") &&
    isOptionalString(value.code) &&
    isOptionalString(value.message)
  );
}

function isEngineInfo(value: unknown): value is EngineInfo {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOptionalString(value.pluginId) &&
    (value.group === "searxng" ||
      value.group === "gateway.search" ||
      value.group === "gateway.reverse_image" ||
      value.group === "gateway.upstream") &&
    typeof value.name === "string" &&
    (value.kind === "searxng" || value.kind === "gateway") &&
    typeof value.enabled === "boolean" &&
    typeof value.available === "boolean" &&
    isStringArray(value.routing) &&
    (value.requires === undefined || isStringArray(value.requires)) &&
    (value.source === undefined ||
      value.source === "default" ||
      value.source === "local")
  );
}

function isExtensionInfo(value: unknown): value is ExtensionInfo {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.path === "string" &&
    isOptionalString(value.name) &&
    isOptionalString(value.version) &&
    isOptionalString(value.entry) &&
    isOptionalString(value.error) &&
    (value.provides === undefined ||
      (Array.isArray(value.provides) &&
        value.provides.every(
          (item) => item === "search" || item === "fetch",
        ))) &&
    (value.backends === undefined ||
      isArrayOf(value.backends, isExtensionBackendInfo)) &&
    (value.fetch_channels === undefined ||
      isArrayOf(value.fetch_channels, isExtensionFetchChannelInfo)) &&
    (value.search_engines === undefined ||
      isArrayOf(value.search_engines, isExtensionSearchEngineInfo))
  );
}

function isExtensionBackendInfo(
  value: unknown,
): value is ExtensionBackendInfo {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isOptionalString(value.description) &&
    (value.aliases === undefined || isStringArray(value.aliases)) &&
    typeof value.installed === "boolean" &&
    typeof value.enabled === "boolean" &&
    isOptionalString(value.version) &&
    isOptionalString(value.path)
  );
}

function isExtensionFetchChannelInfo(
  value: unknown,
): value is ExtensionFetchChannelInfo {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOptionalString(value.name) &&
    isOptionalString(value.description) &&
    (value.backends === undefined || isStringArray(value.backends)) &&
    (value.aliases === undefined || isStringArray(value.aliases))
  );
}

function isExtensionSearchEngineInfo(
  value: unknown,
): value is ExtensionSearchEngineInfo {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOptionalString(value.name) &&
    isOptionalString(value.description)
  );
}

function isExtensionSearchItem(value: unknown): value is ExtensionSearchItem {
  return (
    isRecord(value) &&
    typeof value.repo === "string" &&
    typeof value.description === "string" &&
    typeof value.stars === "number" &&
    typeof value.url === "string" &&
    typeof value.updated_at === "string"
  );
}

function isConfigFieldInfo(value: unknown): value is ConfigFieldInfo {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.type === "string" &&
    typeof value.required === "boolean" &&
    isOptionalString(value.description)
  );
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

