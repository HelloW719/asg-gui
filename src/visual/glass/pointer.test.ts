import { describe, expect, it } from "vitest";
import {
  POINTER_EXIT_DURATION_MS,
  POINTER_GATHER_DURATION_MS,
  easeParticleProgress,
  normalizePointerPosition,
  pointerPhaseProgress,
} from "./pointer";

describe("glass pointer source", () => {
  const bounds = {
    left: 10,
    top: 20,
    width: 100,
    height: 50,
  };

  it("normalizes coordinates against the glass surface", () => {
    expect(normalizePointerPosition(60, 45, bounds)).toEqual({
      x: 0.5,
      y: 0.5,
      inside: true,
    });
  });

  it("projects a departed pointer onto the nearest boundary", () => {
    expect(normalizePointerPosition(5, 45, bounds)).toMatchObject({
      x: 0,
      y: 0.5,
      inside: false,
    });
    expect(normalizePointerPosition(160, 80, bounds)).toMatchObject({
      x: 1,
      y: 1,
      inside: false,
    });
  });

  it("finishes gathering and dissolving on their configured schedules", () => {
    expect(
      pointerPhaseProgress(
        "gathering",
        1000,
        1000 + POINTER_GATHER_DURATION_MS / 2,
      ),
    ).toBeCloseTo(0.5);
    expect(
      pointerPhaseProgress("dissolving", 1000, 1000 + 120),
    ).toBeCloseTo(120 / POINTER_EXIT_DURATION_MS);
    expect(
      pointerPhaseProgress(
        "dissolving",
        1000,
        1000 + POINTER_EXIT_DURATION_MS,
      ),
    ).toBe(1);
  });

  it("uses smooth endpoints for particle motion", () => {
    expect(easeParticleProgress(0)).toBe(0);
    expect(easeParticleProgress(0.5)).toBe(0.5);
    expect(easeParticleProgress(1)).toBe(1);
  });
});
