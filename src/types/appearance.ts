export type GlassFrameRate =
  | "auto"
  | "display"
  | 30
  | 45
  | 60
  | 90
  | 120
  | 144
  | 165
  | 240;

export const GLASS_FRAME_RATE_OPTIONS: readonly GlassFrameRate[] = [
  "auto",
  "display",
  30,
  45,
  60,
  90,
  120,
  144,
  165,
  240,
];

export function isGlassFrameRate(value: unknown): value is GlassFrameRate {
  return GLASS_FRAME_RATE_OPTIONS.includes(value as GlassFrameRate);
}
