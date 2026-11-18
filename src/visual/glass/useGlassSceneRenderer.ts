import {
  onBeforeUnmount,
  onMounted,
  watch,
  type Ref,
} from "vue";
import type { VisualState } from "@/types/cli";
import { drawScene } from "./drawing";
import {
  sceneStateForVisual,
  type ThemeMode,
} from "./model";
import { installPointerSource } from "./pointer";
import { morphShape, shapeOf } from "./shapes";
import type { ShapeParams } from "./model";

interface GlassSceneRendererOptions {
  root: Ref<HTMLElement | null>;
  motionCanvas: Ref<HTMLCanvasElement | null>;
  blurCanvas: Ref<HTMLCanvasElement | null>;
  visualState: () => VisualState;
  theme: () => ThemeMode;
  reducedMotion: () => boolean;
}

const DOWN_SAMPLE = 4;
const MORPH_DURATION = 1400;

export function useGlassSceneRenderer(options: GlassSceneRendererOptions): void {
  let animationFrame = 0;
  let removePointerListener: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let restartScene: (() => void) | null = null;
  let disposeScene: (() => void) | undefined;

  const sceneState = () => sceneStateForVisual(options.visualState());
  let morphFrom = shapeOf(sceneState(), options.theme());
  let morphTo = morphFrom;
  let morphStartedAt = 0;
  let currentShape = morphFrom;

  function shapeAt(now: number): ShapeParams {
    const progress = Math.min(
      1,
      Math.max(0, (now - morphStartedAt) / MORPH_DURATION),
    );
    currentShape =
      progress >= 1 ? morphTo : morphShape(morphFrom, morphTo, progress);
    return currentShape;
  }

  function requestStateMorph(): void {
    const target = shapeOf(sceneState(), options.theme());
    if (options.reducedMotion()) {
      morphFrom = target;
      morphTo = target;
      currentShape = target;
      restartScene?.();
      return;
    }
    morphFrom = currentShape;
    morphTo = target;
    morphStartedAt = performance.now();
  }

  function mountScene(): (() => void) | undefined {
    const host = options.root.value;
    const output = options.motionCanvas.value;
    const blurredOutput = options.blurCanvas.value;
    if (!host || !output || !blurredOutput) return;

    const outputContext = output.getContext("2d");
    const blurredContext = blurredOutput.getContext("2d");
    if (!outputContext || !blurredContext) return;

    const downSampled = document.createElement("canvas");
    const downContext = downSampled.getContext("2d");
    if (!downContext) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 1;
    let height = 1;
    let blurUpscale = DOWN_SAMPLE * dpr;
    let stopped = false;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const blurWidth = Math.max(1, Math.ceil(width / DOWN_SAMPLE));
      const blurHeight = Math.max(1, Math.ceil(height / DOWN_SAMPLE));

      output.width = Math.round(width * dpr);
      output.height = Math.round(height * dpr);
      output.style.width = `${width}px`;
      output.style.height = `${height}px`;

      blurredOutput.width = blurWidth;
      blurredOutput.height = blurHeight;
      blurredOutput.style.width = `${width}px`;
      blurredOutput.style.height = `${height}px`;
      downSampled.width = blurWidth;
      downSampled.height = blurHeight;
      blurUpscale = (width * dpr) / blurWidth;
    };

    const drawFrame = (now: number) => {
      if (stopped) return;
      const state = sceneState();
      const shape = shapeAt(now);
      const theme = options.theme();

      outputContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      outputContext.clearRect(0, 0, width, height);
      drawScene(outputContext, width, height, now, { state, theme, shape });

      const blurWidth = blurredOutput.width;
      const blurHeight = blurredOutput.height;
      downContext.setTransform(1, 0, 0, 1, 0, 0);
      downContext.clearRect(0, 0, blurWidth, blurHeight);
      downContext.scale(blurWidth / width, blurHeight / height);
      drawScene(downContext, width, height, now, {
        state,
        theme,
        shape,
        pointer: false,
        fuse: false,
      });
      downContext.setTransform(1, 0, 0, 1, 0, 0);

      blurredContext.setTransform(1, 0, 0, 1, 0, 0);
      blurredContext.clearRect(0, 0, blurWidth, blurHeight);
      blurredContext.filter = `blur(${Math.max(0.8, 20 / blurUpscale)}px)`;
      blurredContext.globalAlpha = 0.45;
      blurredContext.drawImage(downSampled, 0, 0);
      blurredContext.filter = "none";
      blurredContext.globalAlpha = 1;

      if (!options.reducedMotion()) {
        animationFrame = requestAnimationFrame(drawFrame);
      }
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    animationFrame = requestAnimationFrame(drawFrame);

    restartScene = () => {
      cancelAnimationFrame(animationFrame);
      stopped = false;
      resize();
      animationFrame = requestAnimationFrame(drawFrame);
    };

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      resizeObserver = null;
      restartScene = null;
    };
  }

  function restart(): void {
    disposeScene?.();
    morphFrom = shapeOf(sceneState(), options.theme());
    morphTo = morphFrom;
    currentShape = morphFrom;
    morphStartedAt = 0;
    disposeScene = mountScene();
  }

  watch(options.visualState, requestStateMorph);
  watch(
    () => [options.theme(), options.reducedMotion()] as const,
    restart,
  );

  onMounted(() => {
    removePointerListener = installPointerSource();
    disposeScene = mountScene();
  });

  onBeforeUnmount(() => {
    disposeScene?.();
    removePointerListener?.();
  });
}
