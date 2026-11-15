import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APP_STATES,
  DEFAULT_PARAMS,
  STATE_LABEL,
  type AppState,
  type LabParams,
} from './types';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { MotionLayer } from './layers/motion/MotionLayer';
import { BlurLayer } from './layers/BlurLayer';
import { GlassPanel } from './layers/GlassPanel';
import { Controls } from './lab/Controls';
import {
  createFrameSampler,
  downloadReport,
  readGpuInfo,
  summarize,
  type LabReport,
  type MetricSummary,
} from './lab/metrics';
import './styles/glass.css';
import './styles/lab.css';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const QUERY = new URLSearchParams(window.location.search);

/** 每态测量时长，?duration=8000 可调，默认 7s。 */
const MEASURE_DURATION = (() => {
  const raw = Number(QUERY.get('duration'));
  return Number.isFinite(raw) && raw >= 1000 ? Math.min(raw, 30_000) : 7000;
})();

/** 只测指定状态，?states=healthy,error；默认全部。 */
const MEASURE_STATES = (() => {
  const raw = QUERY.get('states');
  if (!raw) return APP_STATES;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is AppState => (APP_STATES as readonly string[]).includes(s));
  return list.length > 0 ? list : APP_STATES;
})();

const LOG_LINES: Array<{ at: string; svc: string; msg: string }> = [
  { at: '21:33:02.114', svc: 'supervisor', msg: '启动顺序：searxng → flaresolverr → gateway' },
  { at: '21:33:03.402', svc: 'searxng', msg: 'granian 已监听 127.0.0.1:8888' },
  { at: '21:33:04.881', svc: 'flaresolverr', msg: 'FlareSolverr 就绪 · 127.0.0.1:8192' },
  { at: '21:33:05.013', svc: 'gateway', msg: 'MCP endpoint http://127.0.0.1:3000/mcp' },
  { at: '21:33:05.377', svc: 'supervisor', msg: '全部服务已就绪（4.2s）' },
  { at: '21:34:12.090', svc: 'gateway', msg: 'search 聚合 8 个引擎 · fanout 3 · 642ms' },
  { at: '21:34:19.550', svc: 'gateway', msg: 'fetch render=auto · 命中浏览器渲染路径' },
  { at: '21:35:01.204', svc: 'searxng', msg: 'quota: google 剩余 87/100' },
  { at: '21:35:44.731', svc: 'gateway', msg: 'chromium pool 1/2 活跃' },
  { at: '21:36:07.118', svc: 'supervisor', msg: '健康检查通过 gateway uptime 181s' },
];

const FIELD_LABEL: Array<{ key: keyof LabParams; label: string; fmt: (v: LabParams[keyof LabParams]) => string }> = [
  { key: 'l3Blur', label: 'L3 模糊', fmt: (v) => `${v}px` },
  { key: 'l3Downsample', label: 'L3 降采样', fmt: (v) => `1/${v}` },
  { key: 'l3Alpha', label: 'L3 透明', fmt: (v) => `${Math.round(Number(v) * 100)}%` },
  { key: 'l4Blur', label: 'L4 模糊', fmt: (v) => `${v}px` },
  { key: 'l4Alpha', label: 'L4 透明', fmt: (v) => `${Math.round(Number(v) * 100)}%` },
];

export default function App() {
  const [params, setParams] = useState<LabParams>(() => {
    // 支持 ?state=error&l3blur=48 直接定格，方便批量截图与回归。
    const q = new URLSearchParams(window.location.search);
    const next: LabParams = { ...DEFAULT_PARAMS };
    const state = q.get('state');
    if (state && (APP_STATES as readonly string[]).includes(state)) next.state = state as AppState;
    const num = (key: string, min: number, max: number) => {
      const raw = q.get(key);
      if (raw === null || raw.trim() === '') return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : null;
    };
    const l3 = num('l3blur', 0, 64);
    if (l3 !== null) next.l3Blur = l3;
    const l4 = num('l4blur', 0, 32);
    if (l4 !== null) next.l4Blur = l4;
    const ds = num('ds', 2, 8);
    if (ds === 2 || ds === 4 || ds === 8) next.l3Downsample = ds;
    return next;
  });
  const [fps, setFps] = useState(0);
  const [measuring, setMeasuring] = useState(false);
  const [report, setReport] = useState<LabReport | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const reportRef = useRef<LabReport | null>(null);
  const measuringRef = useRef(false);
  measuringRef.current = measuring;

  const onChange = useCallback((patch: Partial<LabParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    const sampler = createFrameSampler();
    sampler.start();
    const id = window.setInterval(() => {
      const summary = summarize(sampler.stop());
      setFps(summary.fps);
      sampler.start();
    }, 1000);
    return () => {
      window.clearInterval(id);
      sampler.stop();
    };
  }, []);

  const runMeasure = useCallback(async () => {
    if (measuring) return;
    const snapshot = { ...paramsRef.current };
    setMeasuring(true);
    const stages: LabReport['stages'] = [];
    try {
      for (const state of MEASURE_STATES) {
        setParams((prev) => ({ ...prev, state }));
        await sleep(700);
        const sampler = createFrameSampler();
        sampler.start();
        await sleep(MEASURE_DURATION);
        stages.push({ name: `state:${state}`, state, summary: summarize(sampler.stop()) });
      }
      const next: LabReport = {
        schema: 1,
        createdAt: new Date().toISOString(),
        platform: `${navigator.platform}`,
        userAgent: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          dpr: window.devicePixelRatio,
        },
        gpu: readGpuInfo(),
        params: snapshot as unknown as Record<string, unknown>,
        stages,
      };
      setReport(next);
    } finally {
      setMeasuring(false);
    }
  }, [measuring]);

  const style = useMemo(
    () =>
      ({
        '--l3-blur': `${params.l3Blur}px`,
        '--l3-alpha': String(params.l3Alpha),
        '--l4-blur': `${params.l4Blur}px`,
        '--l4-alpha': String(params.l4Alpha),
        '--noise-opacity': String(params.noise),
        '--hl': String(params.highlight),
        '--bw': `${params.borderWidth}px`,
        '--glass-bevel': String(Number(QUERY.get('bevel')) || 1),
      }) as React.CSSProperties,
    [params],
  );

  const state = params.state as AppState;
  const lastStage: { state: string; summary: MetricSummary } | undefined = report?.stages.at(-1);

  reportRef.current = report;

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__lab = {
      runMeasure,
      isMeasuring: () => measuringRef.current,
      getReport: () => reportRef.current,
      setParams: (patch: Partial<LabParams>) => setParams((prev) => ({ ...prev, ...patch })),
      getParams: () => paramsRef.current,
      info: () => ({
        gpu: readGpuInfo(),
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          dpr: window.devicePixelRatio,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        },
        ua: navigator.userAgent,
        platform: navigator.platform,
      }),
    };
  }, [runMeasure]);

  return (
    <div className="stage" style={style}>
      <BackgroundLayer noise={params.noise} />
      <MotionLayer state={state} speed={params.speed} />
      <BlurLayer
        state={state}
        speed={params.speed}
        blur={params.l3Blur}
        downsample={params.l3Downsample}
        alpha={params.l3Alpha}
      />

      <div className="ui">
        <div className="workspace">
          <GlassPanel className="hero" variant="raised">
            <div className="hero-main">
              <span className={`pulse-dot ${state}`} />
              <div>
                <h1>{STATE_LABEL[state]}</h1>
                <p>gateway · searxng · flaresolverr</p>
              </div>
            </div>
            <div className="hero-meta">
              <span>uptime 2h 14m</span>
              <span>supervisor systemd · active</span>
              <span>{report ? `p95 ${lastStage?.summary.p95.toFixed(1)}ms` : 'p95 —'}</span>
            </div>
          </GlassPanel>

          <GlassPanel className="log-panel">
            <header className="log-head">
              <h2>日志</h2>
              <span>gateway + supervisor</span>
            </header>
            <div className="log-list">
              {LOG_LINES.map((line, i) => (
                <div className="log-line" key={`${line.at}-${i}`}>
                  <span className="log-at">{line.at}</span>
                  <span className={`log-svc ${line.svc}`}>{line.svc}</span>
                  <span className="log-msg">{line.msg}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="meta-strip">
            {FIELD_LABEL.map((f) => (
              <span className="meta-item" key={f.key}>
                <em>{f.label}</em>
                {f.fmt(params[f.key])}
              </span>
            ))}
            <span className="meta-item">
              <em>半径/像素</em>
              {params.l3Blur > 0
                ? `${(params.l3Blur / params.l3Downsample).toFixed(1)}px @1/${params.l3Downsample}`
                : 'off'}
            </span>
          </GlassPanel>
        </div>

        <aside className="side">
          <Controls
            params={params}
            onChange={onChange}
            fps={fps}
            measuring={measuring}
            onMeasure={runMeasure}
            onExport={() => report && downloadReport(report)}
            hasReport={report !== null}
          />
        </aside>
      </div>
    </div>
  );
}
