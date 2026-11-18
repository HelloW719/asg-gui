import { describe, expect, it } from "vitest";
import {
  SCENE_DPR_LIMIT,
  SCENE_FRAME_INTERVAL_MS,
  cappedDevicePixelRatio,
  sceneIntervalForFrameRate,
  sceneIntervalForLevel,
  shouldRenderSceneFrame,
  updateSceneCadenceLevel,
} from "./scheduler";

describe("glass render scheduler", () => {
  it("starts the scene at approximately 60Hz", () => {
    let last = -1;
    let draws = 0;

    for (let now = 0; now <= 1000; now += 1000 / 60) {
      if (shouldRenderSceneFrame(last, now, false)) {
        draws += 1;
        last = now;
      }
    }

    expect(draws).toBeGreaterThanOrEqual(59);
    expect(draws).toBeLessThanOrEqual(61);
    expect(SCENE_FRAME_INTERVAL_MS).toBeCloseTo(1000 / 60);
  });

  it("renders immediately when the scene is dirty", () => {
    expect(shouldRenderSceneFrame(100, 101, true)).toBe(true);
  });

  it("caps high-DPI backing stores at 1.5x", () => {
    expect(cappedDevicePixelRatio(1)).toBe(1);
    expect(cappedDevicePixelRatio(1.25)).toBe(1.25);
    expect(cappedDevicePixelRatio(2)).toBe(SCENE_DPR_LIMIT);
  });

  it("backs off to 45Hz and 30Hz only when frames stay slow", () => {
    const level45 = updateSceneCadenceLevel(0, 30);
    const level30 = updateSceneCadenceLevel(level45, 30);
    expect(sceneIntervalForLevel(level45)).toBeCloseTo(1000 / 45);
    expect(sceneIntervalForLevel(level30)).toBeCloseTo(1000 / 30);
    expect(updateSceneCadenceLevel(level30, 16.7)).toBe(level45);
  });

  it("supports manual fixed and display-refresh frame rates", () => {
    expect(sceneIntervalForFrameRate("auto")).toBeNull();
    expect(sceneIntervalForFrameRate("display")).toBe(0);
    expect(sceneIntervalForFrameRate(90)).toBeCloseTo(1000 / 90);
    expect(sceneIntervalForFrameRate(240)).toBeCloseTo(1000 / 240);
  });
});
