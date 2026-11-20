export type AppState =
  | 'booting'
  | 'healthy'
  | 'working'
  | 'restarting'
  | 'degraded'
  | 'error';

export const APP_STATES: readonly AppState[] = [
  'booting',
  'healthy',
  'working',
  'restarting',
  'degraded',
  'error',
];

export const STATE_LABEL: Record<AppState, string> = {
  booting: '启动探测',
  healthy: '稳定运行',
  working: '任务执行',
  restarting: '整栈重启',
  degraded: '部分降级',
  error: '出现故障',
};

export interface LabParams {
  state: AppState;
  /** L3 模糊半径（px，按 CSS 像素计） */
  l3Blur: number;
  /** L3 离屏降采样倍率 */
  l3Downsample: 2 | 4 | 8;
  /** L3 半透明程度 */
  l3Alpha: number;
  /** L4 backdrop-filter 半径 */
  l4Blur: number;
  /** L4 染色透明度 */
  l4Alpha: number;
  /** L1 噪声强度 */
  noise: number;
  /** 边缘高光强度 0–1 */
  highlight: number;
  /** 描边宽度 px */
  borderWidth: number;
  /** 动画速度倍率 */
  speed: number;
}

export const DEFAULT_PARAMS: LabParams = {
  state: 'healthy',
  // 定案：55% 厚玻璃（2026-11-20）
  l3Blur: 36,
  l3Downsample: 4,
  l3Alpha: 0.55,
  l4Blur: 20,
  l4Alpha: 0.55,
  noise: 0.03,
  highlight: 1,
  borderWidth: 1,
  speed: 1,
};
