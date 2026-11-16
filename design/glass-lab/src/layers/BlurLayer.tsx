import { useEffect, useRef } from 'react';
import type { AppState } from '../types';
import { DARK_PALETTE, drawScene } from './motion/scene';
import { morphAt, requestMorph } from './motion/morph';

export interface BlurLayerProps {
  state: AppState;
  speed: number;
  blur: number;
  downsample: 2 | 4 | 8;
  alpha: number;
}

/** 半径下限：低于这个画布像素数时模糊已落到亚像素，直接不跑。 */
const MIN_RADIUS = 0.25;

/**
 * L3 模糊层：画在 1/N 分辨率的画布上，**放大交给合成器**。
 *
 * - backing store 只有全屏的 1/N² 像素，模糊也在这一层做（半径按像素比缩回）。
 * - 元素 CSS 尺寸仍是全屏，合成器做一次双线性放大，GPU 侧几乎免费。
 * - 不再产生全屏重绘：下方那块整屏磨砂的 backdrop-filter 只重采真正变动的区域。
 */
export function BlurLayer({ state, speed, blur, downsample, alpha }: BlurLayerProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const blurRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    requestMorph(state);
  }, [state]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const off = offRef.current ?? (offRef.current = document.createElement('canvas'));
    const octx = off.getContext('2d');
    if (!octx) return;

    const blurCanvas = blurRef.current ?? (blurRef.current = document.createElement('canvas'));
    const bctx = blurCanvas.getContext('2d');
    if (!bctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    /** 画布像素 → 设备像素的放大倍数。 */
    let upscale = downsample * dpr;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const bw = Math.max(1, Math.ceil(w / downsample));
      const bh = Math.max(1, Math.ceil(h / downsample));

      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      off.width = bw;
      off.height = bh;
      blurCanvas.width = bw;
      blurCanvas.height = bh;

      upscale = (w * dpr) / bw;
    };
    resize();
    window.addEventListener('resize', resize);

    // 目标等效半径（设备像素）：与原实现保持一致。
    const footprint = downsample * dpr;
    const radiusDevice = blur > 0 ? Math.max(blur / downsample, footprint * 0.25) : 0;
    const radius = radiusDevice / upscale;

    let raf = 0;
    const frame = (now: number) => {
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalAlpha = 1;
      octx.globalCompositeOperation = 'source-over';
      drawScene(octx, off.width, off.height, now, state, {
        speed,
        palette: DARK_PALETTE[state],
        shape: morphAt(now),
        fuse: false,
        pointer: false,
      });

      let source: HTMLCanvasElement = off;
      if (radius > MIN_RADIUS) {
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
        bctx.filter = `blur(${radius}px)`;
        bctx.drawImage(off, 0, 0);
        bctx.filter = 'none';
        source = blurCanvas;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = alpha;
      ctx.drawImage(source, 0, 0);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [state, speed, blur, downsample, alpha]);

  return <canvas ref={ref} className="layer layer-blur" aria-hidden />;
}
