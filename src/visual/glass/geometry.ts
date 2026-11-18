import type { ShapeParams } from "./model";

const TAU = Math.PI * 2;
const SHAPE_STEPS = 200;

export interface ShapeGeometry {
  path: Path2D;
  cx: number;
  cy: number;
  r: number;
}

export interface ScenePoint {
  x: number;
  y: number;
}

/** 同一时刻、同一尺寸下的背景边界点，供几何与颗粒回流共用。 */
export function shapeBoundaryPoint(
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
  angle: number,
): ScenePoint {
  const minDim = Math.min(width, height);
  const cx =
    width * shape.cx + Math.sin(time * 0.37 + 0.4) * minDim * 0.004;
  const cy =
    height * shape.cy + Math.cos(time * 0.43 + 0.8) * minDim * 0.003;
  const breathe =
    1 +
    Math.sin(time * 0.9) * 0.028 +
    Math.sin(time * 1.55 + 1.1) * 0.007;
  const radius = minDim * shape.r * breathe;
  const spin = time * 0.55 * shape.spin;
  const ripple =
    shape.amp *
    (Math.sin(shape.lobes * angle + spin * 2) +
      0.42 * Math.sin(shape.lobes * 0.5 * angle - spin * 3.1));
  const membrane =
    shape.amp < 0.01
      ? Math.sin(time * 0.9 + 0.7) * 0.008 * Math.cos(angle * 2 + 0.5)
      : 0;
  const currentRadius = radius * (1 + ripple + membrane);
  const currentAngle = angle + spin * 0.35 + shape.twist;
  return {
    x: cx + Math.cos(currentAngle) * currentRadius,
    y: cy + Math.sin(currentAngle) * currentRadius,
  };
}

/** 真实形状路径；同一场景帧的 L2 与 L3 会复用此结果。 */
export function createShapeGeometry(
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
): ShapeGeometry {
  const minDim = Math.min(width, height);
  const breathe =
    1 +
    Math.sin(time * 0.9) * 0.028 +
    Math.sin(time * 1.55 + 1.1) * 0.007;
  const radius = minDim * shape.r * breathe;
  const cx =
    width * shape.cx + Math.sin(time * 0.37 + 0.4) * minDim * 0.004;
  const cy =
    height * shape.cy + Math.cos(time * 0.43 + 0.8) * minDim * 0.003;
  const path = new Path2D();

  for (let index = 0; index <= SHAPE_STEPS; index += 1) {
    const point = shapeBoundaryPoint(
      width,
      height,
      time,
      shape,
      (index / SHAPE_STEPS) * TAU,
    );
    if (index === 0) path.moveTo(point.x, point.y);
    else path.lineTo(point.x, point.y);
  }
  path.closePath();
  return {
    path,
    cx,
    cy,
    r: radius,
  };
}
