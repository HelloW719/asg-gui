import { describe, expect, it } from "vitest";
import type { VisualState } from "../types/cli";
import { sceneStateForVisual, shapeOf } from "./glassScene";

describe("glass scene state mapping", () => {
  it.each([
    ["stable", "healthy"],
    ["loading", "booting"],
    ["starting", "working"],
    ["restarting", "restarting"],
    ["degraded", "degraded"],
    ["failed", "error"],
    ["stopped", "degraded"],
    ["unconfigured", "booting"],
    ["disconnected", "booting"],
  ] satisfies Array<[VisualState, string]>)(
    "maps %s to %s",
    (visualState, sceneState) => {
      expect(sceneStateForVisual(visualState)).toBe(sceneState);
    },
  );

  it("keeps the stable and failed geometries in opposite corners", () => {
    const healthy = shapeOf("healthy", "dark");
    const failed = shapeOf("error", "dark");

    expect(healthy.cx).toBeGreaterThan(0.5);
    expect(healthy.cy).toBeGreaterThan(0.5);
    expect(failed.cx).toBeLessThan(0.5);
    expect(failed.cy).toBeLessThan(0.5);
    expect(healthy.amp).toBe(0);
    expect(failed.amp).toBe(0);
  });
});
