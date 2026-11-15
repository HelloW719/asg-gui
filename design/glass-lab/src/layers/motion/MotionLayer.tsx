import { useEffect, useRef } from 'react';
import type { AppState } from '../../types';
import { DARK_PALETTE, drawScene } from './scene';
import { morphAt, requestMorph } from './morph';
import { installPointerSource } from './pointer';

export interface MotionLayerProps {
  state: AppState;
  speed: number;
}

/** L2 动态层：单个 canvas，rAF 驱动，尽力与 L3 使用同一份纯函数几何。 */
export function MotionLayer({ state, speed }: MotionLayerProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  // 状态切换时启动形状 morph；重复调用是幂等的。
  useEffect(() => {
    requestMorph(state);
  }, [state]);

  // 指针光源只需要装一次监听，两个 canvas 共用同一份状态。
  useEffect(() => installPointerSource(), []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const palette = DARK_PALETTE[state];

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, canvas.width / dpr, canvas.height / dpr, now, state, {
        speed,
        palette,
        shape: morphAt(now),
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [state, speed]);

  return <canvas ref={ref} className="layer layer-motion" aria-hidden />;
}
