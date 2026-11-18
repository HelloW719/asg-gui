import type { VisualState } from "@/types/cli";

export type ThemeMode = "dark" | "light";

export type GlassSceneState =
  | "booting"
  | "healthy"
  | "working"
  | "restarting"
  | "degraded"
  | "error";

export interface GlassPalette {
  primary: string;
  secondary: string;
  glow: string;
  line: string;
}

export interface ShapeParams {
  cx: number;
  cy: number;
  r: number;
  lobes: number;
  amp: number;
  spin: number;
  color: [number, number, number];
  halo: number;
}

const DARK_PALETTE: Record<GlassSceneState, GlassPalette> = {
  booting: {
    primary: "#8aa3c4",
    secondary: "#41536b",
    glow: "rgba(126,152,186,0.30)",
    line: "rgba(198,214,235,0.42)",
  },
  healthy: {
    primary: "#34d399",
    secondary: "#159a8e",
    glow: "rgba(52,211,153,0.30)",
    line: "rgba(172,255,243,0.42)",
  },
  working: {
    primary: "#63a4ff",
    secondary: "#2a5fbf",
    glow: "rgba(99,164,255,0.30)",
    line: "rgba(188,218,255,0.42)",
  },
  restarting: {
    primary: "#ffbe63",
    secondary: "#a8691c",
    glow: "rgba(255,190,99,0.28)",
    line: "rgba(255,228,186,0.42)",
  },
  degraded: {
    primary: "#f5c451",
    secondary: "#9a8420",
    glow: "rgba(245,196,81,0.24)",
    line: "rgba(255,242,190,0.38)",
  },
  error: {
    primary: "#f5c451",
    secondary: "#a37f1f",
    glow: "rgba(245,196,81,0.28)",
    line: "rgba(255,226,150,0.44)",
  },
};

const LIGHT_PALETTE: Record<GlassSceneState, GlassPalette> = {
  booting: {
    primary: "#61748b",
    secondary: "#425369",
    glow: "rgba(83,108,136,0.18)",
    line: "rgba(48,68,91,0.36)",
  },
  healthy: {
    primary: "#168d72",
    secondary: "#0f6b5b",
    glow: "rgba(26,148,113,0.18)",
    line: "rgba(27,108,86,0.34)",
  },
  working: {
    primary: "#397bd0",
    secondary: "#285ca6",
    glow: "rgba(57,123,208,0.17)",
    line: "rgba(39,87,151,0.34)",
  },
  restarting: {
    primary: "#ba7c22",
    secondary: "#8f5d15",
    glow: "rgba(195,129,34,0.17)",
    line: "rgba(133,88,26,0.34)",
  },
  degraded: {
    primary: "#b28220",
    secondary: "#866119",
    glow: "rgba(184,133,32,0.16)",
    line: "rgba(128,91,23,0.32)",
  },
  error: {
    primary: "#b47b1c",
    secondary: "#845813",
    glow: "rgba(180,123,28,0.18)",
    line: "rgba(126,83,18,0.34)",
  },
};

export const VISUAL_STATE_LABEL: Record<GlassSceneState, string> = {
  booting: "正在探测",
  healthy: "稳定运行",
  working: "任务执行",
  restarting: "整栈重启",
  degraded: "部分降级",
  error: "运行故障",
};

export function sceneStateForVisual(state: VisualState): GlassSceneState {
  if (state === "stable") return "healthy";
  if (state === "degraded") return "degraded";
  if (state === "failed") return "error";
  if (state === "starting") return "working";
  if (state === "restarting") return "restarting";
  if (state === "loading") return "booting";
  if (state === "stopped") return "degraded";
  return "booting";
}

export function paletteFor(
  state: GlassSceneState,
  theme: ThemeMode,
): GlassPalette {
  return (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE)[state];
}
