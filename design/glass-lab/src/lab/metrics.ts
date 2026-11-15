export interface FrameSample {
  /** rAF 回调时间戳（ms） */
  t: number;
  /** 与上一帧的间隔（ms） */
  dt: number;
}

export interface MetricSummary {
  frames: number;
  durationMs: number;
  fps: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  /** 间隔 > 20ms 的帧数 */
  dropped: number;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

export function summarize(samples: FrameSample[]): MetricSummary {
  const dts = samples.map((s) => s.dt).sort((a, b) => a - b);
  const durationMs = samples.length > 1 ? samples[samples.length - 1]!.t - samples[0]!.t : 0;
  return {
    frames: samples.length,
    durationMs,
    fps: durationMs > 0 ? ((samples.length - 1) * 1000) / durationMs : 0,
    p50: percentile(dts, 50),
    p95: percentile(dts, 95),
    p99: percentile(dts, 99),
    max: dts.length ? dts[dts.length - 1]! : 0,
    dropped: dts.filter((dt) => dt > 20).length,
  };
}

export interface FrameSampler {
  start: () => void;
  stop: () => FrameSample[];
}

export function createFrameSampler(): FrameSampler {
  let raf = 0;
  let last = 0;
  let samples: FrameSample[] = [];

  const loop = (now: number) => {
    if (last > 0) samples.push({ t: now, dt: now - last });
    last = now;
    raf = requestAnimationFrame(loop);
  };

  return {
    start() {
      samples = [];
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(raf);
      return samples;
    },
  };
}

export interface GpuInfo {
  vendor: string;
  renderer: string;
}

export function readGpuInfo(): GpuInfo {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return { vendor: 'unknown', renderer: 'unknown' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) {
      return { vendor: 'unknown', renderer: gl.getParameter(gl.RENDERER) as string };
    }
    return {
      vendor: String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)),
      renderer: String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),
    };
  } catch {
    return { vendor: 'unknown', renderer: 'unknown' };
  }
}

export interface LabReport {
  schema: 1;
  createdAt: string;
  platform: string;
  userAgent: string;
  screen: { width: number; height: number; dpr: number };
  gpu: GpuInfo;
  params: Record<string, unknown>;
  stages: Array<{ name: string; state: string; summary: MetricSummary }>;
}

export function downloadReport(report: LabReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lab-report-${report.platform}-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
