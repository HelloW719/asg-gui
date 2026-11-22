# Agent Search Gateway 桌面端设计规范

```yaml
version: "2"
status: final
updated: "2026-11-21"
runtime:
  framework: "Vue 3 + Tauri"
  componentSystem: "M3E Web Components 2.13.5"
  themeSeed: "#5ad1c0"
  colorVariant: expressive
  colorSchemes: [dark, light]
  motionScheme: expressive
  focus: strong
  density: "-1"
```

## 1. Overview

本产品是 Agent Search Gateway 的桌面控制面。视觉方向是“琉璃控制台”：四层连续
玻璃包住整个窗口，运行状态通过玻璃后的几何形变表达，内容面板只在同一层磨砂上
做染色、描边和内阴影。界面的记忆点是“状态驱动整块玻璃变化”，而不是给每个控件
套一张独立玻璃卡。

默认使用深色主题，同时完整支持浅色主题、减少动态、减少透明、960×640 最小窗口。
界面使用 M3E 语义颜色、层级、形状和弹簧动效；Web 侧没有官方 M3E 实现，项目通过
`@m3e/web` 的 `m3e-theme`、`m3e-button`、`m3e-card` 和自定义 token 映射实现。
纯 Vue/Reka 控件继续承担表单、标签页、对话框和导航。

字体统一使用 Epilogue，中文回退到 `PingFang SC`、`Microsoft YaHei UI` 和
`Noto Sans CJK SC`。图标统一使用 Lucide，不使用字符拼成图标。界面文案只描述真实
状态、真实动作和真实结果。

## 2. Colors

### 2.1 颜色职责

- `primary`：主操作、键盘焦点、当前选择、状态几何的稳定色。
- `secondary`：次级操作、辅助状态、SearXNG 等第二种服务语义。
- `tertiary`：第三服务语义、链接外辅助强调，不承担成功或失败含义。
- `error` / `error-container`：错误、危险操作、不可恢复状态。
- `surface*`：页面、面板、表单和代码区的基础层级；优先用色调分层，不用阴影堆层级。
- `outline*`：边界、分隔线、控件轮廓和可选状态。
- 项目状态色：`success` 只表示健康或完成；`ochre` 只表示启动、运行中或需要注意；
  `danger` 只表示失败、停止或降级。状态色不能用于装饰。

所有主题色都由 `m3e-theme` 在 `.app-root` 内生成。业务样式不得重新解释 seed，
只消费 `--md-sys-color-*` 或项目语义 token。以下值是 `#5ad1c0`、Expressive、
strong focus、density `-1` 在 `@m3e/web 2.13.5` 下的实际快照。

```yaml
dark:
  primary: "#e5fff9"
  onPrimary: "#006b60"
  primaryContainer: "#a7fbec"
  onPrimaryContainer: "#006258"
  secondary: "#d8c4a0"
  onSecondary: "#4c3e24"
  secondaryContainer: "#2f240c"
  onSecondaryContainer: "#b4a280"
  tertiary: "#ffcc77"
  onTertiary: "#624300"
  tertiaryContainer: "#fabc49"
  onTertiaryContainer: "#573b00"
  error: "#ff716c"
  onError: "#490006"
  errorContainer: "#8a1a1e"
  onErrorContainer: "#ff9993"
  background: "#001111"
  onBackground: "#c2eeec"
  surface: "#001111"
  onSurface: "#c2eeec"
  surfaceVariant: "#002b2a"
  onSurfaceVariant: "#88b3b1"
  outline: "#537d7b"
  outlineVariant: "#254e4d"
  shadow: "#000000"
  scrim: "#000000"
  inverseSurface: "#e7fefc"
  inverseOnSurface: "#445958"
  inversePrimary: "#006b60"
  primaryFixed: "#99ecde"
  onPrimaryFixed: "#00443d"
  primaryFixedDim: "#8bded0"
  onPrimaryFixedVariant: "#006359"
  secondaryFixed: "#fbe6c0"
  onSecondaryFixed: "#4f4126"
  secondaryFixedDim: "#edd7b3"
  onSecondaryFixedVariant: "#6c5d40"
  tertiaryFixed: "#fabc49"
  onTertiaryFixed: "#3d2800"
  tertiaryFixedDim: "#eaae3d"
  onTertiaryFixedVariant: "#624300"
  surfaceDim: "#001111"
  surfaceBright: "#003231"
  surfaceContainerLowest: "#000000"
  surfaceContainerLow: "#001716"
  surfaceContainer: "#001e1d"
  surfaceContainerHigh: "#002424"
  surfaceContainerHighest: "#002b2a"
  surfaceTint: "#e5fff9"
light:
  primary: "#006b60"
  onPrimary: "#e2fff8"
  primaryContainer: "#6ef2df"
  onPrimaryContainer: "#00594f"
  secondary: "#725c2f"
  onSecondary: "#fff8f1"
  secondaryContainer: "#fddfa6"
  onSecondaryContainer: "#634f23"
  tertiary: "#7e5800"
  onTertiary: "#fff8f2"
  tertiaryContainer: "#fabc49"
  onTertiaryContainer: "#573b00"
  error: "#ac3434"
  onError: "#fff7f6"
  errorContainer: "#f56965"
  onErrorContainer: "#65000b"
  background: "#e3fffd"
  onBackground: "#003938"
  surface: "#e3fffd"
  onSurface: "#003938"
  surfaceVariant: "#b0eeeb"
  onSurfaceVariant: "#2a6867"
  outline: "#488483"
  outlineVariant: "#80bdbb"
  shadow: "#000000"
  scrim: "#000000"
  inverseSurface: "#001111"
  inverseOnSurface: "#84a3a1"
  inversePrimary: "#7afeea"
  primaryFixed: "#6ef2df"
  onPrimaryFixed: "#00443d"
  primaryFixedDim: "#5ee3d1"
  onPrimaryFixedVariant: "#006359"
  secondaryFixed: "#fddfa6"
  onSecondaryFixed: "#4f3c12"
  secondaryFixedDim: "#eed199"
  onSecondaryFixedVariant: "#6e582b"
  tertiaryFixed: "#fabc49"
  onTertiaryFixed: "#3d2800"
  tertiaryFixedDim: "#eaae3d"
  onTertiaryFixedVariant: "#624300"
  surfaceDim: "#a1e6e4"
  surfaceBright: "#e3fffd"
  surfaceContainerLowest: "#ffffff"
  surfaceContainerLow: "#d3fbf9"
  surfaceContainer: "#c8f7f5"
  surfaceContainerHigh: "#bcf2f0"
  surfaceContainerHighest: "#b0eeeb"
  surfaceTint: "#006b60"
```

### 2.2 玻璃语义 token

| Token | 取值与用途 |
| --- | --- |
| `--glass-tint` | 深色 `46, 60, 82`；浅色 `222, 231, 239`。只用于 L4 全屏染色。 |
| `--glass-tint-alpha` | `0.55`。L4 的定案厚度。 |
| `--glass-blur-radius` | `20px`。全应用唯一一层 backdrop blur。 |
| `--glass-blur-saturation` | `1.3`。保留琉璃色的饱和度。 |
| `--glass-bg` | 内容面板染色，默认绑定 `surface-container`。 |
| `--glass-bg-strong` | 对话框、抽屉、浮层染色，默认绑定 `surface-container-high`。 |
| `--glass-border` | 内容面板边界，来自 `outline-variant`。 |
| `--glass-highlight` | 面板顶部受光，来自 `on-surface`。 |
| `--glass-shadow` | 轻量外投影，来自 `shadow`。 |
| `--surface-card` | 深色跟随 `surface-container`；浅色固定使用修改前的中性白灰琉璃渐变。 |
| `--surface-card-fill` | 不支持渐变的自定义组件使用的纯色填充；浅色与服务板保持同一中性白灰琉璃色。 |
| `--surface-card-border` | 深色跟随 `outline-variant`；浅色固定使用 `rgba(42, 91, 93, 0.16)`。 |
| `--surface-card-highlight-*` | 玻璃卡片与内容面板的内沿高光和暗边，只表达玻璃边缘，不构成新拟物凸起。 |
| `--surface-card-divider` | 同一块面板内部的语义分隔；浅色使用 `rgba(42, 91, 93, 0.13)`。 |
| `--surface-subtle` | 工具栏、标签容器和低层分段背景。 |
| `--surface-sunken` | 日志行、诊断项和低层列表的凹陷背景。 |
| `--surface-code` | 原始输出、Markdown 代码块。 |
| `--surface-interaction` | 非按键列表的 hover。 |
| `--surface-selected` | 当前标签、当前导航、已选择分段。 |
| `--surface-overlay` | 模态遮罩。 |

浅色模式的卡片组件不跟随 Expressive 生成的浅青色表面，固定保留修改前的中性白灰
琉璃色：

```css
--surface-card:
  linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.26),
    rgba(243, 249, 249, 0.06) 54%,
    rgba(43, 86, 88, 0.025)
  ),
  rgba(232, 244, 245, 0.18);
--surface-card-border: rgba(42, 91, 93, 0.16);
--surface-card-highlight-top: rgba(255, 255, 255, 0.62);
--surface-card-highlight-bottom: rgba(42, 72, 77, 0.06);
--surface-card-divider: rgba(42, 91, 93, 0.13);
```

服务板内部的 `--m3e-filled-card-container-color` 在浅色模式同样使用
`rgba(232, 244, 245, 0.18)`。

## 3. Typography

Epilogue 负责全部拉丁字符、数字和标题；中文回退字体承担 CJK。所有字号按桌面密度
收敛，按键和标签使用 0.65–0.9rem，正文使用 0.75–0.9rem，页面标题最大 2.55rem。
状态页英雄标题可以在 2.7–5.2rem 之间响应式变化，单屏只能出现一个这种权重的标题。

| 角色 | 字号 / 行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| Hero display | `clamp(2.7rem, 4.5vw, 5.2rem)` / `0.98` | 400 | 仅状态页主结论 |
| Page title | `clamp(1.8rem, 2.2vw, 2.55rem)` / `1.06` | 500 | 每个路由页一个 |
| Section title | `1rem` / `1.25` | 500 | 面板标题与分区标题 |
| Card title | `1.06–1.4rem` / `1.3` | 600 | 服务、维护动作、结果标题 |
| Body | `0.82–0.9rem` / `1.6` | 400 | 说明、正文、状态解释 |
| Compact body | `0.68–0.78rem` / `1.5` | 400 | 表格、列表、配置值 |
| Label | `0.6–0.7rem` / `1.4` | 600 | 字段名、状态、工具按键 |
| Mono | `0.66–0.75rem` | 400 | 时间、路径、代码、延迟数值 |

数字需要使用等宽字体和 `font-variant-numeric: tabular-nums`。Eyebrow 只用于帮助定位
页面，不重复标题文字，不堆叠营销式小标题。M3E Expressive 弹簧 token 映射到
`--motion-*-spatial` 和 `--motion-*-effects`；减少动态时所有动画和过渡必须关闭。

## 4. Layout

- 默认窗口 `1280×820`，最小窗口 `960×640`，页面不得产生横向溢出。
- 应用框架占满窗口，标题栏 `54px`；侧栏完整宽度 `184px`，宽度低于 `1120px` 时收为
  `72px` 图标栏。
- 页面内容宽度上限 `1320px`，左右内边距 `clamp(24px, 3vw, 44px)`，底部保留 `64px`
  滚动余量。
- 间距使用 `4 / 8 / 10 / 12 / 14 / 18 / 24 / 30 / 42 / 64px` 节奏，不新增只差 1–2px
  的间距 token。
- 页面头部与主内容间距 `22px`；同一页面面板间距 `10–14px`；面板内部通常 `17–24px`。
- 表单使用双列 `form-grid`；在 720px 以下改为单列。工具栏允许换行，必须保持主操作
  可见。
- 960px 宽度下服务状态板、状态摘要和工具栏按语义改为横排分段或纵向堆叠，禁止靠
  缩小字号来硬塞内容。

## 5. Elevation & Depth

层级首先来自色调、边界和内容分组。阴影只用于区分浮层、焦点和真实悬浮对象，不用于
让每个卡片“浮起来”。四层玻璃是唯一例外：

```text
L1 背景与噪声
L2 状态驱动的几何形变
L3 离屏降采样 + 模糊 + 半透明合成
L4 全屏 backdrop-filter + 55% 染色 + 连续曲率边缘
```

定案参数：

| 层 | 参数 |
| --- | --- |
| L1 | 深色 `#0e1622`；浅色由主题背景生成；噪声 `0.03` |
| L2 | 健康绿色几何、注意黄色几何、任务曲奇；形状切换 1400ms |
| L3 | 模糊 36px，1/4 降采样，55% 合成 |
| L4 | 模糊 20px，染色 55%，全局仅一层 |
| 边缘 | 柔和亮带、长尾衰减、底部暗带和四角补光；不使用可单独看见的 1px 亮边 |

内容面板使用 `--surface-card`、`--surface-card-border` 和内高光，不添加
`backdrop-filter`。对话框、抽屉和 toast 使用更强染色和浮层阴影，仍保持
`backdrop-filter: none`。减少透明时，L4 改为约 78% 实色，并关闭模糊。

## 6. Shapes

| Token | 取值 | 用途 |
| --- | --- | --- |
| `--window-radius` | `32px` + `corner-shape: squircle` | L1–L4、`.app-frame` 共享轮廓 |
| `--radius-xl` | `24px` | 一体化服务板、主状态面板 |
| `--radius-lg` | `18px` | 常规内容卡、抽屉、日志面板 |
| `--radius-md` | `14px` | 工具栏、独立列表容器、内部容器 |
| `--radius-sm` | `10px` | 输入框、提示、能力块 |
| `--radius-xs` | `8px` | 标签、代码块、细粒度 chip |
| `--radius-full` | `999px` | 按键、分段控件、状态 pill |

窗口圆角与系统装饰不叠加。Windows 关闭 DWM 自带圆角与边框；macOS、Windows、Linux
均由页面绘制同一个 squircle 轮廓。旧 WebView 不支持 `corner-shape` 时才允许普通
圆角渐进降级。内容不应随意使用中间半径；同一容器内部的分段保持直角或无圆角边界。

## 7. Components

### 7.1 动作按键 `BaseButton`

这里的“按键”是桌面 GUI 中的可点击动作，不表示实体键盘键或快捷键。`BaseButton`
是通用按键唯一入口，封装 `m3e-button`：

| 项目变体 | M3E 结构 | 语义 |
| --- | --- | --- |
| `primary` | filled | 页面主操作；较高字重与明确深度 |
| `secondary` | tonal | 次要但明确的操作 |
| `ghost` | text | 导航式、取消式或低强调操作 |
| `danger` | filled | 破坏性确认；错误色只用于文字和图标 |
| `ghost + danger-text` | text | 低强调危险入口；错误色只用于文字和图标 |

尺寸为 compact `34px`、regular `40px`、large `50px`。按键圆角为 full，使用 M3E
filled/tonal/text 的形状、尺寸、排版、焦点和状态层结构，但不得继承其 primary、
secondary 或 error 容器填色。按键容器保持透明，以显示父组件原有玻璃、状态或背景色；
新拟物只通过外高光、柔和投影、hover 抬升和 `--button-press-shadow` 定义的 pressed
凹陷表达形状。pressed 必须同时响应原生 `:active` 和 M3E 的 `--pressed` 自定义
状态，使 M3E 形状变化与新拟物内凹在同一生命周期完成。非按键组件继续使用 M3E
颜色与玻璃表面。系统窗口按键保持平面。loading 时保持宽度，设置 `aria-busy` 并
禁用；disabled 不响应 hover；键盘 focus 使用 strong focus 和 2px 可见轮廓。
浅色模式必须单独减弱按键受光、暗影和扩散范围，保持轻微可辨认的新拟物层级；
不得直接沿用深色模式的长尾阴影强度。

新拟物只适用于 `BaseButton` 和代表普通操作的图标按键。卡片、面板、列表、对话框、
导航项、Tabs、segmented control、开关和输入框不采用新拟物凸起或凹槽，继续遵循
M3E 与玻璃层级规范。

### 7.2 面板与服务板

- 服务状态区必须由一个 `m3e-card` 承载连续玻璃表面，三张服务卡只做内部语义分段。
- 一个连续数据集合使用一个外层玻璃面板；工具栏、表头、行和编辑区只做内部结构。
- `.glass-surface` 只做染色、边界、内高光，不得添加 backdrop blur。
- 浮层使用 `--glass-bg-strong`；页面内容使用 `--surface-card`。
- 卡片和面板不是新拟物控件，不得添加 raised、pressed 或 concave 立体状态。

### 7.3 表单与选择

- 标准输入框高度 38px，圆角由 `--radius-sm` 控制，背景使用 `--field-bg`，边界使用
  `--field-border`。检索与抓取页的主查询输入框是唯一的 Hero 输入变体：高度使用
  `--field-height-hero`（52px），圆角使用 `--radius-md`，以突出页面首要操作。
- focus 只改变边界、顶部高光和轮廓，不改变布局尺寸。
- 开关使用项目 `SwitchField`，选中颜色只来自 primary；减少动态时滑块立即到位。
- Tabs 和 segmented control 使用 full pill。容器使用 `--surface-subtle`，选中项使用
  `--surface-selected`；不得升级为新的磨砂面板。
- 输入框、开关、Tabs 和 segmented control 不属于新拟物范围，只使用现有 M3E
  表面、边框、状态层和焦点轮廓。

### 7.4 提示、对话框和反馈

- `InlineNotice` 的 info、success、error 只改变图标、边框和文字状态色。
- 模态遮罩使用 `--surface-overlay`；对话内容使用 `--glass-bg-strong` 和浮层阴影。
- 所有异步操作显示 loading、禁用重复提交，并分别处理成功、空数据、错误和确认状态。
- 结构化 CLI 失败继续保留 `data`；搜索/抓取失败中的正文必须展示。

### 7.5 页面容器

`PageHeader`、`SectionHeading`、`BaseButton`、`SwitchField`、`InlineNotice` 优先复用。
页面样式只能位于对应 feature 目录，共享视觉 token 只放在全局样式文件。来源、设置、
维护和日志的后续整合应把同语义的工具、列表和编辑区收进一个外层玻璃面板，内部继续
使用分隔线和 `--surface-sunken`。

## 8. Do's and Don'ts

### Do

- 保持 L1–L4 四层玻璃和 L4 的唯一全屏毛玻璃。
- 让 L1–L4 与 `.app-frame` 共享 `32px` squircle。
- 让 `.app-root` 包裹在 `<m3e-theme>` 内，使用 seed `#5ad1c0`、Expressive
  color/motion、strong focus、density `-1`。
- 使用 `--md-sys-color-*` 和本文定义的语义 token；页面只表达组合与例外。
- 用色调、内高光、分隔线建立层级；阴影只帮助浮层和交互反馈。
- 新拟物只用于按键及其 hover、pressed、disabled 和 loading 反馈。
- 为深浅主题、减少动态、减少透明和 960×640 分别验证。
- 浅色模式的卡片层固定使用上述中性白灰琉璃 token；主题生成的浅青色只用于卡片之外的
  primary、选择和状态语义。

### Don't

- 不要为每个面板、列表行或工具栏添加独立 `backdrop-filter`。
- 不要用纯白或纯黑 rgba 替代主题 token；L1/L4 的玻璃例外也只能集中在全局 token 中。
- 不要给服务卡重新添加三块厚重背景，破坏一个 `m3e-card` 的连续表面。
- 不要把卡片、面板、列表、表单控件或导航项做成新拟物凸起或凹槽。
- 不要为装饰新增语义色；success、warning、error 只表达运行状态。
- 不要在页面中拼装 CLI 参数、调用任务客户端或复制服务健康状态机。
- 不要让页面圆角、系统圆角和第二层内缩窗口同时出现。
- 不要用陌生的大字阶、营销文案、假数据或字符图标填充界面。

## 9. Validation

视觉改动至少执行：

```text
npm run build
npm test -- --run
npm run test:e2e
git diff --check
```

路由、交互或样式变化必须同时覆盖桌面 `1280×820` 和最小窗口 `960×640`。需要更新
用户快捷方式或原生窗口时执行 `npm run tauri build`。

官方参考：

- [M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)
- [Motion](https://m3.material.io/styles/motion/overview)
- [Motion specs](https://m3.material.io/styles/motion/overview/specs)
- [Shape morph](https://m3.material.io/styles/shape/shape-morph)
- [Design tokens](https://m3.material.io/foundations/design-tokens/overview)
- [Material Web implementation status](https://m3.material.io/develop/web)
