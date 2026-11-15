import type { LabParams } from '../types';

export interface Preset {
  id: string;
  label: string;
  hint: string;
  patch: Partial<LabParams>;
}

export const PRESETS: Preset[] = [
  {
    id: 'locked',
    label: '定案',
    hint: '轻玻璃：L3 20px / 1/4 / 45%，L4 12px / 42%',
    patch: { l3Blur: 20, l3Downsample: 4, l3Alpha: 0.45, l4Blur: 12, l4Alpha: 0.42 },
  },
  {
    id: 'base',
    label: '基准',
    hint: '更厚的 55% 版本，用于对照',
    patch: { l3Blur: 36, l3Downsample: 4, l3Alpha: 0.55, l4Blur: 20, l4Alpha: 0.55 },
  },
  {
    id: 'heavy',
    label: '重玻璃',
    hint: '更强的乳浊感与景深',
    patch: { l3Blur: 56, l3Downsample: 2, l3Alpha: 0.66, l4Blur: 28, l4Alpha: 0.64 },
  },
  {
    id: 'perf',
    label: '性能优先',
    hint: 'L3 1/8 降采样 + 关闭 L4 模糊',
    patch: { l3Blur: 36, l3Downsample: 8, l3Alpha: 0.55, l4Blur: 0, l4Alpha: 0.6 },
  },
  {
    id: 'crisp',
    label: '取消模糊',
    hint: '对照组：只保留透明与描边',
    patch: { l3Blur: 0, l3Downsample: 8, l3Alpha: 0.3, l4Blur: 0, l4Alpha: 0.4 },
  },
];
