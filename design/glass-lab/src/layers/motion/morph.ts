import type { AppState } from '../../types';

/** 归一化后的形状参数：两个 canvas（L2 与 L3 离屏）都从这里取，保证几何一致。 */
export interface ShapeParams {
  /** 圆心，相对视口宽高的归一化坐标 */
  cx: number;
  cy: number;
  /** 半径，相对 min(width, height) */
  r: number;
  /** 花瓣数量，0 表示正圆 */
  lobes: number;
  /** 花瓣幅度（0–0.2） */
  amp: number;
  /** 旋转速度倍率 */
  spin: number;
  /** 主体色 RGB */
  color: [number, number, number];
  /** 外圈柔光强度 */
  halo: number;
  /** morph 期间额外扭转（rad），静止时为 0 */
  twist: number;
}

export function shapeOf(state: AppState): ShapeParams {
  switch (state) {
    case 'healthy':
      // 可用：绿圆，右下，圆心出界约 35%
      return { cx: 0.89, cy: 0.82, r: 0.52, lobes: 6, amp: 0, spin: 1, color: [52, 211, 153], halo: 0.26 , twist: 0 };
    case 'degraded':
    case 'error':
      // 不可用：黄圆，左上，圆心出界约 35%
      return { cx: 0.11, cy: 0.18, r: 0.52, lobes: 6, amp: 0, spin: 1, color: [245, 196, 81], halo: 0.26 , twist: 0 };
    case 'booting':
      // 加载：曲奇，居中，颜色跟随状态
      return { cx: 0.5, cy: 0.5, r: 0.16, lobes: 6, amp: 0.13, spin: 1, color: [138, 163, 196], halo: 0.2 , twist: 0 };
    case 'working':
      return { cx: 0.5, cy: 0.5, r: 0.16, lobes: 6, amp: 0.13, spin: 1, color: [99, 164, 255], halo: 0.2 , twist: 0 };
    case 'restarting':
      return { cx: 0.5, cy: 0.5, r: 0.16, lobes: 6, amp: 0.13, spin: 1, color: [255, 190, 99], halo: 0.2 , twist: 0 };
  }
}

/**
 * 两边慢、中间快，但端点的一阶与二阶导都为 0（smootherstep）。
 * 比 cubic 的起停更柔，不会在开始/结束那一帧「弹」一下。
 */
export function easeInOutSmooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

const DURATION_MS = 1400;

let from: ShapeParams | null = null;
let to: ShapeParams | null = null;
let startedAt = 0;
let current: ShapeParams | null = null;
/** 过渡期间的旋转方向：曲奇→圆 顺时针，圆→曲奇 逆时针。 */
let twistDir = 1;

function sameShape(a: ShapeParams, b: ShapeParams): boolean {
  return (
    a.cx === b.cx &&
    a.cy === b.cy &&
    a.r === b.r &&
    a.lobes === b.lobes &&
    a.amp === b.amp &&
    a.spin === b.spin &&
    a.halo === b.halo &&
    a.color[0] === b.color[0] &&
    a.color[1] === b.color[1] &&
    a.color[2] === b.color[2]
  );
}

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

/**
 * 位置/尺度与形状/颜色用两条不同的进度：
 * 前半段先「挪位置 + 缩放」，后半段再「长花瓣 + 换色」。
 * 所有维度同时插值会让画面显得在乱抖，拆开之后节奏清楚很多。
 */
function lerpShape(a: ShapeParams, b: ShapeParams, pPos: number, pShape: number): ShapeParams {
  return {
    cx: lerp(a.cx, b.cx, pPos),
    cy: lerp(a.cy, b.cy, pPos),
    r: lerp(a.r, b.r, pPos),
    lobes: b.lobes,
    amp: lerp(a.amp, b.amp, pShape),
    spin: b.spin,
    halo: lerp(a.halo, b.halo, pShape),
    twist: 0,
    color: [
      lerp(a.color[0], b.color[0], pShape),
      lerp(a.color[1], b.color[1], pShape),
      lerp(a.color[2], b.color[2], pShape),
    ],
  };
}

/**
 * 请求把形状切到某个状态。可以打断进行中的过渡：
 * 起点用当前插值结果，所以连续切换不会跳变。
 */
export function requestMorph(state: AppState, now = performance.now()): void {
  const target = shapeOf(state);
  if (!to || !current) {
    to = target;
    current = target;
    return;
  }
  if (sameShape(target, to)) return;
  from = current;
  to = target;
  // 圆 → 曲奇走反向，两个方向看起来才像「同一个动作的来回」。
  const fromCurve = current.amp > 0.01;
  const toCurve = target.amp > 0.01;
  twistDir = fromCurve && !toCurve ? 1 : !fromCurve && toCurve ? -1 : 1;
  startedAt = now;
}

/** 取 now 时刻的插值形状。两个 canvas 在同一帧调用，结果一致。 */
export function morphAt(now: number): ShapeParams {
  if (!to) return shapeOf('healthy');
  if (!from) return to;
  const raw = Math.min(1, Math.max(0, (now - startedAt) / DURATION_MS));
  if (raw >= 1) {
    from = null;
    current = to;
    return to;
  }
  // 0–30% 只挪位置和尺度；30% 起才开始长花瓣、换色。
  const pPos = easeInOutSmooth(raw);
  const pShape = easeInOutSmooth(Math.min(1, Math.max(0, (raw - 0.3) / 0.7)));
  const base = lerpShape(from, to, pPos, pShape);
  // 旋转时机与方向相反：
  //   曲奇 → 圆：先缩后转（ease-in，旋转集中在后半段）
  //   圆 → 曲奇：先转后长（ease-out，旋转集中在前半段）
  // 终值始终是 2π 的整数倍，结束时角度与开始时等价，不会跳一下。
  // 1.5 次比 2 次更早进入旋转。
  const twistEase =
    twistDir > 0 ? Math.pow(raw, 1.5) : 1 - Math.pow(1 - raw, 1.5);
  base.twist = twistEase * Math.PI * 2 * twistDir;
  current = base;
  return current;
}
