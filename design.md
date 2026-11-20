注意，本项目应该使用玻璃+大圆角+琉璃色（55%透明+高斯模糊+染色），组件方面应该使用md3e（琉璃特化），按键方面使用新拟物（需要和玻璃结合),其他一切设计都y
应遵循md3e规范，包括阴影，层级设计，uiux设计，引导设计，尽量少的使用“省力”设计，而是注重界面一体化，尽量让整块页面更像一整块玻璃而不是市面上常见的简单组件堆叠


## 1. MD3E官方规范索引（M3E）

M3E 是 Material 3 的一次演进（2025-05 发布）

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

## 附录 A：M3 DESIGN.md 参考骨架

> 来源：`darlanrod/material-design-md` 的 `assets/example-design.md`（MPL-2.0），按 Google Labs `design.md` 规范输出。
> 已移除示例品牌（Bossa）的叙事，只保留 token 结构与八节骨架。
> 色值是上游 Tonal Spot 深色方案的示例，**仅用于验证结构**；定稿前应使用该仓库的 `scripts/generate_design_tokens.*`，按本项目 seed 重新生成。
> 本快照是 M3；M3E 新增的 `large-increased` / `extra-extra-large` 圆角、emphasized 字阶、弹簧动效不在其中。

### A.1 YAML token 结构（示例值）

```yaml
version: alpha
name: Agent Search Gateway
description: 桌面控制面；四层玻璃外壳，语义状态驱动视觉。
colors:
  primary: "#9ed49d"
  surfaceTint: "#9ed49d"
  onPrimary: "#043912"
  primaryContainer: "#1f5026"
  onPrimaryContainer: "#b9f0b7"
  secondary: "#d9c770"
  onSecondary: "#393000"
  secondaryContainer: "#524600"
  onSecondaryContainer: "#f7e388"
  tertiary: "#b5c4ff"
  onTertiary: "#1c2d60"
  tertiaryContainer: "#344478"
  onTertiaryContainer: "#dce1ff"
  error: "#ffb4ab"
  onError: "#690005"
  errorContainer: "#93000a"
  onErrorContainer: "#ffdad6"
  background: "#101410"
  onBackground: "#e0e4db"
  surface: "#101410"
  onSurface: "#e0e4db"
  surfaceVariant: "#424940"
  onSurfaceVariant: "#c2c9bd"
  outline: "#8c9389"
  outlineVariant: "#424940"
  shadow: "#000000"
  scrim: "#000000"
  inverseSurface: "#e0e4db"
  inverseOnSurface: "#2d322c"
  inversePrimary: "#38693c"
  primaryFixed: "#b9f0b7"
  onPrimaryFixed: "#002107"
  primaryFixedDim: "#9ed49d"
  onPrimaryFixedVariant: "#1f5026"
  secondaryFixed: "#f7e388"
  onSecondaryFixed: "#211b00"
  secondaryFixedDim: "#d9c770"
  onSecondaryFixedVariant: "#524600"
  tertiaryFixed: "#dce1ff"
  onTertiaryFixed: "#02174b"
  tertiaryFixedDim: "#b5c4ff"
  onTertiaryFixedVariant: "#344478"
  surfaceDim: "#101410"
  surfaceBright: "#363a34"
  surfaceContainerLowest: "#0b0f0b"
  surfaceContainerLow: "#181d18"
  surfaceContainer: "#1c211b"
  surfaceContainerHigh: "#272b26"
  surfaceContainerHighest: "#313630"
typography:
  display-large: { fontFamily: Epilogue, fontSize: 57px, fontWeight: 400, lineHeight: 1.1 }
  display-medium: { fontFamily: Epilogue, fontSize: 48px, fontWeight: 400, lineHeight: 1.1 }
  display-small: { fontFamily: Epilogue, fontSize: 40px, fontWeight: 400, lineHeight: 1.1 }
  headline-large: { fontFamily: Epilogue, fontSize: 33px, fontWeight: 400, lineHeight: 1.2 }
  headline-medium: { fontFamily: Epilogue, fontSize: 28px, fontWeight: 400, lineHeight: 1.2 }
  headline-small: { fontFamily: Epilogue, fontSize: 23px, fontWeight: 400, lineHeight: 1.2 }
  title-large: { fontFamily: Epilogue, fontSize: 19px, fontWeight: 500, lineHeight: 1.2 }
  title-medium: { fontFamily: Epilogue, fontSize: 16px, fontWeight: 500, lineHeight: 1.2 }
  title-small: { fontFamily: Epilogue, fontSize: 13px, fontWeight: 500, lineHeight: 1.2 }
  body-large: { fontFamily: Epilogue, fontSize: 16px, fontWeight: 400, lineHeight: 1.5 }
  body-medium: { fontFamily: Epilogue, fontSize: 13px, fontWeight: 400, lineHeight: 1.5 }
  body-small: { fontFamily: Epilogue, fontSize: 11px, fontWeight: 400, lineHeight: 1.5 }
  label-large: { fontFamily: Epilogue, fontSize: 13px, fontWeight: 500, lineHeight: 1.4 }
  label-medium: { fontFamily: Epilogue, fontSize: 11px, fontWeight: 500, lineHeight: 1.4 }
  label-small: { fontFamily: Epilogue, fontSize: 9px, fontWeight: 500, lineHeight: 1.4 }
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    stateLayer: "{colors.onPrimary}"
    stateLayerOpacity: "8%"
  button-primary-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    stateLayer: "{colors.onPrimary}"
    stateLayerOpacity: "10%"
  button-primary-disabled:
    backgroundColor: "{colors.onSurface}"
    backgroundOpacity: "12%"
    textColor: "{colors.onSurface}"
    textOpacity: "38%"
  button-secondary:
    backgroundColor: "{colors.secondaryContainer}"
    textColor: "{colors.onSecondaryContainer}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
    height: "40px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
    height: "40px"
  input-field:
    backgroundColor: "{colors.surfaceContainerHighest}"
    textColor: "{colors.onSurface}"
    typography: "{typography.body-large}"
    rounded: "{rounded.xs}"
    padding: "{spacing.md}"
    height: "56px"
    outlineColor: "{colors.outline}"
    outlineWidth: "1px"
  input-field-focused:
    backgroundColor: "{colors.surfaceContainerHighest}"
    textColor: "{colors.onSurface}"
    outlineColor: "{colors.primary}"
    outlineWidth: "2px"
  input-field-error:
    backgroundColor: "{colors.surfaceContainerHighest}"
    textColor: "{colors.error}"
    outlineColor: "{colors.error}"
    outlineWidth: "2px"
  input-field-disabled:
    backgroundColor: "{colors.onSurface}"
    backgroundOpacity: "4%"
    textColor: "{colors.onSurface}"
    textOpacity: "38%"
    outlineColor: "{colors.onSurface}"
    outlineOpacity: "12%"
    outlineWidth: "1px"
  card:
    backgroundColor: "{colors.surfaceContainerLow}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  chip:
    backgroundColor: "{colors.surfaceContainerLow}"
    textColor: "{colors.onSurfaceVariant}"
    typography: "{typography.label-large}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.secondaryContainer}"
    textColor: "{colors.onSecondaryContainer}"
  tooltip:
    backgroundColor: "{colors.inverseSurface}"
    textColor: "{colors.inverseOnSurface}"
    typography: "{typography.body-small}"
    rounded: "{rounded.xs}"
    padding: "{spacing.sm}"
```

### A.2 八节写作骨架

按 Google DESIGN.md 规范，正文固定八节；每节先写职责，再写取值。

1. **Overview**：产品像什么、默认深浅色、设计框架、图标与图像风格；只写能约束决策的描述，不写营销文案。
2. **Colors**：每个色角色只承担一件事；说明 `primary` / `secondary` / `tertiary` 的分工、表面层级、状态色；玻璃语义色（healthy / degraded / working / restarting）不属于 M3 色板，需单独说明。
3. **Typography**：字阶用途、标题与正文的字体关系、单屏权重上限；本项目统一 `Epilogue`，字号需按桌面密度收敛，不直接沿用 57px 的 display 值。
4. **Layout**：默认 1280×820、最小 960×640；网格、边距、间距节奏；960 宽下不得横向溢出。
5. **Elevation & Depth**：优先用 tonal surface 分层而非阴影；玻璃 L1–L4 是例外，按玻璃基线单独维护。
6. **Shapes**：窗口 32px `squircle`；内容 24 / 18 / 14 / 10；按钮与内容圆角的搭配规则；不得混用无意义的圆角。
7. **Components**：只写本项目真实存在的 `BaseButton`、`SwitchField`、`InlineNotice`、`PageHeader` 等；组件属性引用 token，不内联色值。
8. **Do's and Don'ts**：可执行的护栏，例如「整个应用只有一层全屏毛玻璃」「不为每个面板单独加 `backdrop-filter`」「语义色只表达运行状态」。

### A.3 使用方式

- 本附录只提供 M3 DESIGN.md 的**格式与 token 结构**，不替代玻璃与动效基线。
- 先确定 seed 或 primary / secondary / tertiary 三色，再运行 `material-design-md` 的 `scripts/generate_design_tokens.*` 生成 49 色，替换 `colors:` 与 `components:` 中的引用。
- M3E 新增 token（`large-increased`、`extra-extra-large`、emphasized 字阶、弹簧动效）尚未纳入本骨架；需要时再按 `m3.material.io/styles` 增补。