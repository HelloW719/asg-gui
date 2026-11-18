import type {
  GlassSceneState,
  ShapeParams,
  ThemeMode,
} from "./model";

export function shapeOf(
  state: GlassSceneState,
  theme: ThemeMode,
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
        twist: 0,
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
        twist: 0,
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
        twist: 0,
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
        twist: 0,
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
        twist: 0,
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
  const smooth =
    progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  const shapeProgress = Math.min(1, Math.max(0, (progress - 0.3) / 0.7));
  const shapeSmooth =
    shapeProgress *
    shapeProgress *
    shapeProgress *
    (shapeProgress * (shapeProgress * 6 - 15) + 10);
  const fromCurve = from.amp > 0.01;
  const toCurve = to.amp > 0.01;
  const twistDirection =
    fromCurve && !toCurve ? 1 : !fromCurve && toCurve ? -1 : 1;
  const twistProgress =
    twistDirection > 0
      ? Math.pow(progress, 1.5)
      : 1 - Math.pow(1 - progress, 1.5);
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
  return {
    cx: lerp(from.cx, to.cx, smooth),
    cy: lerp(from.cy, to.cy, smooth),
    r: lerp(from.r, to.r, smooth),
    lobes: to.lobes,
    amp: lerp(from.amp, to.amp, shapeSmooth),
    spin: to.spin,
    twist: twistDirection * Math.PI * 2 * twistProgress,
    color: [
      lerp(from.color[0], to.color[0], shapeSmooth),
      lerp(from.color[1], to.color[1], shapeSmooth),
      lerp(from.color[2], to.color[2], shapeSmooth),
    ],
    halo: lerp(from.halo, to.halo, shapeSmooth),
  };
}
