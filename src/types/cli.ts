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

export interface CliResult<T = unknown> {
  schema_version: 1;
  ok: boolean;
  command: string;
  data?: T;
  error?: CliErrorPayload;
}

export interface CliEvent {
  type: "event";
  schema_version: 1;
  event: string;
  [key: string]: unknown;
}

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
}

export interface JobStart {
  jobId: string;
  cancellable: boolean;
  mutating: boolean;
}

export type JobEventKind =
  | "started"
  | "stdout"
  | "stderr"
  | "result"
  | "exit"
  | "cancelled";

export interface JobEvent {
  jobId: string;
  kind: JobEventKind;
  data?: unknown;
}

export interface EngineInfo {
  id: string;
  group: "searxng" | "gateway.search" | "gateway.reverse_image";
  name: string;
  kind: "searxng" | "gateway";
  enabled: boolean;
  available: boolean;
  routing: string[];
  requires?: string[];
  source?: string;
}

export interface PluginInfo {
  name: string;
  platform: string;
  channel: string;
  channel_id: string;
  installed: boolean;
  version?: string | null;
  enabled: boolean;
  path: string;
}

export interface ExtensionInfo {
  id: string;
  name?: string;
  version?: string;
  provides?: string[];
  entry?: string;
  path?: string;
  error?: string;
}

export interface ExtensionSearchItem {
  repo: string;
  description: string;
  stars: number;
  url: string;
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

