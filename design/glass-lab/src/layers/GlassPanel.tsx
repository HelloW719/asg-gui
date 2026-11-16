import type { HTMLAttributes, ReactNode } from 'react';

export interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** 更厚的层次（如浮层菜单） */
  variant?: 'base' | 'raised';
}

/**
 * 布局容器：只负责排版与语义，不再自带玻璃质感。
 *
 * 磨砂是**整块**的（`.layer-frost` 一次性覆盖全 app），所以这里不写
 * backdrop-filter / 圆角 / 描边 / 投影——否则又会退回到「多个面板各糊一遍」，
 * 每个面板都要独立采样一次背景，成本随面板数量线性上升。
 * `variant` 仅保留给调用方表达层次，视觉上已无差异。
 */
export function GlassPanel({ children, className = '', variant = 'base', ...rest }: GlassPanelProps) {
  return (
    <section
      className={`glass glass-${variant} ${className}`.trim()}
      data-glass={variant}
      {...rest}
    >
      {children}
    </section>
  );
}
