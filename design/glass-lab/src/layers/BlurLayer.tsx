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

/**
 * 低分辨率画布上的 1 个像素放大后覆盖 downsample × dpr 个设备像素，
 * 也就是说放大后“一个格子”的边长就是这块足迹。
 *
 * 当 blur/downsample 远小于足迹时，双线性插值只能抹平格子内部，抹不掉格子的
 * 边界与形状折线（尤其 L2 那圈高对比描边），放大后就是明显的阶梯/块状。
 * 因此把设备空间半径抬到足迹的 1/4：1/2 降采样几乎无感，1/4、1/8 只是把
 * “不可能存在的细节”抹平，换来所有档位都不出现方格。
 */
const MIN_RADIUS_RATIO = 0.25;

/** 半径低于足迹的 1/2 时再加一级放大插值（把一次大倍数放大拆成两次小倍数）。 */
const MID_PASS_RATIO = 0.5;

/**
 * L3 模糊层：把 L1 底色 + L2 形状重绘到 1/N 分辨率的离屏画布，模糊后放大铺满。
 * 全应用只有这一处背景模糊，L4 的 backdrop-filter 只叠加一次。
 *
 * 每帧成本（1080p / dpr 钳到 2 / 1/4 降采样为例，按开销排序）：
 *
 * 1. 主画布 drawImage + filter blur：**最大头**。目标是 1920×1080 的 backing store
 *    （约 830 万像素），blur 需要水平、垂直两遍可分离卷积，半径越大采样点越多；
 *    这块成本只跟「输出像素数 × 半径」有关，降采样完全省不掉。
 * 2. clearRect + globalAlpha 合成：一次全屏写入带宽，约 33MB/帧（dpr=2 时）。
 * 3. 低分辨率重绘：fillRect + drawScene，像素量只有全屏的 1/downsample²，
 *    是唯一随降采样倍率下降的 CPU 光栅化成本；drawScene 内部每帧还会 new 一个
 *    radial gradient（小对象分配，属于 L2 共享绘制代码，不在本层优化范围内）。
 * 4. （仅在半径过小时）中间画布的一次小尺寸 drawImage：面积是 1/(downsample/2)²，
 *    相对第 1 项可以忽略。
 *
 * 现在的做法：L3 不填底色，只把「模糊后的 L2」以 alpha 叠在清晰的 L2 上。
 * L1 纯色由 BackgroundLayer 负责，这里再糊一遍背景只会把动态层压成灰膜。
 */
export function BlurLayer({ state, speed, blur, downsample, alpha }: BlurLayerProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  /** 两级放大用的中间画布（只有 1/4、1/8 档才需要）。 */
  const midRef = useRef<HTMLCanvasElement | null>(null);

  // 与 MotionLayer 共用同一个 morph 状态；第二个调用会被幂等检查吞掉。
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


    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let mid: HTMLCanvasElement | null = null;
    let mctx: CanvasRenderingContext2D | null = null;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // 主画布与 MotionLayer 一致：dpr 钳到 2，避免 3x 屏上像素量翻 2.25 倍。
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      off.width = Math.max(1, Math.ceil(w / downsample));
      off.height = Math.max(1, Math.ceil(h / downsample));

      if (downsample >= 4) {
        mid = midRef.current ?? (midRef.current = document.createElement('canvas'));
        mctx = mid.getContext('2d');
        // 中间画布取 1/(downsample/2)：8× 放大拆成 4× + 2×，插值残留更少。
        const midDiv = Math.max(1, downsample >> 1);
        mid.width = Math.max(1, Math.ceil(w / midDiv));
        mid.height = Math.max(1, Math.ceil(h / midDiv));
      } else {
        mid = null;
        mctx = null;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // 半径只跟 blur / downsample / dpr 有关，提到帧外算，帧内不做算术。
    const footprint = downsample * dpr;
    const radius = blur > 0 ? Math.max(blur / downsample, footprint * MIN_RADIUS_RATIO) : 0;
    const useMid = radius > 0 && radius < footprint * MID_PASS_RATIO;

    let raf = 0;
    const frame = (now: number) => {
      // ---- 1) 低分辨率重绘：L2 形状 ----
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalAlpha = 1;
      octx.globalCompositeOperation = 'source-over';
      // drawScene 内部会先 clearRect，所以底色不能先刷，只能之后垫到形状下面。
      drawScene(octx, off.width, off.height, now, state, {
        speed,
        palette: DARK_PALETTE[state],
        shape: morphAt(now),
        // L3 只有 1/N 分辨率且最终还要模糊，没必要再做一遍融合合成；
        // 指针圆也不参与，否则模糊会在圆外糊出一圈光。
        fuse: false,
        pointer: false,
      });

      // ---- 2) 不填底色：L3 只叠「模糊后的形状」。
      // L1 纯色已经由 BackgroundLayer 铺满，这里再糊一遍背景只会把 L2 压平。
      // 叠加结果 = 清晰 L2 + alpha × 模糊 L2，读完更像「光晕扩散」而不是「一层灰膜」。

      // ---- 3) 可选的一级中间放大 ----
      let source: HTMLCanvasElement = off;
      if (useMid && mid && mctx) {
        const midCanvas = mid;
        const midCtx = mctx;
        midCtx.setTransform(1, 0, 0, 1, 0, 0);
        midCtx.imageSmoothingEnabled = true;
        midCtx.imageSmoothingQuality = 'high';
        midCtx.clearRect(0, 0, midCanvas.width, midCanvas.height);
        midCtx.drawImage(off, 0, 0, midCanvas.width, midCanvas.height);
        source = midCanvas;
      }

      // ---- 4) 模糊 + 放大回全屏（本层最贵的一步）----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = radius > 0 ? `blur(${radius}px)` : 'none';
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      ctx.restore();

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
