import type { LabParams, AppState } from '../types';
import { APP_STATES, STATE_LABEL } from '../types';
import { PRESETS } from './presets';
import { GlassPanel } from '../layers/GlassPanel';

export interface ControlsProps {
  params: LabParams;
  onChange: (patch: Partial<LabParams>) => void;
  fps: number;
  measuring: boolean;
  onMeasure: () => void;
  onExport: () => void;
  hasReport: boolean;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step = 1, format, onChange }: SliderProps) {
  return (
    <label className="ctl-row">
      <span className="ctl-label">{label}</span>
      <input
        className="ctl-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctl-value">{format ? format(value) : value}</span>
    </label>
  );
}

export function Controls({
  params,
  onChange,
  fps,
  measuring,
  onMeasure,
  onExport,
  hasReport,
}: ControlsProps) {
  return (
    <GlassPanel className="controls" variant="raised">
      <header className="ctl-head">
        <div>
          <h2>Glass Lab</h2>
          <p className="ctl-sub">只验证视觉与性能，不接任何业务</p>
        </div>
        <div className={`fps ${fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}`}>
          {fps.toFixed(0)} <small>fps</small>
        </div>
      </header>

      <div className="ctl-group">
        <span className="ctl-group-title">状态</span>
        <div className="state-grid">
          {APP_STATES.map((s: AppState) => (
            <button
              key={s}
              type="button"
              className={`chip ${params.state === s ? 'on' : ''}`}
              onClick={() => onChange({ state: s })}
            >
              {STATE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="ctl-group">
        <span className="ctl-group-title">预设</span>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              title={p.hint}
              onClick={() => onChange(p.patch)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ctl-group">
        <span className="ctl-group-title">L3 模糊层</span>
        <Slider
          label="模糊半径"
          value={params.l3Blur}
          min={0}
          max={64}
          onChange={(v) => onChange({ l3Blur: v })}
          format={(v) => `${v}px`}
        />
        <div className="ctl-row">
          <span className="ctl-label">降采样</span>
          <div className="seg">
            {([2, 4, 8] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`seg-btn ${params.l3Downsample === d ? 'on' : ''}`}
                onClick={() => onChange({ l3Downsample: d })}
              >
                1/{d}
              </button>
            ))}
          </div>
        </div>
        <Slider
          label="透明度"
          value={params.l3Alpha}
          min={0.2}
          max={0.85}
          step={0.01}
          onChange={(v) => onChange({ l3Alpha: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <div className="ctl-group">
        <span className="ctl-group-title">L4 控件层</span>
        <Slider
          label="模糊半径"
          value={params.l4Blur}
          min={0}
          max={32}
          onChange={(v) => onChange({ l4Blur: v })}
          format={(v) => `${v}px`}
        />
        <Slider
          label="染色透明度"
          value={params.l4Alpha}
          min={0.2}
          max={0.85}
          step={0.01}
          onChange={(v) => onChange({ l4Alpha: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <div className="ctl-group">
        <span className="ctl-group-title">质感</span>
        <Slider
          label="噪声"
          value={params.noise}
          min={0}
          max={0.08}
          step={0.005}
          onChange={(v) => onChange({ noise: v })}
          format={(v) => v.toFixed(3)}
        />
        <Slider
          label="边缘高光"
          value={params.highlight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ highlight: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="描边"
          value={params.borderWidth}
          min={0}
          max={2}
          step={0.5}
          onChange={(v) => onChange({ borderWidth: v })}
          format={(v) => `${v}px`}
        />
        <Slider
          label="动画速度"
          value={params.speed}
          min={0.25}
          max={2}
          step={0.05}
          onChange={(v) => onChange({ speed: v })}
          format={(v) => `${v.toFixed(2)}×`}
        />
      </div>

      <div className="ctl-actions">
        <button type="button" className="btn primary" disabled={measuring} onClick={onMeasure}>
          {measuring ? '测量中…' : '跑 48 秒测量'}
        </button>
        <button type="button" className="btn" disabled={!hasReport} onClick={onExport}>
          导出报告
        </button>
      </div>
    </GlassPanel>
  );
}
