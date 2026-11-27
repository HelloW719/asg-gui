# Agent Search Gateway 桌面端

本仓库是 **Agent Search Gateway 的 GUI 客户端**，不是 Gateway 服务、ASG CLI、
SearXNG、FlareSolverr 或搜索实现本身。本仓库只负责界面交互、状态展示和桌面体验，
后端能力应位于对应的 ASG 项目中，不要在本仓库重新实现。

GUI 使用 Vue 3 和 Tauri 构建。界面的业务操作必须通过 ASG CLI 完成，不要在页面中
自行实现文件、进程、网络、搜索或抓取逻辑。Tauri 层只承担桌面集成和 CLI 桥接。
除非任务明确要求重新设计，否则必须保留四层玻璃视觉；材质和动效以
`design/glass-lab` 为参考。

## 架构定位与驱动

本 GUI 是 **分层、按功能切片的桌面控制面 SPA**：

- Vue 3 Composition API 负责视图和页面组合；
- feature composable 承担页面级状态、交互编排和类似 view-model 的职责；
- Pinia 保存跨页面运行状态；
- `services/asg` 是类型化 CLI 命令适配层；
- `services/desktop` 是 Tauri IPC 和任务传输层；
- Tauri/Rust 是薄桌面桥，ASG CLI 是业务能力边界；
- 玻璃引擎是独立的、状态驱动的视觉子系统。

架构主要由以下因素驱动：

1. **ASG CLI 能力契约**决定 GUI 能提供哪些业务动作和数据结构；
2. **JSON/JSONL 与任务生命周期**决定任务执行、流式事件、取消和错误处理模型；
3. **桌面控制面的操作域**决定 status、explore、sources、logs、settings、
   maintenance 等 feature 切片；
4. **Tauri 桌面约束**决定窗口、托盘、目录选择、主题和子进程桥接；
5. **运行状态的视觉表达**决定四层玻璃场景，但视觉层不能接触业务服务。

不要把页面数量、组件库或玻璃效果本身当作业务架构。页面只负责组装，状态和
能力应位于约定层次。

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
- `src/types/cli.ts`：GUI 消费的 ASG CLI 线协议与 Tauri 任务桥类型；它必须与
  ASG core 的机器契约保持一致，不能自行定义后端字段语义。
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

## 运行链路与状态归属

典型业务调用链为：

```text
页面交互
-> feature composable
-> src/app 服务访问与状态组合
-> src/services/asg 类型化命令适配
-> jobs store 的 AsgCommandRunner
-> services/desktop JobClient
-> Tauri IPC / Rust 子进程桥
-> ASG CLI
-> result / JSONL event
-> JobClient -> Pinia / feature 状态 -> 页面反馈
```

- 页面和 feature 不得直接启动任务、调用 `jobClient`、拼装业务 CLI 参数或执行
  `jobs.execute` / `jobs.stream`。
- `src/services/asg` 只负责命令语义、参数和结构化结果；不得实现文件、进程、
  网络、搜索或抓取逻辑。
- `jobs` store 负责运行中任务、并发标签、最后结果/错误和命令运行器接口。
  结构化失败必须保留 CLI result 中的 `data`，供功能层继续展示。
- session、jobs、status、appearance 等跨页面运行状态放在 Pinia；仅在单个页面
  使用的表单、加载、弹窗和结果状态放在对应 feature composable。
- `useAppBootstrap` 是初始化、主题应用、状态轮询、导航事件和原生事件监听的唯一
  所有者。store 和组件不得建立重复的轮询或监听。
- 页面视觉状态通过 `useAppStatus` 等 app 层组合函数派生；feature 不得各自维护
  一套服务健康状态机。

## 桌面桥与视觉边界

- `services/desktop` 是前端访问 Tauri IPC、窗口和任务事件的唯一入口。
- Tauri/Rust 只处理安装目录校验、窗口/托盘、主题持久化、CLI 子进程启动、命令
  白名单、stdin、任务取消、写操作互斥和退出保护；不得复制 ASG 业务规则。
- 桌面窗口使用透明、无边框、无系统阴影配置，由页面绘制连续曲率圆角；不得额外
  增加内缩留白或第二层窗口外壳。Windows 必须关闭 DWM 自带圆角与边框，避免与
  页面圆角叠加。相关 DWM 能力只能通过 Windows 目标依赖引入。
- Windows、macOS、Linux 都使用页面内窗口按钮。调整原生窗口装饰或标题栏策略时，
  必须同时核对 `tauri.*.conf.json` 与 `AppTitleBar`，不能只改单个平台。
- 调用 CLI 必须使用参数数组，不经过 shell。密钥只通过 stdin 传递，不进入 argv、
  GUI 日志或持久化页面状态。
- `src/visual/glass` 只接收视觉状态、主题、减少动态和帧率参数，不导入 services
  stores 或 feature。业务状态先在 app 层映射为 `VisualState`，再由视觉层表现。
- 路由页面必须能在 960×640 最小窗口中工作，四层玻璃和页面内容不得产生横向
  溢出；原生程序更新必须通过 `npm run tauri build`。

## 数据契约

- ASG core 的 `docs/cli-contract.md`、`src/cli/output.ts` 及相关命令模块是机器
  数据契约的权威来源。GUI 只消费契约，不在本仓库重新解释命令输出或复制业务规则。
- `schema_version` 标识 CLI 数据协议版本，与 ASG core 版本、GUI 版本相互独立。
- CLI result 中，`ok:true` 必须包含 `data` 且不能包含 `error`；`ok:false` 必须包含
  `error`。只有 `search` / `fetch` 的数据面失败可以同时保留 `data`，GUI 必须继续
  展示其中的 `text`，不能因抛错丢弃 CLI 返回的错误正文。
- `ok` 只表示命令是否返回有效结果，不等同于服务健康或进程退出码。例如 `doctor`
  即使存在 error 级检查并以非零退出码结束，result 仍可为 `ok:true`。
- CLI event 的公共外壳是 `type`、`schema_version` 和 `event`；GUI 必须忽略未知
  event 类型。Tauri 的 `jobId`、`kind`、`started`、`exit`、`cancelled` 属于任务桥，
  不是 ASG CLI 的业务数据契约。
- `CliResult`、`CliEvent` 和 `JobEvent` 使用判别联合表达。新增或修改命令字段时，
  先更新 ASG core 契约和契约测试，再同步 `src/types/cli.ts`，禁止以 `any` 或
  无约束的 `unknown` 掩盖漂移。

## 组件与状态规范

- 路由页面负责组装，不应继续堆叠大量业务和交互代码。
- 独立面板、列表、弹窗、工具栏和重复状态应拆为类型明确的 feature 组件。
- 页面编排放不下一项职责时，应提取到聚焦的组合式函数。
- 展示组件通过带类型的 `props` 和 `emits` 通信，不要使用隐式 `any`。
- 优先复用 `PageHeader`、`SectionHeading`、`BaseButton`、`SwitchField` 和
  `InlineNotice`，不要重复创建同类控件。
- M3E Web Components 只作为视觉原语使用：全局导入并承载 `m3e-theme`，
  共享 `BaseButton` 封装 `m3e-button`，一体化服务板使用 `m3e-card`；tabs、
  dialog、表单和导航继续使用现有 Vue/Reka 实现。
- `BaseButton` 必须把 primary/danger、secondary、ghost 分别映射到
  filled、tonal、text 以保留 M3E 的形状、尺寸、状态层、focus 和原生 click
  行为，但不得继承其 primary、secondary 或 error 容器填色。按键表面保持透明，
  直接承接父组件原色，只用外层高光、投影和按压反馈表达新拟物；错误色仅用于危险
  操作的文字和图标。primary、secondary、ghost 的层级只能通过文字对比、字重和
  深度反馈表达，不得恢复 M3E 容器装色。hover、pressed、disabled 和 loading
  必须同步改变新拟物状态；pressed 同时响应原生 `:active` 和 M3E 的 `--pressed`
  自定义状态，使 M3E 形变与新拟物内凹处于同一生命周期。浅色模式必须单独减弱
  按键受光、暗影和扩散范围，不得直接沿用深色模式的长尾阴影强度。系统窗口按钮
  保持平面。
- 新拟物只适用于 `BaseButton` 和代表普通操作的图标按键。卡片、面板、列表、
  dialog、导航项、tabs、segmented control、开关和输入框不得添加新拟物凸起、
  凹槽或 pressed 外观，继续使用 M3E 颜色、玻璃表面、边框和状态层。
- 页面不得直接调用 `jobClient`、桌面任务接口或原始
  `jobs.execute` / `jobs.stream`。
- ASG 命令应放入 `src/services/asg/*`，页面通过 `useAsgServices` 或功能组合式函数
  访问，并保留结构化错误、stdin 密钥保护和任务取消能力。
- 所有异步操作都应提供加载或禁用反馈，并处理错误、成功、空数据和确认状态。

## 样式与玻璃效果

- 全局样式只放在 `tokens.css`、`base.css`、`controls.css` 和 `shell.css`。
- `design.md` 是最终视觉契约；`tokens.css` 负责把其中颜色、字阶、布局、层级、
  形状和组件规则映射为运行时 token。两者必须在同一次设计变更中同步。
- 页面和功能样式优先使用 `--md-sys-color-*` 与 `--surface-*`、`--outline-*`、
  `--field-*` 等语义 token；原始色值只允许集中在全局 token 或 L1/L4 玻璃例外中。
- 页面样式留在对应 feature 目录，禁止在功能样式中覆盖其他页面的通用选择器。
- 整个应用只能有一层全屏毛玻璃：`GlassShell` 中的 `.glass-frost-layer`。
- 内容面板使用染色、边框和内阴影，不能分别再次添加 `backdrop-filter`。
- 浅色模式的大块内容区、卡片网格、列表和展开区使用透明表面、留白与分隔线建立
  层次；`--surface-sunken` 在浅色主题中保持透明，不得用半透明暗色填充制造灰影。
- M3E 主题必须通过包裹 `.app-root` 的 `<m3e-theme>` 注入，使用
  `#5ad1c0` seed、expressive color/motion 和 strong focus；不得把
  `m3e-theme` 直接放在 `body` 下覆盖透明窗口背景。
- 所有交互动效优先引用 `--md-sys-motion-spring-*` 映射后的
  `--motion-*-spatial/effects` token；减少动态时必须同时关闭动画和过渡。
- 服务状态区必须使用一个 `m3e-card` 承载连续玻璃表面，三张状态卡只作为内部
  语义分段和分隔，不得重新拆成三块独立厚重背景。
- 保持四层结构：L1 背景与噪声、L2 动态几何、L3 降采样模糊、L4 全屏磨砂。
- 2D 战术层只允许使用低对比网格、状态切面、基准线、导航序号和幽灵标题，位于
  全屏磨砂之下且不接收指针事件；不得成为第二套内容背景或独立玻璃卡。
- MD3/M3E 卡片结构与新拟物动作按键属于固定视觉契约；战术切角、硬边框、网格纹理
  只能用于外壳、导航和页头，不得套到卡片或按键上。
- 顶层窗口使用 `--window-radius` 的 `squircle` 连续曲率圆角，L1-L4 与
  `.app-frame` 必须共享同一轮廓；不得改回仅用普通 `border-radius` 的圆弧。
  旧 WebView 不支持 `corner-shape` 时，才允许由普通圆角渐进降级。
- 必须兼容深色、浅色、减少动态、减少透明和 960×640 最小窗口。
- 跨顶层模块使用 `@/` 别名，同一个 feature 内可以使用相对路径。

## 完成标准

提交或报告完成前，应执行：

1. `npm run build`
2. `npm test -- --run`
3. 路由、交互或样式发生变化时执行 `npm run test:e2e`
4. 需要更新桌面程序时执行 `npm run tauri build`
5. 数据契约发生变化时，还应在 ASG 仓库执行 `npm run build`、契约测试和受影响
   CLI 测试，再回到本仓库执行构建与测试
6. 使用 `git diff --check` 检查格式问题

提交信息使用中文并准确概括实际改动。无关重构、格式化和其他功能修改不要混入同一个
提交。测试和 fixture 可以使用模拟状态，但不要把演示数据写进产品界面。

只要目录职责、常用命令、依赖方向、数据契约、组件约定、样式边界或完成标准发生
变化，就应在同一次改动中同步更新本文件。不要把已经失效的架构说明留在
`AGENTS.md` 中。
