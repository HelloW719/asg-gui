import type { VisualState } from "../types/cli";

export type GlassSceneState =
  | "booting"
  | "healthy"
  | "working"
  | "restarting"
  | "degraded"
  | "error";

export interface GlassPalette {
  primary: string;
  secondary: string;
  glow: string;
  line: string;
}

export interface ShapeParams {
  cx: number;
  cy: number;
  r: number;
  lobes: number;
  amp: number;
  spin: number;
  color: [number, number, number];
  halo: number;
}

const TAU = Math.PI * 2;
const TRANSPARENT = "rgba(0,0,0,0)";
const BODY_ALPHA_DARK = 0.84;
const BODY_ALPHA_LIGHT = 0.68;
const POINTER_RADIUS = 0.055;
const MERGE_RANGE = 0.11;
const MB_SCALE = 3;

const DARK_PALETTE: Record<GlassSceneState, GlassPalette> = {
  booting: {
    primary: "#8aa3c4",
    secondary: "#41536b",
    glow: "rgba(126,152,186,0.30)",
    line: "rgba(198,214,235,0.42)",
  },
  healthy: {
    primary: "#34d399",
    secondary: "#159a8e",
    glow: "rgba(52,211,153,0.30)",
    line: "rgba(172,255,243,0.42)",
  },
  working: {
    primary: "#63a4ff",
    secondary: "#2a5fbf",
    glow: "rgba(99,164,255,0.30)",
    line: "rgba(188,218,255,0.42)",
  },
  restarting: {
    primary: "#ffbe63",
    secondary: "#a8691c",
    glow: "rgba(255,190,99,0.28)",
    line: "rgba(255,228,186,0.42)",
  },
  degraded: {
    primary: "#f5c451",
    secondary: "#9a8420",
    glow: "rgba(245,196,81,0.24)",
    line: "rgba(255,242,190,0.38)",
  },
  error: {
    primary: "#f5c451",
    secondary: "#a37f1f",
    glow: "rgba(245,196,81,0.28)",
    line: "rgba(255,226,150,0.44)",
  },
};

const LIGHT_PALETTE: Record<GlassSceneState, GlassPalette> = {
  booting: {
    primary: "#61748b",
    secondary: "#425369",
    glow: "rgba(83,108,136,0.18)",
    line: "rgba(48,68,91,0.36)",
  },
  healthy: {
    primary: "#168d72",
    secondary: "#0f6b5b",
    glow: "rgba(26,148,113,0.18)",
    line: "rgba(27,108,86,0.34)",
  },
  working: {
    primary: "#397bd0",
    secondary: "#285ca6",
    glow: "rgba(57,123,208,0.17)",
    line: "rgba(39,87,151,0.34)",
  },
  restarting: {
    primary: "#ba7c22",
    secondary: "#8f5d15",
    glow: "rgba(195,129,34,0.17)",
    line: "rgba(133,88,26,0.34)",
  },
  degraded: {
    primary: "#b28220",
    secondary: "#866119",
    glow: "rgba(184,133,32,0.16)",
    line: "rgba(128,91,23,0.32)",
  },
  error: {
    primary: "#b47b1c",
    secondary: "#845813",
    glow: "rgba(180,123,28,0.18)",
    line: "rgba(126,83,18,0.34)",
  },
};

export const VISUAL_STATE_LABEL: Record<GlassSceneState, string> = {
  booting: "正在探测",
  healthy: "稳定运行",
  working: "任务执行",
  restarting: "整栈重启",
  degraded: "部分降级",
  error: "运行故障",
};

export function sceneStateForVisual(state: VisualState): GlassSceneState {
  if (state === "stable") return "healthy";
  if (state === "degraded") return "degraded";
  if (state === "failed") return "error";
  if (state === "starting") return "working";
  if (state === "restarting") return "restarting";
  if (state === "loading") return "booting";
  if (state === "stopped") return "degraded";
  return "booting";
}

export function paletteFor(
  state: GlassSceneState,
  theme: "dark" | "light",
): GlassPalette {
  return (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE)[state];
}

export function shapeOf(
  state: GlassSceneState,
  theme: "dark" | "light",
): ShapeParams {
  const dark = theme === "dark";
  switch (state) {
    case "healthy":
      return {
        cx: 0.9,
        cy: 0.84,
        r: 0.5,
        lobes: 6,
        amp: 0,
        spin: 1,
        color: dark ? [52, 211, 153] : [39, 148, 121],
        halo: 0.26,
      };
    case "degraded":
    case "error":
      return {
        cx: 0.1,
        cy: 0.18,
        r: 0.5,
        lobes: 6,
        amp: 0,
        spin: 1,
        color: dark ? [245, 196, 81] : [184, 132, 29],
        halo: 0.26,
      };
    case "working":
      return {
        cx: 0.5,
        cy: 0.5,
        r: 0.16,
        lobes: 6,
        amp: 0.13,
        spin: 1,
        color: dark ? [99, 164, 255] : [57, 123, 208],
        halo: 0.2,
      };
    case "restarting":
      return {
        cx: 0.5,
        cy: 0.5,
        r: 0.16,
        lobes: 6,
        amp: 0.13,
        spin: 1,
        color: dark ? [255, 190, 99] : [186, 124, 34],
        halo: 0.2,
      };
    case "booting":
      return {
        cx: 0.5,
        cy: 0.5,
        r: 0.16,
        lobes: 6,
        amp: 0.13,
        spin: 1,
        color: dark ? [138, 163, 196] : [97, 116, 139],
        halo: 0.2,
      };
  }
}

export function morphShape(
  from: ShapeParams,
  to: ShapeParams,
  raw: number,
): ShapeParams {
  const progress = Math.min(1, Math.max(0, raw));
  const smooth = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  const shapeProgress = Math.min(1, Math.max(0, (progress - 0.3) / 0.7));
  const shapeSmooth =
    shapeProgress * shapeProgress * shapeProgress * (shapeProgress * (shapeProgress * 6 - 15) + 10);
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
  return {
    cx: lerp(from.cx, to.cx, smooth),
    cy: lerp(from.cy, to.cy, smooth),
    r: lerp(from.r, to.r, smooth),
    lobes: to.lobes,
    amp: lerp(from.amp, to.amp, shapeSmooth),
    spin: to.spin,
    color: [
      lerp(from.color[0], to.color[0], shapeSmooth),
      lerp(from.color[1], to.color[1], shapeSmooth),
      lerp(from.color[2], to.color[2], shapeSmooth),
    ],
    halo: lerp(from.halo, to.halo, shapeSmooth),
  };
}

interface PointerSample {
  x: number;
  y: number;
  active: boolean;
}

let targetPointer = { x: 0.62, y: 0.58 };
let smoothedPointer = { x: 0.62, y: 0.58 };
let pointerActive = false;
let pointerUpdatedAt = 0;
let cachedPointer: PointerSample = {
  x: smoothedPointer.x,
  y: smoothedPointer.y,
  active: false,
};

export function installPointerSource(): () => void {
  const move = (event: PointerEvent) => {
    targetPointer = {
      x: event.clientX / Math.max(1, window.innerWidth),
      y: event.clientY / Math.max(1, window.innerHeight),
    };
    pointerActive = true;
  };
  const leave = () => {
    pointerActive = false;
  };
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerleave", leave);
  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerleave", leave);
  };
}

function pointerAt(now: number): PointerSample {
  if (pointerUpdatedAt > 0 && now - pointerUpdatedAt < 0.5) return cachedPointer;
  const dt = pointerUpdatedAt > 0 ? Math.min(0.05, (now - pointerUpdatedAt) / 1000) : 1 / 60;
  pointerUpdatedAt = now;
  const ease = 1 - Math.exp(-dt * 7);
  smoothedPointer = {
    x: smoothedPointer.x + (targetPointer.x - smoothedPointer.x) * ease,
    y: smoothedPointer.y + (targetPointer.y - smoothedPointer.y) * ease,
  };
  cachedPointer = { ...smoothedPointer, active: pointerActive };
  return cachedPointer;
}

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
    [0.24 + 0.05 * Math.sin(time * 0.08), 0.3 + 0.04 * Math.cos(time * 0.1), 0.07],
    [0.76 + 0.05 * Math.cos(time * 0.06 + 1.2), 0.7 + 0.05 * Math.sin(time * 0.07), 0.06],
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
  halo.addColorStop(0, `rgba(${red | 0},${green | 0},${blue | 0},${shape.halo * 0.45})`);
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
  const color = (value: number) => `rgba(${red | 0},${green | 0},${blue | 0},${value})`;
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
  theme: "dark" | "light";
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
  const bodyAlpha = options.theme === "dark" ? BODY_ALPHA_DARK : BODY_ALPHA_LIGHT;
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
