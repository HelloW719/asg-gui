import type { AppState } from '../../types';
import { type ShapeParams, shapeOf } from './morph';
import { pointerAt } from './pointer';

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
  /** 是否允许走融合路径；L3 低分辨率层会关闭它，省掉一遍离屏合成 */
  fuse?: boolean;
  /**
   * 是否绘制跟随指针的圆。L3 低分辨率层会关闭它：
   * 圆圈本身不外发光，但再被模糊一遍就会在圆外糊出一圈光，违背这条视觉约束。
   */
  pointer?: boolean;
}

const TAU = Math.PI * 2;
const TRANSPARENT = 'rgba(0,0,0,0)';

/** 指针实体圆的半径（相对 minDim） */
const POINTER_RADIUS = 0.055;
/**
 * 大几何、融合遮罩和跟随圆共用的主体明度。
 * 三者必须完全一致：融合开关只改变边缘处理，不能再改动亮度，
 * 否则快速靠近时会出现一次可见的明度跳变。
 */
const BODY_ALPHA = 0.84;
/** 靠近到这个距离内开始做边缘融合 */
const MERGE_RANGE = 0.11;
const MB_SCALE = 3;

/* ---------------- 几何 ---------------- */

/** 真实形状路径（圆 / 曲奇同一套参数）。 */
function shapeGeometry(
  width: number,
  height: number,
  t: number,
  s: ShapeParams,
): { path: Path2D; cx: number; cy: number; r: number } {
  const minDim = Math.min(width, height);
  const cx = width * s.cx;
  const cy = height * s.cy;
  const breathe = 1 + Math.sin(t * 0.8) * 0.015;
  const r = minDim * s.r * breathe;
  const spin = t * 0.55 * s.spin;

  const path = new Path2D();
  const steps = 200;
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * TAU;
    const ripple =
      s.amp *
      (Math.sin(s.lobes * a + spin * 2) +
        0.42 * Math.sin(s.lobes * 0.5 * a - spin * 3.1));
    const rr = r * (1 + ripple);
    const aa = a + spin * 0.35 + s.twist;
    const x = cx + Math.cos(aa) * rr;
    const y = cy + Math.sin(aa) * rr;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();

  return { path, cx, cy, r };
}

/** 极弱的环境光，保证玻璃面板下方有东西可以被模糊。 */
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

/** 形状自身周围极淡的一圈氛围，远比指针晕慢。 */
function drawHalo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  s: ShapeParams,
): void {
  const { cx, cy, r } = shapeGeometry(width, height, t, s);
  const [cr, cg, cb] = s.color;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.7);
  halo.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},${s.halo * 0.45})`);
  halo.addColorStop(1, TRANSPARENT);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.7, 0, TAU);
  ctx.fill();
}

/** 干净形状：真实路径 + 统一明度，边缘就是路径本身。 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  s: ShapeParams,
): void {
  const { path } = shapeGeometry(width, height, t, s);
  const [cr, cg, cb] = s.color;
  ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${BODY_ALPHA})`;
  ctx.fill(path);
}

/* ---------------- 指针 ---------------- */

/**
 * 指针实体圆。明度与大几何完全一致（BODY_ALPHA），
 * 边缘只留 1–2px 抗锯齿，半径之外直接透明，不向外晕。
 */
function drawPointerCore(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  px: number,
  py: number,
  s: ShapeParams,
): void {
  const lx = px * width;
  const ly = py * height;
  const r = Math.min(width, height) * POINTER_RADIUS;
  const [cr, cg, cb] = s.color;
  const col = (a: number) => `rgba(${cr | 0},${cg | 0},${cb | 0},${a})`;

  const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
  g.addColorStop(0, col(BODY_ALPHA));
  g.addColorStop(0.9, col(BODY_ALPHA));
  g.addColorStop(0.97, col(BODY_ALPHA * 0.45));
  g.addColorStop(1, col(0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(lx, ly, r, 0, TAU);
  ctx.fill();
}

/* ---------------- 边缘融合 ---------------- */

let mbSource: HTMLCanvasElement | null = null;
let mbBlur: HTMLCanvasElement | null = null;

function ensureCanvas(
  current: HTMLCanvasElement | null,
  w: number,
  h: number,
): HTMLCanvasElement {
  const c = current ?? document.createElement('canvas');
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

/**
 * 指针贴近时：形状 + 指针实体放进同一张遮罩，模糊 + 阈值后
 * 两者接触处会长出连接（就是「边缘被吸过去」的变形）。
 *
 * 遮罩统一用 BODY_ALPHA 填充：大几何、独立小球、融合结果三者明度完全一致，
 * 所以融合开关只改变边缘形态（由模糊盖过），不会再出现明度跳变。
 */
function drawFusion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  s: ShapeParams,
  px: number,
  py: number,
): void {
  const coreR = Math.min(width, height) * POINTER_RADIUS;
  const coreX = px * width;
  const coreY = py * height;

  // 固定包围盒：融合只可能发生在「形状 + 吸附距离 + 指针实体」范围内，
  // 所以区域跟指针位置无关，尺寸基本恒定，不会每帧重建离屏画布。
  const minDim = Math.min(width, height);
  const reach = minDim * (s.r + MERGE_RANGE + POINTER_RADIUS) + 32;
  const ccx = s.cx * width;
  const ccy = s.cy * height;
  const gx = Math.max(0, Math.floor((ccx - reach) / 64) * 64);
  const gy = Math.max(0, Math.floor((ccy - reach) / 64) * 64);
  const gx2 = Math.min(width, Math.ceil((ccx + reach) / 64) * 64);
  const gy2 = Math.min(height, Math.ceil((ccy + reach) / 64) * 64);
  const bw = Math.max(1, gx2 - gx);
  const bh = Math.max(1, gy2 - gy);
  const ow = Math.max(1, Math.ceil(bw / MB_SCALE));
  const oh = Math.max(1, Math.ceil(bh / MB_SCALE));

  mbSource = ensureCanvas(mbSource, ow, oh);
  mbBlur = ensureCanvas(mbBlur, ow, oh);

  const sctx = mbSource.getContext('2d');
  const bctx = mbBlur.getContext('2d', { willReadFrequently: true });
  if (!sctx || !bctx) return;

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, ow, oh);
  sctx.setTransform(1 / MB_SCALE, 0, 0, 1 / MB_SCALE, -gx / MB_SCALE, -gy / MB_SCALE);
  sctx.fillStyle = '#fff';
  sctx.fill(shapeGeometry(width, height, t, s).path);
  sctx.beginPath();
  sctx.arc(coreX, coreY, coreR, 0, TAU);
  sctx.fill();

  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, ow, oh);
  bctx.filter = 'blur(3px)';
  bctx.drawImage(mbSource, 0, 0);
  bctx.filter = 'none';

  const img = bctx.getImageData(0, 0, ow, oh);
  const d = img.data;
  const t0 = 122;
  const t1 = 150;
  for (let i = 3; i < d.length; i += 4) {
    let v = (d[i] - t0) / (t1 - t0);
    if (v <= 0) v = 0;
    else if (v >= 1) v = 1;
    else v = v * v * (3 - 2 * v);
    d[i] = v * 255;
  }
  bctx.putImageData(img, 0, 0);

  const [cr, cg, cb] = s.color;
  bctx.globalCompositeOperation = 'source-in';
  bctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${BODY_ALPHA})`;
  bctx.fillRect(0, 0, ow, oh);
  bctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mbBlur, 0, 0, ow, oh, gx, gy, bw, bh);
  ctx.restore();
}

/**
 * 纯函数绘制：只依赖 timeMs 与 shape，因此多个 canvas 只要传同一时刻就能像素一致。
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
  const ptr = pointerAt(timeMs);
  const allowPointer = options.pointer !== false;
  const showPointer = allowPointer && ptr.active;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // 1) 环境光（加色，很弱，只用于给玻璃层一点可模糊的内容）
  ctx.globalCompositeOperation = 'lighter';
  drawAmbient(ctx, width, height, t, palette);

  // 2) 之后全部 source-over：形状在前，指针圆在最上，光只落在圆内。
  ctx.globalCompositeOperation = 'source-over';
  drawHalo(ctx, width, height, t, shape);

  const minDim = Math.min(width, height);
  const dist = Math.hypot(
    width * ptr.x - width * shape.cx,
    height * ptr.y - height * shape.cy,
  );
  const gap = dist - minDim * shape.r;
  const range = minDim * MERGE_RANGE;

  const allowFuse = options.fuse !== false;

  // 融合路径和独立路径的明度已经统一为 BODY_ALPHA；
  // 切换时只剩边缘形态差异，由融合自身的模糊盖过去，不再出现亮度跳变。
  if (allowFuse && showPointer && gap < range) {
    drawFusion(ctx, width, height, t, shape, ptr.x, ptr.y);
  } else {
    drawShape(ctx, width, height, t, shape);
    if (showPointer) {
      drawPointerCore(ctx, width, height, ptr.x, ptr.y, shape);
    }
  }

  ctx.restore();
}
