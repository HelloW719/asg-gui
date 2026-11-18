import { describe, expect, it } from "vitest";
import {
  PARTICLE_COUNT,
  PARTICLE_SPECS,
  dissolvingParticleFrame,
  gatherParticleFrame,
  nearestBoundaryTargets,
} from "./interaction";
import type { PointerSample } from "./pointer";
import { shapeOf } from "./shapes";

describe("glass pointer particles", () => {
  const width = 1000;
  const height = 700;

  it("uses twenty-four deterministic particles", () => {
    expect(PARTICLE_SPECS).toHaveLength(PARTICLE_COUNT);
    expect(PARTICLE_SPECS.map((particle) => particle.index)).toEqual(
      Array.from({ length: PARTICLE_COUNT }, (_, index) => index),
    );
    expect(new Set(PARTICLE_SPECS.map((particle) => particle.seed)).size).toBe(
      PARTICLE_COUNT,
    );
  });

  it("moves every gathering particle into the cursor center", () => {
    const pointer = { x: 0.3, y: 0.25 };
    for (const particle of PARTICLE_SPECS) {
      const frame = gatherParticleFrame(particle, pointer, width, height, 1);
      expect(frame.x).toBeCloseTo(pointer.x * width);
      expect(frame.y).toBeCloseTo(pointer.y * height);
    }
  });

  it("spreads particles across visible geometry boundary targets", () => {
    const shape = shapeOf("healthy", "dark");
    const targets = nearestBoundaryTargets(
      width,
      height,
      0,
      shape,
      { x: 0.2, y: 0.3 },
    );

    expect(targets).toHaveLength(PARTICLE_COUNT);
    expect(new Set(targets.map((point) => point.index)).size).toBe(
      PARTICLE_COUNT,
    );
    for (const target of targets) {
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.x).toBeLessThanOrEqual(width);
      expect(target.y).toBeGreaterThanOrEqual(0);
      expect(target.y).toBeLessThanOrEqual(height);
    }
  });

  it("moves dissolving particles toward their same-color target", () => {
    const shape = shapeOf("healthy", "dark");
    const target = {
      x: shape.cx * width,
      y: shape.cy * height,
    };
    const start: PointerSample = {
      x: 0.2,
      y: 0.3,
      active: false,
      presence: 1,
      phase: "dissolving",
      phaseProgress: 0,
      transitionStartedAt: 0,
      entryPoint: { x: 0.2, y: 0.3 },
      exitPoint: { x: 0.2, y: 0.3 },
    };
    const early = dissolvingParticleFrame(
      PARTICLE_SPECS[0],
      start,
      target,
      width,
      height,
    );
    const late = dissolvingParticleFrame(
      PARTICLE_SPECS[0],
      { ...start, phaseProgress: 1 },
      target,
      width,
      height,
    );

    const earlyDistance = Math.hypot(early.x - target.x, early.y - target.y);
    const lateDistance = Math.hypot(late.x - target.x, late.y - target.y);
    expect(lateDistance).toBeLessThan(earlyDistance);
    expect(late.opacity).toBe(0);
  });
});
