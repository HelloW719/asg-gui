/**
 * 鼠标跟随光源的共享状态。
 *
 * 两个 canvas（L2 主画布、L3 离屏画布）在同一帧调用 drawScene，
 * 这里用时间戳去重，保证同一帧只推进一次平滑，取到的坐标完全一致。
 */

let targetX = 0.5;
let targetY = 0.5;
let x = 0.5;
let y = 0.5;
let active = false;
let lastAt = 0;

interface PointerSample {
  x: number;
  y: number;
  active: boolean;
}

let cached: PointerSample = { x: 0.5, y: 0.5, active: false };

/** 在 window 上监听指针；返回 cleanup。 */
export function installPointerSource(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onMove = (event: PointerEvent) => {
    targetX = event.clientX / window.innerWidth;
    targetY = event.clientY / window.innerHeight;
    active = true;
  };
  const onLeave = () => {
    active = false;
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerleave', onLeave);
  };
}

/** 指数平滑，跟帧率无关。同一帧重复调用返回同一份结果。 */
export function pointerAt(now: number): PointerSample {
  if (lastAt > 0 && now - lastAt < 0.5) return cached;

  const dt = lastAt > 0 ? Math.min(0.05, (now - lastAt) / 1000) : 1 / 60;
  lastAt = now;
  const k = 1 - Math.exp(-dt * 7);
  x += (targetX - x) * k;
  y += (targetY - y) * k;

  cached = { x, y, active };
  return cached;
}
