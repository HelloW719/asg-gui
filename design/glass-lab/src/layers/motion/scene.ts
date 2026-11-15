import type { AppState } from '../../types';
import { type ShapeParams, shapeOf } from './morph';

export interface ScenePalette {
  primary: string;
  secondary: string;
  glow: string;
  line: string;
}

export const DARK_PALETTE: Record<AppState, ScenePalette> = {
  booting: { primary: '#8aa3c4', secondary: '#41536b', glow: 'rgba(126,152,186,0.30)', line: 'rgba(198,214,235,0.42)' },
  healthy: { primary: '#34d399', secondary: '#159a8e', glow: 'rgba(52,211,153,0.30)', line: 'rgba(172,255,243,0.42)' },
  working: { primary: '#63a4ff', secondary: '#2a5fbf', glow: 'rgba(99,164,255,0.30)', line: 'rgba(188,218,255,0.42)' },
  restarting: { primary: '#ffbe63', secondary: '#a8691c', glow: 'rgba(255,190,99,0.28)', line: 'rgba(255,228,186,0.42)' },
  degraded: { primary: '#f5c451', secondary: '#9a8420', glow: 'rgba(245,196,81,0.24)', line: 'rgba(255,242,190,0.38)' },
  error: { primary: '#f5c451', secondary: '#a37f1f', glow: 'rgba(245,196,81,0.28)', line: 'rgba(255,226,150,0.44)' },
};

export interface SceneOptions {
  speed?: number;
  palette?: ScenePalette;
  phase?: number;
  /** 过渡中的形状；缺省时按 state 直接取目标形状 */
  shape?: ShapeParams;
}

const TAU = Math.PI * 2;
const TRANSPARENT = 'rgba(0,0,0,0)';

/** 极弱的环境漂移光，保证玻璃面板下方始终有东西可被模糊。 */
function drawAmbient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  palette: ScenePalette,
): void {
  const span = Math.max(width, height) * 0.9;
  const spots: Array<[number, number, number]> = [
    [0.24 + 0.05 * Math.sin(t * 0.08), 0.3 + 0.04 * Math.cos(t * 0.1), 0.07],
    [0.76 + 0.05 * Math.cos(t * 0.06 + 1.2), 0.7 + 0.05 * Math.sin(t * 0.07), 0.06],
  ];
  for (const [px, py, a] of spots) {
    const cx = width * px;
    const cy = height * py;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, span);
    g.addColorStop(0, palette.glow);
    g.addColorStop(1, TRANSPARENT);
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalAlpha = 1;
}

/**
 * 统一绘制圆 / 曲奇：两者是同一个参数化形状（lobes=0 退化成正圆），
 * 所以 morph 时只是参数在插值，不会出现两套绘制逻辑交接的跳变。
 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  s: ShapeParams,
): void {
  const minDim = Math.min(width, height);
  const cx = width * s.cx;
  const cy = height * s.cy;
  const breathe = 1 + Math.sin(t * 0.8) * 0.015;
  const r = minDim * s.r * breathe;
  const [cr, cg, cb] = s.color;
  const col = (a: number) => `rgba(${cr | 0},${cg | 0},${cb | 0},${a})`;

  // 外圈柔光
  const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.55);
  halo.addColorStop(0, col(s.halo));
  halo.addColorStop(1, TRANSPARENT);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.55, 0, TAU);
  ctx.fill();

  // 轮廓：lobes 越大花瓣越明显，lobes=0 时退化成正圆
  const spin = t * 0.55 * s.spin;
  const steps = 200;
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * TAU;
    // 主瓣 6 + 次级瓣 3。次级幅度 0.55、相位错开 1.2rad：
    // 相邻花瓣会一大一小，读起来像被咬过的不规则曲奇；
    // 次级相位速度压到 1.15，只缓慢流动，不会高频扭动。
    const ripple =
      s.amp *
      (Math.sin(s.lobes * a + spin * 2) +
        0.42 * Math.sin(s.lobes * 0.5 * a - spin * 3.1));
    const rr = r * (1 + ripple);
    const aa = a + spin * 0.35 + s.twist;
    const x = cx + Math.cos(aa) * rr;
    const y = cy + Math.sin(aa) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const body = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.3, r * 0.1, cx, cy, r);
  body.addColorStop(0, col(0.95));
  body.addColorStop(0.72, col(0.82));
  body.addColorStop(1, col(0.62));
  ctx.fillStyle = body;
  ctx.fill();
}

/**
 * 纯函数绘制：只依赖 timeMs 与 shape，因此多个 canvas 只要传同一时刻就能像素一致。
 * 坐标必须基于 width/height 归一化，才能让 1/N 分辨率的离屏画布放大后与主画布对齐。
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  state: AppState,
  options: SceneOptions = {},
): void {
  const palette = options.palette ?? DARK_PALETTE[state];
  const speed = options.speed ?? 1;
  const t = timeMs * 0.001 * speed + (options.phase ?? 0);
  const shape = options.shape ?? shapeOf(state);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1;

  drawAmbient(ctx, width, height, t, palette);
  drawShape(ctx, width, height, t, shape);

  ctx.restore();
}
