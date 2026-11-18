import {
  onBeforeUnmount,
  onMounted,
  watch,
  type Ref,
} from "vue";
import type { VisualState } from "@/types/cli";
import type { GlassFrameRate } from "@/types/appearance";
import { drawScene } from "./drawing";
import { createShapeGeometry } from "./geometry";
import { drawPointerTransient } from "./interaction";
import {
  sceneStateForVisual,
  type ShapeParams,
  type ThemeMode,
} from "./model";
import { installPointerSource, pointerAt } from "./pointer";
import {
  cappedDevicePixelRatio,
  sceneIntervalForFrameRate,
  sceneIntervalForLevel,
  shouldRenderSceneFrame,
  updateSceneCadenceLevel,
} from "./scheduler";
import { morphShape, shapeOf } from "./shapes";

interface GlassSceneRendererOptions {
  root: Ref<HTMLElement | null>;
  motionCanvas: Ref<HTMLCanvasElement | null>;
  blurCanvas: Ref<HTMLCanvasElement | null>;
  particleCanvas: Ref<HTMLCanvasElement | null>;
  visualState: () => VisualState;
  theme: () => ThemeMode;
  reducedMotion: () => boolean;
  frameRate: () => GlassFrameRate;
}

const DOWN_SAMPLE = 4;
const MORPH_DURATION_MS = 1400;

export function useGlassSceneRenderer(options: GlassSceneRendererOptions): void {
  let animationFrame = 0;
  let removePointerListener: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let restartScene: (() => void) | null = null;
  let disposeScene: (() => void) | undefined;
  let sceneDirty = true;

  const sceneState = () => sceneStateForVisual(options.visualState());
  let morphFrom = shapeOf(sceneState(), options.theme());
  let morphTo = morphFrom;
  let morphStartedAt = 0;
  let currentShape = morphFrom;

  function shapeAt(now: number): ShapeParams {
    const progress = Math.min(
      1,
      Math.max(0, (now - morphStartedAt) / MORPH_DURATION_MS),
    );
    currentShape =
      progress >= 1 ? morphTo : morphShape(morphFrom, morphTo, progress);
    return currentShape;
  }

  function requestStateMorph(): void {
    const target = shapeOf(sceneState(), options.theme());
    sceneDirty = true;
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
    const particleOutput = options.particleCanvas.value;
    if (!host || !output || !blurredOutput || !particleOutput) return;

    const outputContext = output.getContext("2d");
    const blurredContext = blurredOutput.getContext("2d");
    const particleContext = particleOutput.getContext("2d");
    if (!outputContext || !blurredContext || !particleContext) return;

    const downSampled = document.createElement("canvas");
    const downContext = downSampled.getContext("2d");
    if (!downContext) return;

    const renderDpr = cappedDevicePixelRatio(window.devicePixelRatio || 1);
    let width = 1;
    let height = 1;
    let blurUpscale = DOWN_SAMPLE * renderDpr;
    let lastSceneFrameAt = -1;
    let trackingWasVisible = false;
    let particlesWereVisible = false;
    let lastAnimationFrameAt = -1;
    let cadenceStartedAt = -1;
    let cadenceFrameCount = 0;
    let cadenceFrameDuration = 0;
    let cadenceLevel = 0;
    let stopped = false;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const blurWidth = Math.max(1, Math.ceil(width / DOWN_SAMPLE));
      const blurHeight = Math.max(1, Math.ceil(height / DOWN_SAMPLE));

      output.width = Math.round(width * renderDpr);
      output.height = Math.round(height * renderDpr);
      output.style.width = `${width}px`;
      output.style.height = `${height}px`;

      particleOutput.width = Math.round(width * renderDpr);
      particleOutput.height = Math.round(height * renderDpr);
      particleOutput.style.width = `${width}px`;
      particleOutput.style.height = `${height}px`;

      blurredOutput.width = blurWidth;
      blurredOutput.height = blurHeight;
      blurredOutput.style.width = `${width}px`;
      blurredOutput.style.height = `${height}px`;
      downSampled.width = blurWidth;
      downSampled.height = blurHeight;
      blurUpscale = (width * renderDpr) / blurWidth;
      sceneDirty = true;
    };

    const drawMotionFrame = (
      now: number,
      pointer: ReturnType<typeof pointerAt> | null,
    ): void => {
      const state = sceneState();
      const shape = shapeAt(now);
      const theme = options.theme();
      const time = now * 0.001;
      const geometry = createShapeGeometry(width, height, time, shape);

      outputContext.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
      drawScene(outputContext, width, height, now, {
        state,
        theme,
        shape,
        geometry,
        pointer,
      });
    };

    const drawBlurFrame = (now: number): void => {
      const state = sceneState();
      const shape = shapeAt(now);
      const theme = options.theme();
      const time = now * 0.001;
      const geometry = createShapeGeometry(width, height, time, shape);
      const blurWidth = blurredOutput.width;
      const blurHeight = blurredOutput.height;
      downContext.setTransform(1, 0, 0, 1, 0, 0);
      downContext.clearRect(0, 0, blurWidth, blurHeight);
      downContext.scale(blurWidth / width, blurHeight / height);
      drawScene(downContext, width, height, now, {
        state,
        theme,
        shape,
        geometry,
      });
      downContext.setTransform(1, 0, 0, 1, 0, 0);

      blurredContext.setTransform(1, 0, 0, 1, 0, 0);
      blurredContext.clearRect(0, 0, blurWidth, blurHeight);
      blurredContext.filter = `blur(${Math.max(0.8, 20 / blurUpscale)}px)`;
      blurredContext.globalAlpha = 0.45;
      blurredContext.drawImage(downSampled, 0, 0);
      blurredContext.filter = "none";
      blurredContext.globalAlpha = 1;
    };

    const drawFrame = (now: number) => {
      if (stopped) return;

      if (
        lastAnimationFrameAt >= 0 &&
        now - lastAnimationFrameAt < 250
      ) {
        cadenceFrameCount += 1;
        cadenceFrameDuration += now - lastAnimationFrameAt;
      }
      lastAnimationFrameAt = now;
      if (cadenceStartedAt < 0) cadenceStartedAt = now;
      if (now - cadenceStartedAt >= 1000 && cadenceFrameCount > 0) {
        cadenceLevel = updateSceneCadenceLevel(
          cadenceLevel,
          cadenceFrameDuration / cadenceFrameCount,
        );
        cadenceStartedAt = now;
        cadenceFrameCount = 0;
        cadenceFrameDuration = 0;
      }

      const sceneDue = shouldRenderSceneFrame(
        lastSceneFrameAt,
        now,
        sceneDirty,
        sceneIntervalForFrameRate(options.frameRate()) ??
          sceneIntervalForLevel(cadenceLevel),
      );
      const pointer = options.reducedMotion() ? null : pointerAt(now);
      const trackingVisible = pointer?.phase === "tracking";
      const particlesVisible =
        pointer?.phase === "gathering" || pointer?.phase === "dissolving";

      if (sceneDue) {
        drawMotionFrame(now, pointer);
        drawBlurFrame(now);
        lastSceneFrameAt = now;
        sceneDirty = false;
      } else if (trackingVisible || trackingWasVisible) {
        drawMotionFrame(now, pointer);
      }
      trackingWasVisible = trackingVisible;

      if (particlesVisible && pointer) {
        particleContext.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
        particleContext.clearRect(0, 0, width, height);
        drawPointerTransient(
          particleContext,
          width,
          height,
          now * 0.001,
          pointer,
          shapeAt(now),
          options.theme(),
        );
        particlesWereVisible = true;
      } else if (particlesWereVisible) {
        particleContext.setTransform(1, 0, 0, 1, 0, 0);
        particleContext.clearRect(
          0,
          0,
          particleOutput.width,
          particleOutput.height,
        );
        particlesWereVisible = false;
      }

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
      lastSceneFrameAt = -1;
      trackingWasVisible = false;
      particlesWereVisible = false;
      lastAnimationFrameAt = -1;
      cadenceStartedAt = -1;
      cadenceFrameCount = 0;
      cadenceFrameDuration = 0;
      cadenceLevel = 0;
      sceneDirty = true;
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
    sceneDirty = true;
    morphFrom = shapeOf(sceneState(), options.theme());
    morphTo = morphFrom;
    currentShape = morphFrom;
    morphStartedAt = 0;
    disposeScene = mountScene();
  }

  watch(options.visualState, requestStateMorph);
  watch(
    () =>
      [
        options.theme(),
        options.reducedMotion(),
        options.frameRate(),
      ] as const,
    restart,
  );

  onMounted(() => {
    removePointerListener = installPointerSource(options.root.value);
    disposeScene = mountScene();
  });

  onBeforeUnmount(() => {
    disposeScene?.();
    removePointerListener?.();
  });
}
