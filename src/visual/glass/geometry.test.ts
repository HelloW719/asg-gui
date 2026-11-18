import { describe, expect, it } from "vitest";
import { shapeBoundaryPoint } from "./geometry";
import { shapeOf } from "./shapes";

describe("glass breathing geometry", () => {
  it("moves the visible edge by more than 18px during a breath cycle", () => {
    const width = 1400;
    const height = 880;
    const shape = shapeOf("healthy", "dark");
    const centerX = shape.cx * width;
    const centerY = shape.cy * height;
    const radii = Array.from({ length: 121 }, (_, index) => {
      const point = shapeBoundaryPoint(
        width,
        height,
        index * 0.1,
        shape,
        0,
      );
      return Math.hypot(point.x - centerX, point.y - centerY);
    });

    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(18);
  });
});
