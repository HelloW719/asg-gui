import {
  shapeBoundaryPoint,
  type ScenePoint,
} from "./geometry";
import type { ShapeParams, ThemeMode } from "./model";
import {
  POINTER_EXIT_BURST_MS,
  POINTER_EXIT_DURATION_MS,
  POINTER_GATHER_DURATION_MS,
  easeParticleProgress,
  type PointerSample,
} from "./pointer";

const TAU = Math.PI * 2;
const BODY_ALPHA_DARK = 0.84;
const BODY_ALPHA_LIGHT = 0.68;
const BALL_RADIUS_RATIO = 0.055;

export const PARTICLE_COUNT = 24;

export interface ParticleSpec {
  index: number;
  seed: number;
  angle: number;
  radius: number;
  size: number;
  curve: number;
}

export interface ParticleFrame {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

export interface BoundaryTarget extends ScenePoint {
  index: number;
}

/** 固定种子让同一状态下的颗粒路径可复现。 */
export const PARTICLE_SPECS: readonly ParticleSpec[] = Array.from(
  { length: PARTICLE_COUNT },
  (_, index) => {
    const seed = ((index * 0.61803398875 + 0.17) % 1 + 1) % 1;
    return {
      index,
      seed,
      angle: index * 2.3999632297,
      radius: 0.04 + seed * 0.025,
      size: 0.008 + seed * 0.006,
      curve: (index % 2 === 0 ? 1 : -1) * (0.04 + seed * 0.08),
    };
  },
);

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function particleColor(
  color: readonly [number, number, number],
  alpha: number,
): string {
  return `rgba(${color[0] | 0},${color[1] | 0},${color[2] | 0},${alpha})`;
}

function bodyAlpha(theme: ThemeMode): number {
  return theme === "dark" ? BODY_ALPHA_DARK : BODY_ALPHA_LIGHT;
}

/** 颗粒在鼠标周围汇聚；中心持续使用当前光标位置。 */
export function gatherParticleFrame(
  spec: ParticleSpec,
  pointer: ScenePoint,
  width: number,
  height: number,
  progress: number,
): ParticleFrame {
  const eased = easeParticleProgress(progress);
  const minDim = Math.min(width, height);
  const orbitDistance = minDim * spec.radius * (1 - eased);
  const swirl = (1 - eased) * (0.45 + spec.seed * 0.5);
  const angle = spec.angle + swirl;
  return {
    x: pointer.x * width + Math.cos(angle) * orbitDistance,
    y: pointer.y * height + Math.sin(angle) * orbitDistance,
    radius: minDim * spec.size * (1 - eased * 0.55),
    opacity: 1 - eased * 0.72,
  };
}

/** 颗粒从出口爆开，再沿曲线回到当前同色几何边缘。 */
export function dissolvingParticleFrame(
  spec: ParticleSpec,
  sample: PointerSample,
  target: ScenePoint,
  width: number,
  height: number,
): ParticleFrame {
  const minDim = Math.min(width, height);
  const elapsed = sample.phaseProgress * POINTER_EXIT_DURATION_MS;
  const burstProgress = clampProgress(elapsed / POINTER_EXIT_BURST_MS);
  const flightProgress = clampProgress(
    (elapsed - POINTER_EXIT_BURST_MS) /
      (POINTER_EXIT_DURATION_MS - POINTER_EXIT_BURST_MS),
  );
  const burstEase = easeParticleProgress(burstProgress);
  const flightEase = easeParticleProgress(flightProgress);
  const startX = sample.exitPoint.x * width;
  const startY = sample.exitPoint.y * height;
  const burstDistance = minDim * (0.02 + spec.seed * 0.04) * burstEase;
  const scatterAngle = spec.angle + (spec.seed - 0.5) * 1.3;
  const burstX = startX + Math.cos(scatterAngle) * burstDistance;
  const burstY = startY + Math.sin(scatterAngle) * burstDistance;

  const dx = target.x - burstX;
  const dy = target.y - burstY;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  const curveOffset = minDim * spec.curve;
  const control1X =
    burstX + dx * 0.28 + normalX * curveOffset;
  const control1Y =
    burstY + dy * 0.28 + normalY * curveOffset;
  const control2X =
    burstX + dx * 0.72 - normalX * curveOffset * 0.55;
  const control2Y =
    burstY + dy * 0.72 - normalY * curveOffset * 0.55;
  const inverse = 1 - flightEase;
  const x =
    inverse * inverse * inverse * burstX +
    3 * inverse * inverse * flightEase * control1X +
    3 * inverse * flightEase * flightEase * control2X +
    flightEase * flightEase * flightEase * target.x;
  const y =
    inverse * inverse * inverse * burstY +
    3 * inverse * inverse * flightEase * control1Y +
    3 * inverse * flightEase * flightEase * control2Y +
    flightEase * flightEase * flightEase * target.y;
  const fade =
    flightProgress >= 1
      ? 0
      : 1 - clampProgress((flightProgress - 0.78) / 0.22);
  return {
    x,
    y,
    radius: minDim * spec.size * (1 - flightProgress * 0.2),
    opacity: fade,
  };
}

/** 在当前几何可见轮廓上分配一组彼此错开的回流点。 */
export function nearestBoundaryTargets(
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
  origin: ScenePoint,
  count = PARTICLE_COUNT,
): BoundaryTarget[] {
  const sampleCount = 96;
  const originX = origin.x * width;
  const originY = origin.y * height;
  const visible: BoundaryTarget[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const point = shapeBoundaryPoint(
      width,
      height,
      time,
      shape,
      (index / sampleCount) * TAU,
    );
    if (
      point.x >= 0 &&
      point.x <= width &&
      point.y >= 0 &&
      point.y <= height
    ) {
      visible.push({ ...point, index });
    }
  }

  if (visible.length === 0) {
    return Array.from({ length: count }, () => ({
      x: shape.cx * width,
      y: shape.cy * height,
      index: 0,
    }));
  }

  const nearest = [...visible]
    .sort(
      (a, b) =>
        Math.hypot(a.x - originX, a.y - originY) -
        Math.hypot(b.x - originX, b.y - originY),
    )
    .slice(0, Math.min(visible.length, count * 2))
    .sort((a, b) => a.index - b.index);
  const stride = Math.max(1, Math.floor(nearest.length / count));
  const targets = nearest.filter((_, index) => index % stride === 0).slice(0, count);

  while (targets.length < count) {
    const fallback = nearest[targets.length % nearest.length];
    targets.push({ ...fallback, index: fallback.index + targets.length * 0.01 });
  }
  return targets;
}

function drawBall(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  shape: ShapeParams,
): void {
  if (radius <= 0 || alpha <= 0) return;
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, particleColor(shape.color, alpha));
  gradient.addColorStop(0.9, particleColor(shape.color, alpha));
  gradient.addColorStop(0.97, particleColor(shape.color, alpha * 0.45));
  gradient.addColorStop(1, particleColor(shape.color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
}

function drawParticles(
  context: CanvasRenderingContext2D,
  frames: readonly ParticleFrame[],
  shape: ShapeParams,
  alpha: number,
): void {
  for (const frame of frames) {
    if (frame.opacity <= 0 || frame.radius <= 0) continue;
    const glowRadius = frame.radius * 2.2;
    const gradient = context.createRadialGradient(
      frame.x,
      frame.y,
      0,
      frame.x,
      frame.y,
      glowRadius,
    );
    gradient.addColorStop(
      0,
      particleColor(shape.color, frame.opacity * alpha),
    );
    gradient.addColorStop(
      0.48,
      particleColor(shape.color, frame.opacity * alpha * 0.92),
    );
    gradient.addColorStop(
      0.72,
      particleColor(shape.color, frame.opacity * alpha * 0.38),
    );
    gradient.addColorStop(1, particleColor(shape.color, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(frame.x, frame.y, glowRadius, 0, TAU);
    context.fill();
  }
}

/** 在 L2 中绘制汇聚与回流颗粒；稳定态由真实融合路径接管。 */
export function drawPointerTransient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointer: PointerSample,
  shape: ShapeParams,
  theme: ThemeMode,
): void {
  if (pointer.phase !== "gathering" && pointer.phase !== "dissolving") return;

  const alpha = bodyAlpha(theme);
  const minDim = Math.min(width, height);
  const ballRadius = minDim * BALL_RADIUS_RATIO;
  const pointerPoint = { x: pointer.x, y: pointer.y };

  context.save();
  if (pointer.phase === "gathering") {
    const gather = easeParticleProgress(
      (pointer.phaseProgress * POINTER_GATHER_DURATION_MS) /
        POINTER_GATHER_DURATION_MS,
    );
    const frames = PARTICLE_SPECS.map((spec) =>
      gatherParticleFrame(
        spec,
        pointerPoint,
        width,
        height,
        pointer.phaseProgress,
      ),
    );
    drawParticles(context, frames, shape, alpha);
    drawBall(
      context,
      pointer.x * width,
      pointer.y * height,
      ballRadius * gather,
      alpha * gather,
      shape,
    );
  } else {
    const targets = nearestBoundaryTargets(
      width,
      height,
      time,
      shape,
      pointer.exitPoint,
    );
    const frames = PARTICLE_SPECS.map((spec, index) =>
      dissolvingParticleFrame(
        spec,
        pointer,
        targets[index] ?? targets[0],
        width,
        height,
      ),
    );
    const elapsed = pointer.phaseProgress * POINTER_EXIT_DURATION_MS;
    const burstRemaining = 1 - clampProgress(
      elapsed / POINTER_EXIT_BURST_MS,
    );
    drawBall(
      context,
      pointer.exitPoint.x * width,
      pointer.exitPoint.y * height,
      ballRadius * burstRemaining,
      alpha * burstRemaining,
      shape,
    );
    drawParticles(context, frames, shape, alpha);
  }
  context.restore();
}
