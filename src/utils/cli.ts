import type { CliResult } from "../types/cli";

export function cliData<T>(result: CliResult<unknown>): T | null {
  return result.ok && result.data !== undefined ? (result.data as T) : null;
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
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.schema_version === 1 &&
    typeof record.ok === "boolean" &&
    typeof record.command === "string"
  );
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

