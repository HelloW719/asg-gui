export type ThemePreference = "system" | "dark" | "light";

export type VisualState =
  | "unconfigured"
  | "disconnected"
  | "stopped"
  | "loading"
  | "starting"
  | "restarting"
  | "stable"
  | "degraded"
  | "failed";

export interface CliErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

interface CliResultBase {
  schema_version: 1;
  command: string;
}

export type CliResult<T = unknown> = CliResultBase &
  (
    | {
        ok: true;
        data: T;
        error?: never;
      }
    | {
        ok: false;
        data?: T;
        error: CliErrorPayload;
      }
  );

export interface CliEvent<E extends string = string> {
  type: "event";
  schema_version: 1;
  event: E;
  [key: string]: unknown;
}

export type LogCliEvent = CliEvent<"log"> & {
  service: string;
  at?: string;
  line: string;
  message?: string;
};

export type ProgressCliEvent = CliEvent<"progress"> & {
  job?: string;
  percent?: number;
  message?: string;
};

export interface ServiceProbe {
  up: boolean;
  latency_ms?: number;
  version?: string;
  uptime_s?: number;
  error?: string;
}

export interface StackStatus {
  services: {
    gateway: ServiceProbe;
    searxng: ServiceProbe;
    flaresolverr: ServiceProbe;
  };
  supervisor: {
    managed: boolean;
    mode: "systemd" | "launchd" | "schtasks" | "pid" | "none";
    active: boolean;
  };
}

export interface RootSelection {
  path: string;
  valid: boolean;
  reason?: string;
  nodePath?: string;
}

export interface DesktopAppState {
  root: string | null;
  rootValid: boolean;
  invalidReason?: string;
  platform: "windows" | "macos" | "linux" | "unknown";
  version: string;
  theme: ThemePreference;
  onboardingCompleted: boolean;
}

export interface JobStart {
  jobId: string;
  cancellable: boolean;
  mutating: boolean;
}

interface JobEventBase<K extends string> {
  jobId: string;
  kind: K;
}

export type JobEvent =
  | (JobEventBase<"started"> & { data?: never })
  | (JobEventBase<"stdout"> & { data: CliEvent | string })
  | (JobEventBase<"stderr"> & { data: string })
  | (JobEventBase<"result"> & { data: CliResult })
  | (JobEventBase<"exit"> & { data: number | null })
  | (JobEventBase<"cancelled"> & { data?: never });

export type JobEventKind = JobEvent["kind"];

export type EngineGroup =
  | "searxng"
  | "gateway.search"
  | "gateway.reverse_image"
  | "gateway.upstream";

export interface EngineInfo {
  id: string;
  pluginId?: string;
  group: EngineGroup;
  name: string;
  kind: "searxng" | "gateway";
  enabled: boolean;
  available: boolean;
  routing: string[];
  requires?: string[];
  source?: "default" | "local";
}

export interface ExtensionBackendInfo {
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  installed: boolean;
  enabled: boolean;
  version?: string;
  path?: string;
}

export interface ExtensionFetchChannelInfo {
  id: string;
  name?: string;
  description?: string;
  backends?: string[];
  aliases?: string[];
}

export interface ExtensionSearchEngineInfo {
  id: string;
  name?: string;
  description?: string;
}

export interface ExtensionInfo {
  id: string;
  name?: string;
  version?: string;
  provides?: Array<"search" | "fetch">;
  backends?: ExtensionBackendInfo[];
  fetch_channels?: ExtensionFetchChannelInfo[];
  search_engines?: ExtensionSearchEngineInfo[];
  entry?: string;
  path: string;
  error?: string;
}

export interface ExtensionSearchItem {
  repo: string;
  description: string;
  stars: number;
  url: string;
  updated_at: string;
}

export interface LogLine {
  service: string;
  at?: string;
  line: string;
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  level: "error" | "warn";
  code?: string;
  message?: string;
}

export interface ConfigFieldInfo {
  key: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface BrowserStatus {
  path: string;
  headless_shell: boolean;
  chromium: boolean;
}

export interface BrowserInstallStatus extends BrowserStatus {
  full: boolean;
}

interface UpdateStatusBase {
  version: string | null;
  restarted: boolean;
}

export interface UpdateCheckStatus extends UpdateStatusBase {
  action: "check";
  current_version?: string | null;
  up_to_date?: boolean;
}

export interface UpdateApplyStatus extends UpdateStatusBase {
  action: "apply";
}

export type UpdateStatus = UpdateCheckStatus | UpdateApplyStatus;

export interface CommandTextResult {
  tool: "search" | "fetch";
  endpoint: string;
  elapsed_ms: number;
  ok: boolean;
  code: string | null;
  text: string;
  render?: "auto" | "always" | "never";
}

export type LifecycleAction = "start" | "stop" | "restart";

export interface EngineRouteDraft {
  category: string;
  hotCategory: string;
}

export interface SecretPayload {
  name?: string;
  secret: string;
}

