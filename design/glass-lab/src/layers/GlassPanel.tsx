import type { HTMLAttributes, ReactNode } from 'react';

export interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** 更厚的层次（如浮层菜单） */
  variant?: 'base' | 'raised';
}

/**
 * L4 控件层：染色 + 单层 backdrop-filter + 边缘高光。
 *
 * 玻璃质感全部画在**这一个元素**上，内部不再嵌 `.glass`：
 * - 染色 + 内部体积渐变 → 元素自身的多层 background
 * - 10–20px 柔和内发光 / 顶部硬高光 / 底部反光 / 右下暗部 → inset box-shadow
 * - 1px 渐变描边（左上亮、右下近黑）→ ::before + mask-composite
 * 一个面板只有一个 backdrop-filter，避免同一块区域被重复采样成多层模糊。
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
