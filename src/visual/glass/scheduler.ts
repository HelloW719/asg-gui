import type { GlassFrameRate } from "@/types/appearance";

export const SCENE_FRAME_INTERVALS_MS = [
  1000 / 60,
  1000 / 45,
  1000 / 30,
] as const;
export const SCENE_FRAME_INTERVAL_MS = SCENE_FRAME_INTERVALS_MS[0];
export const SCENE_DPR_LIMIT = 1.5;

export function shouldRenderSceneFrame(
  lastRenderedAt: number,
  now: number,
  dirty: boolean,
  intervalMs = SCENE_FRAME_INTERVAL_MS,
): boolean {
  return (
    dirty ||
    lastRenderedAt < 0 ||
    now - lastRenderedAt >= intervalMs - 0.5
  );
}

export function cappedDevicePixelRatio(devicePixelRatio: number): number {
  return Math.min(SCENE_DPR_LIMIT, Math.max(1, devicePixelRatio || 1));
}

export function sceneIntervalForLevel(level: number): number {
  const index = Math.min(
    SCENE_FRAME_INTERVALS_MS.length - 1,
    Math.max(0, Math.round(level)),
  );
  return SCENE_FRAME_INTERVALS_MS[index];
}

export function sceneIntervalForFrameRate(
  frameRate: GlassFrameRate,
): number | null {
  if (frameRate === "auto") return null;
  return frameRate === "display" ? 0 : 1000 / frameRate;
}

/** 每秒评估一次平均帧间隔，只在实际掉帧时降低背景渲染级别。 */
export function updateSceneCadenceLevel(
  level: number,
  averageFrameMs: number,
): number {
  const current = Math.min(
    SCENE_FRAME_INTERVALS_MS.length - 1,
    Math.max(0, Math.round(level)),
  );
  if (averageFrameMs > 26 && current < SCENE_FRAME_INTERVALS_MS.length - 1) {
    return current + 1;
  }
  if (averageFrameMs < 18 && current > 0) {
    return current - 1;
  }
  return current;
}
