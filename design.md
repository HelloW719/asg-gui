# Agent Search Gateway GUI 设计基线

这份文档只做两件事：**给出 Material 3 Expressive（M3E）的权威出处**，以及**把已经做完并定案的实验数值固定下来**。
它不是产品界面说明，也不负责描述功能。凡是本文件没有写死的，都不算约定。

- 状态：草案基线（数值已定案，界面尚未按 M3E 重排）
- 对应代码：`src/visual/glass/`、`src/styles/tokens.css`、`src/styles/shell.css`、`src/app/useAppStatus.ts`
- 最后核校：2026-11-20

---

## 1. 官方规范索引（M3E）

M3E 是 Material 3 的一次演进（2025-05 发布），不是独立的新设计系统；"Android 17 的新设计"指的就是它，规范入口始终是 m3。

| 主题 | 链接 | 用途 / 关键结论 |
|---|---|---|
| 总览（发布说明） | https://m3.material.io/blog/building-with-m3-expressive | 14 个新增/更新组件、动效物理、色彩与排版更新 |
| 动效系统 | https://m3.material.io/styles/motion/overview | 用弹簧（stiffness/damping）取代 easing+duration |
| 动效规格（**重要**） | https://m3.material.io/styles/motion/overview/specs | Web 的弹簧→贝塞尔转换表，见本文件第 3.4 节 |
| 形状与形变 | https://m3.material.io/styles/shape/shape-morph | 形状库 + shape morph；**Web 暂不提供** |
| 设计 token | https://m3.material.io/foundations/design-tokens/overview | reference / system / component 三层 token |
| 组件清单 | https://m3.material.io/components | Button groups、FAB menu、Loading indicator、Split button、Toolbar 等 |
| Web 实现状态（**重要**） | https://m3.material.io/develop/web | 官方原文：Material Web Components 处于维护模式，**M3E 未在 Web 实现** |
| Compose 实现 | https://developer.android.com/develop/ui/compose/designsystems/material3 | Compose 侧 M3E 能力与用法 |
| `MotionScheme` API | https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme | `standard()` / `expressive()`；`expressive()` 标注 **Added in 1.5.0** |
| Compose Material3 版本 | https://developer.android.com/jetpack/androidx/releases/compose-material3 | 1.4.0 为当前稳定版，1.5.0 仍在 alpha |
| Android 17 平台 | https://developer.android.com/about/versions/17 | 平台叙事为 adaptive-first，不另设设计规范 |

**各平台实现现状**（来自官方可用性表）：

| 平台 | 状态 |
|---|---|
| Jetpack Compose | 可用（标准方案稳定，expressive 方案在 1.5.0） |
| Android Views（MDC-Android） | 弹簧 token 可用，但尚未接入组件 |
| Flutter | 不可用 |
| Web | 兼容（只给弹簧换算规则，需自行实现） |

**Web 侧可选实现**（均非官方，选型前需自行评估维护风险）：

| 项目 | 说明 |
|---|---|
| https://github.com/matraic/m3e（`@m3e/web`） | 社区 M3E Web Components 单仓，338 star / 1726 commits |
| https://ui.banegasn.dev | 社区 M3E Web Components，多框架 |
| https://mdui.org | MD3（Material You）Web Components，**非 Expressive** |
| https://github.com/beercss/beercss | MD3 CSS 框架，**非 Expressive** |
| https://github.com/material-components/material-web | 官方 MD3，**维护模式** |

> 结论：本项目（Vue + Tauri）没有可用的官方 M3E 组件库。M3E 只能以"规范 + token"的方式引入，动效和形状需要自己实现。

---

## 2. 已实现：玻璃层参数

四层结构，整块玻璃，不是多面板各自磨砂。实现位于 `src/visual/glass/` 与 `src/styles/shell.css`。

| 层 | 实现 |
|---|---|
| L1 背景 | `#0e1622`（浅色主题另设），噪点叠加 |
| L2 动态几何 | canvas，六瓣曲奇 / 圆，morph 见第 3.2 节 |
| L3 降采样模糊 | canvas，`DOWN_SAMPLE = 4` 离屏降采样后上采样 |
| L4 全屏磨砂 | `.glass-frost-layer`：`backdrop-filter: blur(12px) saturate(1.3)`，染色 `rgba(46, 60, 82, 0.42)`（浅色 48%），覆盖全应用 |

| 项 | 值 |
|---|---|
| 窗口圆角 | `--window-radius: 32px` + `corner-shape: squircle`；L1–L4 与 `.app-frame` 共享同一轮廓 |
| 内容圆角 | `--radius-xl: 24px` / `lg 18px` / `md 14px` / `sm 10px` |
| 边缘模型 | 7 层 inset shadow：顶部曲面亮带 6/15/26px 三段、底部反向暗带、左右非对称受光 |
| 渲染上限 | DPR 上限 1.5；背景节奏 60 / 45 / 30fps，掉帧时自动降级，恢复后回升 |
| 降级 | `data-reduced-transparency` 关闭 L4 模糊；`@supports not (backdrop-filter)` 换实色；`data-reduced-motion` 冻结动画 |

整个应用只允许存在一层全屏毛玻璃；内容面板只使用染色、边框和内阴影，不得各自再加 `backdrop-filter`。

## 3. 已定案：形状与动效

### 3.1 形状参数

归一化坐标，`r` 相对 `min(width, height)`。`lobes` 恒为 6，只插值 `amp`，避免经过三角形/四边形等中间态。

| 状态 | cx | cy | r | amp | 主体色（深色） | halo |
|---|---|---|---|---|---|---|
| healthy | 0.90 | 0.84 | 0.50 | 0 | `#34d399` | 0.26 |
| degraded | 0.10 | 0.18 | 0.50 | 0 | `#f5c451` | 0.26 |
| error | 0.10 | 0.18 | 0.50 | 0 | `#f5c451` | 0.26 |
| booting | 0.50 | 0.50 | 0.16 | 0.13 | `#8aa3c4` | 0.20 |
| working | 0.50 | 0.50 | 0.16 | 0.13 | `#63a4ff` | 0.20 |
| restarting | 0.50 | 0.50 | 0.16 | 0.13 | `#ffbe63` | 0.20 |

浅色主题使用另一组主体色（如 healthy `#279479`、degraded `#b8841d`），形状与坐标不变。实现见 `src/visual/glass/shapes.ts`。

补充固定值：

- 主体明度 `BODY_ALPHA`：深色 `0.84`、浅色 `0.68`。大几何、融合遮罩、指针圆三处必须完全一致，融合开关只改边缘处理，不改亮度。
- 指针实体圆半径 `0.055`（相对 minDim）；融合起始距离 `0.11`；融合遮罩降采样 `MB_SCALE = 3`。
- 曲奇 `amp` 可从 `0.13` 下调到 `0.07` 变得更像饼干，属唯一允许的视觉微调。

### 3.2 morph

| 项 | 定案值 |
|---|---|
| 时长 | 1400ms |
| 曲线 | smootherstep（两端一阶、二阶导均为 0） |
| 0–30% | 只做位置与缩放 |
| 30–100% | 长花瓣、换色 |
| 旋转 | 过渡期间整体转一圈（2π），终值取 2π 整数倍，结束时角度等价，不跳帧 |
| 曲奇→圆 | 顺时针，`raw^1.5`（先缩后转） |
| 圆→曲奇 | 逆时针，`1-(1-raw)^1.5`（先转后长） |

### 3.3 状态到视觉的映射

9 个 `VisualState` 映射到 6 个 `GlassSceneState`（`src/visual/glass/model.ts`）：

| VisualState | GlassSceneState | 视觉 |
|---|---|---|
| stable | healthy | 绿圆 |
| degraded / stopped | degraded | 黄圆 |
| failed | error | 黄圆 |
| starting | working | 蓝色曲奇 |
| restarting | restarting | 橙色曲奇 |
| loading / unconfigured / disconnected | booting | 灰蓝曲奇 |

映射行为有单测覆盖（`glassScene.test.ts`）。

## 4. 性能约束

> 原始测量与失效分析见 `docs/perf/2026-11-20-glass-bench.md`。本节只保留约束、门槛与降级顺序。

**引用规则**：任何性能数字必须同时给出渲染后端、物理分辨率、DPR、视口尺寸、合成路径；不得跨平台、跨 DPR、跨视口外推。

1. **L3 canvas 只在三条前提同时成立时才允许存在**：离屏降采样不低于 1/4、DPR 上限 1.5、掉帧时能降频（当前 60/45/30）。任何一条失效，L3 就退化成实测中那个 36–52fps 的方案。
2. 成本按物理像素计（fill-rate）。~1.02MP 下任何配置都贴 vsync，**该尺寸的测试不能用来证明性能余量**。
3. 全屏毛玻璃只允许一层。多层 `backdrop-filter` 不在已测范围内。
4. 门槛：目标 60Hz、~4MP、核显下 `p95 ≤ 16.7ms` 且无 >20ms 长帧。测量前预热 GPU 至频率稳定，否则同配置两轮可差 43%。
5. 未达门槛时的降级顺序：降低 L3 采样倍率 → 下调背景节奏 → 缩小模糊覆盖面积（分区玻璃）→ 关闭 L4 模糊。
6. 软件合成下整套玻璃不可用（15fps 级）；GPU 加速是硬依赖。
7. 已知未覆盖：真实 Dashboard 整机负载、滚动与路由切换、Windows / macOS、电池降频。主题切换另有独立缺陷（最坏单帧 150ms、长任务 106ms），不计入渲染预算。

## 5. 与 glass-lab 定案的差异

| 项 | glass-lab 定案（2026-11-15） | 当前实现 |
|---|---|---|
| 结构 | L1–L4 | 一致 |
| L4 模糊 | 12px | 12px + `saturate(1.3)` |
| L4 染色 | 42% | 42%（浅色 48%） |
| L3 降采样 | 1/4 | 1/4 |
| 圆角 | 24px 普通圆角 | 窗口 32px `squircle`，内容 24px |
| 主题 | 仅深色 | 深色 + 浅色 |
| 动画节奏 | 固定 1.0× | 60 / 45 / 30 自适应 + 用户可选帧率 |
| 调色 | 冷色 `#0e1622` / `#5ad1c0` | 冷色 `#0e1622` / `#46,60,82` 染色，语义色沿用 lab 六色 |

差异均为有意调整，不是漂移；`squircle`、双主题、自适应节奏三项是 lab 未覆盖的新增约束。

## 6. 尚未定案

- M3E token（色彩 / 排版 / 形状 / 动效）到本项目 CSS 变量的映射表；当前 `tokens.css` 仍是自有命名。
- 组件路线：自研 / `@m3e/web` / 仅借规范，尚未选型。
- 无障碍降级矩阵只覆盖了减弱动效、减弱透明度、无 `backdrop-filter` 三种；软件渲染与低功耗模式未验收。
- M3E Expressive 的组件级时序（button group、FAB menu、loading indicator）未引入，当前动效全部是状态驱动的场景动画。
- 真实 Dashboard 在 ~4MP 核显下的帧数据仍缺（见第 4 节第 7 条）。
