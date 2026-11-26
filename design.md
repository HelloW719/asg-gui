# Agent Search Gateway 桌面端设计规范

```yaml
version: "5"
status: final
updated: "2026-11-23"
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

本产品是 Agent Search Gateway 的桌面控制面。视觉方向是“2D 战术琉璃控制台”：
四层连续玻璃包住整个窗口，运行状态通过玻璃后的几何形变表达；玻璃之上叠加低对比
战术网格、切面和坐标线，导航、页头与信息标记采用硬朗的 2D 档案终端语法。内容
面板仍使用 M3E/MD3 语义表面，动作按键仍使用新拟物反馈，两者不参与战术外壳改造。

界面的记忆点由两层共同构成：整块玻璃随运行状态变化，外层 2D 构图把页面组织成一张
连续战术界面，而不是由大量独立组件拼接成的后台页面。

默认使用深色主题，同时完整支持浅色主题、减少动态、减少透明、960×640 最小窗口。
界面使用 M3E 语义颜色、层级、形状和弹簧动效；Web 侧没有官方 M3E 实现，项目通过
`@m3e/web` 的 `m3e-theme`、`m3e-button`、`m3e-card` 和自定义 token 映射实现。
纯 Vue/Reka 控件继续承担表单、标签页、对话框和导航。

字体统一使用 Epilogue，中文回退到 `PingFang SC`、`Microsoft YaHei UI` 和
`Noto Sans CJK SC`。图标统一使用 Lucide，不使用字符拼成图标。界面文案只描述真实
状态、真实动作和真实结果。

### 1.1 2D 战术层

- 外层使用 `20px / 100px` 双层坐标网格、单一状态色切面、水平与垂直基准线，以及
  缓慢扫描线。它们位于全屏磨砂层之下，只负责空间定位，不形成可交互面板。
- 导航使用 `01–06` 序号、中文主标签、半透明选中面、右上切角和左侧状态规。英文
  结构标签只显示当前项，作为局部辅助信息；收起为图标栏时隐藏。序号表达固定导航
  位置，不承载业务数据。
- 侧栏与内容区依靠留白、色调和选中块区分，不使用贯穿整列或整屏的竖线；标题栏与
  页面顶部的水平线只保留为短基准标记，不承担分隔职责。
- 页面标题使用开放排版、标题旁真实导航序号与英文结构标签、标题区底部横向建筑标尺
  和贴边巨字幽灵标记。建筑标尺由左端 `64px × 4px` 实色短块与向右渐隐的 `1px` 基准线
  组成，不使用左侧长竖条或独立状态条。幽灵字使用真实英文结构标签，以超大字号、
  低对比实色填充和底部裁切形成从左向后的低层水印；它可以与标题发生少量层级重叠，
  但只做版面重量，不能盖过正文信息，也不能被读屏读取；`1040px` 以下直接移除。
- 战术层只使用背景、伪元素和视觉层标记。页面业务内容、MD3/M3E 卡片和新拟物按键
  不增加切角、网格纹理或硬边框。

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
| `--glass-bg-strong` | 对话框、抽屉、浮层的可读表面；在接近不透明的中性表面上叠加轻微受光和主色染色，兼顾可读性与玻璃感。 |
| `--glass-border` | 内容面板边界，来自 `outline-variant`。 |
| `--glass-highlight` | 面板顶部受光，来自 `on-surface`。 |
| `--glass-shadow` | 轻量外投影，来自 `shadow`。 |
| `--surface-card` | 深色跟随 `surface-container`；浅色固定使用修改前的中性白灰琉璃渐变。 |
| `--surface-card-fill` | 不支持渐变的自定义组件使用的纯色填充；浅色与服务板保持同一中性白灰琉璃色。 |
| `--surface-card-border` | 深色跟随 `outline-variant`；浅色固定使用 `rgba(42, 91, 93, 0.16)`。 |
| `--surface-card-highlight-*` | 玻璃卡片与内容面板的内沿高光和暗边，只表达玻璃边缘，不构成新拟物凸起。 |
| `--surface-card-divider` | 同一块面板内部的语义分隔；浅色使用 `rgba(42, 91, 93, 0.13)`。 |
| `--surface-subtle` | 工具栏、标签容器和低层分段背景。 |
| `--surface-sunken` | 深色主题的低层内容背景；浅色主题固定为透明，内容区只使用分隔线建立层次。 |
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

### 2.3 战术外壳 token

| Token | 用途 |
| --- | --- |
| `--tactical-signal` | 战术层的默认状态色，映射到 MD3 primary |
| `--tactical-plane` / `--tactical-plane-alt` | 低对比切面和第二几何面，只用于整屏背景 |
| `--tactical-grid-minor` / `--tactical-grid-major` | `20px` 细网格与 `100px` 主网格 |
| `--tactical-line` / `--tactical-line-soft` | 导航、标题栏和页面标题的结构线 |
| `--tactical-ghost` | 页面标题后的幽灵文字 |
| `--tactical-scan` | 战术层扫描线 |

战术层在启动、重启和降级状态下使用 ochre，在故障状态下使用 danger。所有 token
均在全局样式中定义；feature 样式不得新增战术层原始色值。

## 3. Typography

Epilogue 负责全部拉丁字符、数字和标题；中文回退字体承担 CJK。基础字号参考成熟的
数据控制台：正文 `14px`，紧凑正文 `13px`，必要元数据最低 `12px`。纯装饰性的战术
标记可以更小，但不能承载必须阅读的业务信息。字号等级集中在语义 token 中，不再为
单个页面增加只差 1–2px 的字号。

| 角色 | 字号 / 行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| Hero display | `clamp(2.6rem, 4vw, 4.2rem)` / `1.05` | 400 | 仅状态页主结论 |
| Page title | `clamp(2rem, 2.4vw, 2.5rem)` / `1.12` | 600 | 每个路由页一个 |
| Section title | `1rem` / `1.3` | 600 | 面板标题与分区标题 |
| Card title | `1.125–1.5rem` / `1.3` | 600 | 服务、维护动作、结果标题 |
| Body | `0.875rem` / `1.6` | 400 | 说明、正文、状态解释 |
| Compact body | `0.8125rem` / `1.45` | 400 | 表格、列表、配置值 |
| Label | `0.8125rem` / `1.45` | 600 | 字段名、状态、工具按键 |
| Metadata | `0.75rem` / `1.4` | 400–500 | 时间、路径、代码、辅助状态 |

数字需要使用等宽字体和 `font-variant-numeric: tabular-nums`。中文标题和正文默认
`letter-spacing: 0`；负字距只用于数字型展示值，拉丁战术标记的大字距只用于少量真正的
装饰标记。Eyebrow 默认不出现在路由页头；只在业务确实需要二级上下文时使用，不重复
标题文字。M3E Expressive 弹簧 token 映射到 `--motion-*-spatial` 和
`--motion-*-effects`；减少动态时所有动画和过渡必须关闭。

页面标题后的幽灵字使用真实英文结构标签，以 `--tactical-ghost` 驱动的超大实色填充、
轻微贴边重叠和底部裁切呈现，并必须通过 `aria-hidden` 或纯装饰层隐藏于读屏名称。
不得继续使用普通淡色中文标题重复作为幽灵字。导航序号、标题栏模式和战术标记使用
等宽字体；卡片标题、正文与动作按键字体保持既有 MD3/M3E 规则。

## 4. Layout

- 默认窗口 `1280×820`，最小窗口 `960×640`，页面不得产生横向溢出。
- 应用框架占满窗口，标题栏 `54px`；侧栏完整宽度 `184px`，宽度低于 `1120px` 时收为
  `72px` 图标栏。
- 页面内容宽度上限 `1320px`，上边距 `24px`，左右内边距
  `clamp(24px, 3vw, 44px)`，底部保留 `64px` 滚动余量。
- 页面顶部绘制一条低对比公共基准线；每个页面标题在标题区底部使用 `64px × 4px`
  实色短块与向右渐隐的 `1px` 建筑标尺，不绘制贯穿页头高度的左侧状态规，也不在标题
  上方放置独立状态条。标题后方可以出现一档贴边巨字幽灵标记，但不参与文档流。
- 侧栏使用 `01–06` 固定序号和右上切角选中面；宽度低于 `1120px` 时只保留图标。
- 间距使用 `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px` 节奏，不新增只差 1–2px 的间距
  token。
- 页面头部与主内容间距 `16px`；同一页面分区间距 `24px`，紧密面板间距 `12px`；
  面板内部通常 `16–24px`。
- 页面头部采用紧凑控制栏：标题、路径或说明、主操作在同一高度带内完成，不使用大块
  欢迎式标题区。幽灵字只作为低层水印，不能决定页头高度。
- 表单使用双列 `form-grid`；在 720px 以下改为单列。工具栏允许换行，必须保持主操作
  可见。
- 状态页使用非对称命令台：左侧主状态面，右侧独立运行摘要；960px 下改为上下排列，
  运行摘要内部变成三列横向分段。服务板继续保持一个连续 `m3e-card`。
- 设置页使用“外观设置主列 + 安装状态侧列”，高级配置在下方独占整行；960px 下
  概览区改为单列。
- 维护页使用“首行诊断摘要 + 下方三个维护域”的非均匀网格；960px 下首行保持横向
  摘要，后续维护域改为两列，最后一个维护域独占整行。
- 检索与抓取页始终保留结果工作区；未执行操作时显示明确的空状态，而不是留下无结构
  的页面空白。
- 欢迎向导沿用标准页头与一个外层玻璃工作区；四个步骤放在同一 `Tabs` 导航中。
  宽窗口使用左侧进度轨与右侧任务面，进度轨持续显示当前步骤、已完成状态、可选项和
  搜索/密钥/扩展配置预览；`1040px` 以下进度轨收为横向步骤条，任务面单独滚动。
  当前步骤使用透明内容面、分隔线和连续行列表，每步同时说明“完成本步后”的结果，
  动作统一放在底部动作带。密钥步骤以待处理队列展示所有缺失项；扩展步骤末尾提供
  完成前检查。该页面不新增欢迎插画、独立 Hero、玻璃卡片或视觉 token。
  搜索强度位于接入系统与配置密钥之间，提供低、中、高三档强度以及独立于强度的返图源
  多选。各处都使用连续字段区和行列表呈现；选中态只使用既有 `surface-selected` 和
  文字层级，不新增独立玻璃卡片或新拟物效果。

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

2D 战术网格与切面位于 L2 和 L4 之间。它们不拥有独立玻璃背景、不添加模糊，也不
接收指针事件；其作用是让状态色在整屏形成方向明确的战术平面，而非第二层内容卡片。

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
- 对话框、抽屉和下拉菜单这类会遮挡正文的浮层，必须使用接近不透明的
  `--glass-bg-strong`，任何情况下都不得复用页面内容的 `.glass-surface`
  透明染色，避免底层文字透出而造成阅读干扰。
- 配置编辑器在所选配置行下方就地展开，保持当前列表上下文；不得用大面积
  底部悬浮面板遮住其他配置行。浅色主题只增加轻微主色状态层和分隔线，不增加
  新的灰色玻璃盒。
- 卡片和面板不是新拟物控件，不得添加 raised、pressed 或 concave 立体状态。

### 7.3 表单与选择

- 标准输入框高度 38px，圆角由 `--radius-sm` 控制，背景使用 `--field-bg`，边界使用
  `--field-border`。检索与抓取页的主查询输入框是唯一的 Hero 输入变体：高度使用
  `--field-height-hero`（52px），圆角使用 `--radius-md`，以突出页面首要操作。
- 下拉选择统一使用共享 `SelectField`，菜单通过 Portal 绘制为
  `--glass-bg-strong` 浮层、`--surface-card-border` 边界和 `--radius-md` 圆角；
  当前项使用 `--surface-selected`，悬停项使用 `--surface-interaction`；选项使用
  `0.875rem` 字号，窄触发框的菜单至少保留 `170px` 可读宽度。不得回退到由操作系统
  绘制的原生下拉菜单。
- 参数、路由等可展开内容统一使用共享 `DisclosurePanel`。折叠标题栏使用
  `--surface-subtle`，展开区使用留白与分隔线，以旋转 Chevron 表达状态；深色主题
  可使用 `--surface-sunken`，浅色主题保持透明，不新增独立毛玻璃或新拟物层级。
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
页面样式只能位于对应 feature 目录，共享视觉 token 只放在全局样式文件。页面容器按
任务组织成非对称控制区：主数据、辅助摘要和动作带各有自己的位置。来源、设置、维护
和日志的同语义工具、列表与编辑区仍收在一个外层玻璃面板中，内部使用留白和分隔线；
浅色主题不使用 `--surface-sunken` 灰底，不堆叠新的玻璃盒。

### 7.6 导航、标题栏与战术标记

- `AppSidebar` 使用固定 `01–06` 序号、Lucide 图标和中文标签；选中态使用硬边浅色面、
  左侧状态规和右上切口。收起为图标栏时隐藏序号、标签和切口。
- `AppTitleBar` 保持透明，仅用一条渐变基准线分段；左上角使用产品名与运行元信息的
  两级文字结构，不配置品牌图标；`LOCAL CONTROL` 是产品模式标记，不显示伪造的
  机器或运行数据。
- `PageHeader` 统一提供开放标题排版、真实导航序号、英文结构标签、标题区底部横向
  建筑标尺和贴边巨字幽灵标记。建筑标尺由短实色块与渐隐细线组成，只作版面对齐参考，
  不贯穿标题高度，也不能形成进度条轮廓。幽灵字使用独立的 `aria-hidden` 装饰元素和
  真实英文结构标签，不能被合并进页面标题的可访问名称。
- 以上结构属于外壳与导航，不得替换 MD3/M3E 卡片、表单、Tabs 或新拟物动作按键。

## 8. Do's and Don'ts

### Do

- 保持 L1–L4 四层玻璃和 L4 的唯一全屏毛玻璃。
- 让 L1–L4 与 `.app-frame` 共享 `32px` squircle。
- 用战术网格、切面、序号、建筑标尺和贴边巨字建立 2D 构图。
- 保持 M3E/MD3 卡片结构与新拟物动作按键的既有物料和交互反馈。
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
- 不要把战术切角、网格或硬边状态规套到 MD3 卡片和动作按键上。
- 不要让战术网格成为可交互内容层、第二套页面背景或独立玻璃卡。
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
