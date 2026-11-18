export interface PointerPoint {
  x: number;
  y: number;
}

export type PointerPhase =
  | "hidden"
  | "gathering"
  | "tracking"
  | "dissolving";

export interface PointerSample extends PointerPoint {
  active: boolean;
  presence: number;
  phase: PointerPhase;
  phaseProgress: number;
  transitionStartedAt: number;
  entryPoint: PointerPoint;
  exitPoint: PointerPoint;
}

export interface PointerBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface NormalizedPointer extends PointerPoint {
  inside: boolean;
}

export const POINTER_GATHER_DURATION_MS = 360;
export const POINTER_EXIT_BURST_MS = 110;
export const POINTER_EXIT_DURATION_MS = 700;

const INITIAL_POINTER = { x: 0.62, y: 0.58 };
const TRACKING_STARTED_AT = 0;

let targetPointer = { ...INITIAL_POINTER };
let smoothedPointer = { ...INITIAL_POINTER };
let lastInsidePoint = { ...INITIAL_POINTER };
let entryPoint = { ...INITIAL_POINTER };
let exitPoint = { ...INITIAL_POINTER };
let pointerActive = false;
let pointerPhase: PointerPhase = "hidden";
let phaseStartedAt = 0;
let pointerUpdatedAt = 0;
let cachedPointer: PointerSample = {
  ...smoothedPointer,
  active: false,
  presence: 0,
  phase: "hidden",
  phaseProgress: 0,
  transitionStartedAt: 0,
  entryPoint: { ...entryPoint },
  exitPoint: { ...exitPoint },
};

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampProgress(value: number): number {
  return clampUnit(value);
}

/** 把窗口坐标转换为玻璃表面内的归一化坐标。 */
export function normalizePointerPosition(
  clientX: number,
  clientY: number,
  bounds: PointerBounds,
): NormalizedPointer {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const x = (clientX - bounds.left) / width;
  const y = (clientY - bounds.top) / height;
  return {
    x: clampUnit(x),
    y: clampUnit(y),
    inside: x >= 0 && x <= 1 && y >= 0 && y <= 1,
  };
}

/** 返回当前阶段在指定时间点的进度。 */
export function pointerPhaseProgress(
  phase: PointerPhase,
  startedAt: number,
  now: number,
): number {
  if (phase === "tracking") return 1;
  if (phase === "hidden") return 0;
  const duration =
    phase === "gathering"
      ? POINTER_GATHER_DURATION_MS
      : POINTER_EXIT_DURATION_MS;
  return clampProgress((now - startedAt) / duration);
}

/**
 * 在玻璃表面内监听指针；返回 cleanup。
 *
 * 离开边界时保留投影到边界上的坐标；窗口失焦和页面隐藏则从最后位置回流。
 */
export function installPointerSource(surface: HTMLElement | null): () => void {
  if (typeof window === "undefined") return () => {};

  const currentBounds = (): PointerBounds => {
    if (surface) {
      const bounds = surface.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      };
    }
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  const beginGather = (position: PointerPoint, now: number) => {
    const wasInactive = !pointerActive;
    targetPointer = { ...position };
    if (wasInactive) smoothedPointer = { ...position };
    lastInsidePoint = { ...position };
    pointerActive = true;

    if (pointerPhase === "gathering" || pointerPhase === "tracking") return;
    phaseStartedAt = now;
    entryPoint = { ...position };
    pointerPhase = "gathering";
  };

  const beginDissolve = (position: PointerPoint, now: number) => {
    if (pointerPhase === "hidden" || pointerPhase === "dissolving") return;
    pointerActive = false;
    smoothedPointer = { ...position };
    exitPoint = { ...position };
    phaseStartedAt = now;
    pointerPhase = "dissolving";
  };

  const move = (event: PointerEvent) => {
    const position = normalizePointerPosition(
      event.clientX,
      event.clientY,
      currentBounds(),
    );
    if (!position.inside) {
      beginDissolve(position, performance.now());
      return;
    }
    beginGather(position, performance.now());
  };

  const leave = () => {
    beginDissolve(lastInsidePoint, performance.now());
  };

  const loseFocus = () => {
    beginDissolve(lastInsidePoint, performance.now());
  };

  const hidePage = () => {
    if (document.visibilityState === "hidden") loseFocus();
  };

  const pointerOut = (event: PointerEvent) => {
    if (!event.relatedTarget) leave();
  };

  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerdown", move, { passive: true });
  window.addEventListener("pointerleave", leave);
  window.addEventListener("pointerout", pointerOut);
  window.addEventListener("blur", loseFocus);
  document.documentElement.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", hidePage);

  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerdown", move);
    window.removeEventListener("pointerleave", leave);
    window.removeEventListener("pointerout", pointerOut);
    window.removeEventListener("blur", loseFocus);
    document.documentElement.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", hidePage);
  };
}

/** 指数平滑跟随，同时推进颗粒汇聚与回流阶段。 */
export function pointerAt(now: number): PointerSample {
  if (pointerUpdatedAt > 0 && now - pointerUpdatedAt < 0.5) {
    return cachedPointer;
  }

  const elapsedMs =
    pointerUpdatedAt > 0
      ? Math.max(0, now - pointerUpdatedAt)
      : 1000 / 60;
  const dt = Math.min(0.05, elapsedMs / 1000);
  pointerUpdatedAt = now;

  const ease = 1 - Math.exp(-dt * 14);
  smoothedPointer = {
    x: smoothedPointer.x + (targetPointer.x - smoothedPointer.x) * ease,
    y: smoothedPointer.y + (targetPointer.y - smoothedPointer.y) * ease,
  };

  let phaseProgress = pointerPhaseProgress(
    pointerPhase,
    phaseStartedAt,
    now,
  );
  if (pointerPhase === "gathering" && phaseProgress >= 1) {
    pointerPhase = "tracking";
    phaseStartedAt = TRACKING_STARTED_AT;
    phaseProgress = 1;
  } else if (pointerPhase === "dissolving" && phaseProgress >= 1) {
    pointerPhase = "hidden";
    phaseStartedAt = now;
    phaseProgress = 0;
  }

  const presence =
    pointerPhase === "tracking"
      ? 1
      : pointerPhase === "gathering"
        ? phaseProgress
        : pointerPhase === "dissolving"
          ? 1 - phaseProgress
          : 0;
  cachedPointer = {
    ...smoothedPointer,
    active: pointerActive,
    presence,
    phase: pointerPhase,
    phaseProgress,
    transitionStartedAt: phaseStartedAt,
    entryPoint: { ...entryPoint },
    exitPoint: { ...exitPoint },
  };
  return cachedPointer;
}

/** 仅用于测试对阶段进度做确定性断言。 */
export function easeParticleProgress(value: number): number {
  const progress = clampProgress(value);
  return progress * progress * (3 - 2 * progress);
}
