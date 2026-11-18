# Agent Search Gateway 桌面端

本仓库是 **Agent Search Gateway 的 GUI 客户端**，不是 Gateway 服务、ASG CLI、
SearXNG、FlareSolverr 或搜索实现本身。本仓库只负责界面交互、状态展示和桌面体验，
后端能力应位于对应的 ASG 项目中，不要在本仓库重新实现。

GUI 使用 Vue 3 和 Tauri 构建。界面的业务操作必须通过 ASG CLI 完成，不要在页面中
自行实现文件、进程、网络、搜索或抓取逻辑。Tauri 层只承担桌面集成和 CLI 桥接。
除非任务明确要求重新设计，否则必须保留四层玻璃视觉；材质和动效以
`design/glass-lab` 为参考。

## 常用命令

- `npm run dev`：启动浏览器预览，地址为 `127.0.0.1:1420`。
- `npm run tauri dev`：启动 Tauri 原生开发窗口。
- `npm run build`：执行 TypeScript 检查并构建 Web 资源。
- `npm test -- --run`：运行单元测试和架构边界测试。
- `npm run test:e2e`：在桌面和最小窗口尺寸下运行 Playwright 测试。
- `npm run tauri build`：重新构建桌面可执行文件。

`npm run build` 不会更新桌面程序。只要快捷方式或原生应用需要体现最新代码，就必须
运行 `npm run tauri build`。

## 目录职责

- `src/features/*`：页面、功能组件、页面样式和功能组合式函数。
- `src/shared/ui`：不依赖具体业务、可跨功能复用的展示组件。
- `src/app`：应用启动、状态组合和服务访问的集成层。
- `src/services/desktop`：Tauri IPC、窗口、事件和任务传输。
- `src/services/asg`：类型化 CLI 服务，前端只有这一层可以拼装 ASG 参数。
- `src/stores`：Pinia 领域状态，禁止导入页面或组件。
- `src/visual/glass`：玻璃场景引擎和四层外壳。
- `src/styles`：全局设计令牌、基础样式、通用控件和外壳样式。

依赖方向应为：

```text
features -> app/shared/stores
app -> services/stores
stores -> services
```

`services` 和 `shared/ui` 不得导入业务界面模块。不同 feature 之间不得直接互相导入；
需要协作时通过 `src/app`、共享组件或领域服务完成。

## 组件与状态规范

- 路由页面负责组装，不应继续堆叠大量业务和交互代码。
- 独立面板、列表、弹窗、工具栏和重复状态应拆为类型明确的 feature 组件。
- 页面编排放不下一项职责时，应提取到聚焦的组合式函数。
- 展示组件通过带类型的 `props` 和 `emits` 通信，不要使用隐式 `any`。
- 优先复用 `PageHeader`、`SectionHeading`、`BaseButton`、`SwitchField` 和
  `InlineNotice`，不要重复创建同类控件。
- 页面不得直接调用 `jobClient`、桌面任务接口或原始
  `jobs.execute` / `jobs.stream`。
- ASG 命令应放入 `src/services/asg/*`，页面通过 `useAsgServices` 或功能组合式函数
  访问，并保留结构化错误、stdin 密钥保护和任务取消能力。
- 所有异步操作都应提供加载或禁用反馈，并处理错误、成功、空数据和确认状态。
- `useAppBootstrap` 是初始化、主题应用、状态轮询和原生事件监听的唯一所有者，
  不要在 store 或组件里重复。

## 样式与玻璃效果

- 全局样式只放在 `tokens.css`、`base.css`、`controls.css` 和 `shell.css`。
- 页面样式留在对应 feature 目录，禁止在功能样式中覆盖其他页面的通用选择器。
- 整个应用只能有一层全屏毛玻璃：`GlassShell` 中的 `.glass-frost-layer`。
- 内容面板使用染色、边框和内阴影，不能分别再次添加 `backdrop-filter`。
- 保持四层结构：L1 背景与噪声、L2 动态几何、L3 降采样模糊、L4 全屏磨砂。
- 必须兼容深色、浅色、减少动态、减少透明和 960×640 最小窗口。
- 跨顶层模块使用 `@/` 别名，同一个 feature 内可以使用相对路径。

## 完成标准

提交或报告完成前，应执行：

1. `npm run build`
2. `npm test -- --run`
3. 路由、交互或样式发生变化时执行 `npm run test:e2e`
4. 需要更新桌面程序时执行 `npm run tauri build`
5. 使用 `git diff --check` 检查格式问题

提交信息使用中文并准确概括实际改动。无关重构、格式化和其他功能修改不要混入同一个
提交。测试和 fixture 可以使用模拟状态，但不要把演示数据写进产品界面。

只要目录职责、常用命令、依赖方向、组件约定、样式边界或完成标准发生变化，就应在
同一次改动中同步更新本文件。不要把已经失效的架构说明留在 `AGENTS.md` 中。
