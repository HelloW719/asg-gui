import {
  createShapeGeometry,
  type ShapeGeometry,
} from "./geometry";
import {
  paletteFor,
  type GlassPalette,
  type GlassSceneState,
  type ShapeParams,
  type ThemeMode,
} from "./model";
import type { PointerSample } from "./pointer";

const TAU = Math.PI * 2;
const TRANSPARENT = "rgba(0,0,0,0)";
const BODY_ALPHA_DARK = 0.84;
const BODY_ALPHA_LIGHT = 0.68;
const POINTER_RADIUS = 0.055;
const MERGE_RANGE = 0.11;
const MB_SCALE = 3;

function drawAmbient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  palette: GlassPalette,
): void {
  const span = Math.max(width, height) * 0.9;
  const spots: Array<[number, number, number]> = [
    [
      0.24 + 0.05 * Math.sin(time * 0.08),
      0.3 + 0.04 * Math.cos(time * 0.1),
      0.07,
    ],
    [
      0.76 + 0.05 * Math.cos(time * 0.06 + 1.2),
      0.7 + 0.05 * Math.sin(time * 0.07),
      0.06,
    ],
  ];

  for (const [x, y, alpha] of spots) {
    const px = width * x;
    const py = height * y;
    const gradient = context.createRadialGradient(px, py, 0, px, py, span);
    gradient.addColorStop(0, palette.glow);
    gradient.addColorStop(1, TRANSPARENT);
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  context.globalAlpha = 1;
}

function drawHalo(
  context: CanvasRenderingContext2D,
  geometry: ShapeGeometry,
  shape: ShapeParams,
): void {
  const [red, green, blue] = shape.color;
  const halo = context.createRadialGradient(
    geometry.cx,
    geometry.cy,
    geometry.r * 0.8,
    geometry.cx,
    geometry.cy,
    geometry.r * 1.7,
  );
  halo.addColorStop(
    0,
    `rgba(${red | 0},${green | 0},${blue | 0},${shape.halo * 0.45})`,
  );
  halo.addColorStop(1, TRANSPARENT);
  context.fillStyle = halo;
  context.beginPath();
  context.arc(geometry.cx, geometry.cy, geometry.r * 1.7, 0, TAU);
  context.fill();
}

function drawShape(
  context: CanvasRenderingContext2D,
  geometry: ShapeGeometry,
  shape: ShapeParams,
  alpha: number,
): void {
  const [red, green, blue] = shape.color;
  context.fillStyle = `rgba(${red | 0},${green | 0},${blue | 0},${alpha})`;
  context.fill(geometry.path);
}

function drawPointerCore(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointer: PointerSample,
  shape: ShapeParams,
  alpha: number,
  time: number,
): void {
  const x = pointer.x * width;
  const y = pointer.y * height;
  const pulse = 1 + Math.sin(time * 1.45) * 0.025;
  const radius = Math.min(width, height) * POINTER_RADIUS * pulse;
  const [red, green, blue] = shape.color;
  const color = (value: number) =>
    `rgba(${red | 0},${green | 0},${blue | 0},${value})`;
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color(alpha));
  gradient.addColorStop(0.9, color(alpha));
  gradient.addColorStop(0.97, color(alpha * 0.45));
  gradient.addColorStop(1, color(0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
}

let fusionSource: HTMLCanvasElement | null = null;
let fusionBlur: HTMLCanvasElement | null = null;

function ensureCanvas(
  current: HTMLCanvasElement | null,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = current ?? document.createElement("canvas");
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return canvas;
}

/**
 * Glass Lab 的 metaball 融合：形状与指针放进同一张低分辨率遮罩，
 * 模糊后做阈值化，小球靠近时会连续长出被大几何吸附的连接。
 */
function drawFusion(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  geometry: ShapeGeometry,
  shape: ShapeParams,
  pointer: PointerSample,
  alpha: number,
): void {
  const coreRadius =
    Math.min(width, height) *
    POINTER_RADIUS *
    (1 + Math.sin(time * 1.45) * 0.025);
  const coreX = pointer.x * width;
  const coreY = pointer.y * height;
  const minDim = Math.min(width, height);
  const reach = minDim * (shape.r + MERGE_RANGE + POINTER_RADIUS) + 32;
  const centerX = geometry.cx;
  const centerY = geometry.cy;
  const left = Math.max(0, Math.floor((centerX - reach) / 64) * 64);
  const top = Math.max(0, Math.floor((centerY - reach) / 64) * 64);
  const right = Math.min(width, Math.ceil((centerX + reach) / 64) * 64);
  const bottom = Math.min(height, Math.ceil((centerY + reach) / 64) * 64);
  const boxWidth = Math.max(1, right - left);
  const boxHeight = Math.max(1, bottom - top);
  const scaledWidth = Math.max(1, Math.ceil(boxWidth / MB_SCALE));
  const scaledHeight = Math.max(1, Math.ceil(boxHeight / MB_SCALE));

  fusionSource = ensureCanvas(fusionSource, scaledWidth, scaledHeight);
  fusionBlur = ensureCanvas(fusionBlur, scaledWidth, scaledHeight);
  const source = fusionSource.getContext("2d");
  const blur = fusionBlur.getContext("2d", { willReadFrequently: true });
  if (!source || !blur) return;

  source.setTransform(1, 0, 0, 1, 0, 0);
  source.clearRect(0, 0, scaledWidth, scaledHeight);
  source.setTransform(
    1 / MB_SCALE,
    0,
    0,
    1 / MB_SCALE,
    -left / MB_SCALE,
    -top / MB_SCALE,
  );
  source.fillStyle = "#fff";
  source.fill(geometry.path);
  source.beginPath();
  source.arc(coreX, coreY, coreRadius, 0, TAU);
  source.fill();

  blur.setTransform(1, 0, 0, 1, 0, 0);
  blur.clearRect(0, 0, scaledWidth, scaledHeight);
  blur.filter = "blur(3px)";
  blur.drawImage(fusionSource, 0, 0);
  blur.filter = "none";

  const image = blur.getImageData(0, 0, scaledWidth, scaledHeight);
  for (let index = 3; index < image.data.length; index += 4) {
    let value = ((image.data[index] ?? 0) - 122) / 28;
    if (value <= 0) value = 0;
    else if (value >= 1) value = 1;
    else value = value * value * (3 - 2 * value);
    image.data[index] = value * 255;
  }
  blur.putImageData(image, 0, 0);

  const [red, green, blue] = shape.color;
  blur.globalCompositeOperation = "source-in";
  blur.fillStyle = `rgba(${red | 0},${green | 0},${blue | 0},${alpha})`;
  blur.fillRect(0, 0, scaledWidth, scaledHeight);
  blur.globalCompositeOperation = "source-over";

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    fusionBlur,
    0,
    0,
    scaledWidth,
    scaledHeight,
    left,
    top,
    boxWidth,
    boxHeight,
  );
  context.restore();
}

export interface DrawSceneOptions {
  state: GlassSceneState;
  theme: ThemeMode;
  shape: ShapeParams;
  speed?: number;
  geometry?: ShapeGeometry;
  pointer?: PointerSample | null;
}

export function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  options: DrawSceneOptions,
): void {
  const speed = options.speed ?? 1;
  const time = timeMs * 0.001 * speed;
  const palette = paletteFor(options.state, options.theme);
  const alpha =
    options.theme === "dark" ? BODY_ALPHA_DARK : BODY_ALPHA_LIGHT;
  const geometry =
    options.geometry ??
    createShapeGeometry(width, height, time, options.shape);

  context.clearRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation = "lighter";
  drawAmbient(context, width, height, time, palette);
  context.globalCompositeOperation = "source-over";
  drawHalo(context, geometry, options.shape);

  const pointer = options.pointer;
  const minDim = Math.min(width, height);
  const distance = pointer
    ? Math.hypot(
        pointer.x * width - geometry.cx,
        pointer.y * height - geometry.cy,
      )
    : Number.POSITIVE_INFINITY;
  const gap = distance - minDim * options.shape.r;
  const canFuse =
    pointer?.phase === "tracking" && gap < minDim * MERGE_RANGE;

  if (pointer && canFuse) {
    drawFusion(
      context,
      width,
      height,
      time,
      geometry,
      options.shape,
      pointer,
      alpha,
    );
  } else {
    drawShape(context, geometry, options.shape, alpha);
    if (pointer?.phase === "tracking") {
      drawPointerCore(
        context,
        width,
        height,
        pointer,
        options.shape,
        alpha,
        time,
      );
    }
  }
  context.restore();
}
