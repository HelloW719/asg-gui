import {
  paletteFor,
  type GlassPalette,
  type GlassSceneState,
  type ShapeParams,
  type ThemeMode,
} from "./model";
import { pointerAt, type PointerSample } from "./pointer";

const TAU = Math.PI * 2;
const TRANSPARENT = "rgba(0,0,0,0)";
const BODY_ALPHA_DARK = 0.84;
const BODY_ALPHA_LIGHT = 0.68;
const POINTER_RADIUS = 0.055;
const MERGE_RANGE = 0.11;
const MB_SCALE = 3;

function shapeGeometry(
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
): { path: Path2D; cx: number; cy: number; r: number } {
  const minDim = Math.min(width, height);
  const cx = width * shape.cx;
  const cy = height * shape.cy;
  const breathe = 1 + Math.sin(time * 0.8) * 0.015;
  const radius = minDim * shape.r * breathe;
  const spin = time * 0.55 * shape.spin;
  const path = new Path2D();
  const steps = 160;

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * TAU;
    const ripple =
      shape.amp *
      (Math.sin(shape.lobes * angle + spin * 2) +
        0.42 * Math.sin(shape.lobes * 0.5 * angle - spin * 3.1));
    const currentRadius = radius * (1 + ripple);
    const currentAngle = angle + spin * 0.35;
    const x = cx + Math.cos(currentAngle) * currentRadius;
    const y = cy + Math.sin(currentAngle) * currentRadius;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return { path, cx, cy, r: radius };
}

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
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
): void {
  const geometry = shapeGeometry(width, height, time, shape);
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
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
  alpha: number,
): void {
  const { path } = shapeGeometry(width, height, time, shape);
  const [red, green, blue] = shape.color;
  context.fillStyle = `rgba(${red | 0},${green | 0},${blue | 0},${alpha})`;
  context.fill(path);
}

function drawPointer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointer: PointerSample,
  shape: ShapeParams,
  alpha: number,
): void {
  const x = pointer.x * width;
  const y = pointer.y * height;
  const radius = Math.min(width, height) * POINTER_RADIUS;
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

function drawFusion(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  shape: ShapeParams,
  pointer: PointerSample,
  alpha: number,
): void {
  const coreRadius = Math.min(width, height) * POINTER_RADIUS;
  const coreX = pointer.x * width;
  const coreY = pointer.y * height;
  const minDim = Math.min(width, height);
  const reach = minDim * (shape.r + MERGE_RANGE + POINTER_RADIUS) + 32;
  const centerX = shape.cx * width;
  const centerY = shape.cy * height;
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
  source.fill(shapeGeometry(width, height, time, shape).path);
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
    let value = (image.data[index] - 122) / 28;
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
}

export interface DrawSceneOptions {
  state: GlassSceneState;
  theme: ThemeMode;
  shape: ShapeParams;
  speed?: number;
  pointer?: boolean;
  fuse?: boolean;
}

export function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  options: DrawSceneOptions,
): void {
  const speed = options.speed ?? 1;
  const time = (timeMs * 0.001 * speed) % 1000;
  const palette = paletteFor(options.state, options.theme);
  const bodyAlpha =
    options.theme === "dark" ? BODY_ALPHA_DARK : BODY_ALPHA_LIGHT;
  const pointer = pointerAt(timeMs);
  const showPointer = options.pointer !== false && pointer.active;
  const canFuse = options.fuse !== false;

  context.clearRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation = "lighter";
  drawAmbient(context, width, height, time, palette);
  context.globalCompositeOperation = "source-over";
  drawHalo(context, width, height, time, options.shape);

  const minDim = Math.min(width, height);
  const distance = Math.hypot(
    pointer.x * width - options.shape.cx * width,
    pointer.y * height - options.shape.cy * height,
  );
  const gap = distance - minDim * options.shape.r;
  const mergeRange = minDim * MERGE_RANGE;

  if (canFuse && showPointer && gap < mergeRange) {
    drawFusion(
      context,
      width,
      height,
      time,
      options.shape,
      pointer,
      bodyAlpha,
    );
  } else {
    drawShape(context, width, height, time, options.shape, bodyAlpha);
    if (showPointer) {
      drawPointer(context, width, height, pointer, options.shape, bodyAlpha);
    }
  }
  context.restore();
}
