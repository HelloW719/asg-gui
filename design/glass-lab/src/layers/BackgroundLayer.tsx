export interface BackgroundLayerProps {
  /** 噪声强度 0–0.08 */
  noise: number;
}

const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** L1 背景层：纯色 + 极轻噪声，避免大面积渐变产生色带。 */
export function BackgroundLayer({ noise }: BackgroundLayerProps) {
  return (
    <div className="layer layer-bg">
      <div
        className="bg-noise"
        style={{ opacity: noise, backgroundImage: NOISE_URI }}
        aria-hidden
      />
      <div className="bg-vignette" aria-hidden />
    </div>
  );
}
