export interface PointerSample {
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

export function pointerAt(now: number): PointerSample {
  if (pointerUpdatedAt > 0 && now - pointerUpdatedAt < 0.5) {
    return cachedPointer;
  }
  const dt =
    pointerUpdatedAt > 0
      ? Math.min(0.05, (now - pointerUpdatedAt) / 1000)
      : 1 / 60;
  pointerUpdatedAt = now;
  const ease = 1 - Math.exp(-dt * 7);
  smoothedPointer = {
    x: smoothedPointer.x + (targetPointer.x - smoothedPointer.x) * ease,
    y: smoothedPointer.y + (targetPointer.y - smoothedPointer.y) * ease,
  };
  cachedPointer = { ...smoothedPointer, active: pointerActive };
  return cachedPointer;
}
