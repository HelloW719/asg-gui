> **这是独立原型，不参与根项目的构建。**
> `design/glass-lab/` 是四层玻璃视觉与性能的验证台（Vite + React + Electron），
> 与仓库根目录的 Tauri + Vue 应用没有任何代码依赖。需要单独 `npm install` 后运行。
> 这里沉淀的是定案后的视觉参数与绘制实现，供正式界面参考。

# Glass Lab：多层玻璃拟态视觉性能原型

一个用来确认「四层玻璃拟态 GUI 到底能不能做、代价多大」的独立原型仓库。不是产品界面，是测量台。

- **L1 背景**：底色 + 噪点
- **L2 动效**：简单几何 —— 可用绿圆（右下）、不可用黄圆（左上）、加载曲奇（居中）
- **L3 玻璃**：离屏降采样 + 模糊 + 半透明合成
- **L4 玻璃**：整块 `backdrop-filter` 磨砂覆盖全 app（无边框、不分割），边缘曲面软化

这个 lab 要回答两个问题：

1. **视觉可行性**：四层叠起来、动起来，还是不是「干净的玻璃」，会不会互相糊成一团、高光/描边在动效下是否稳定；
2. **性能成本**：在真实合成路径下（真实窗口、真实 GPU、真实 DPR），6 个应用状态各自跑 7 秒，帧间隔分布是什么样，p95/p99 落在哪里，掉帧集中在什么状态。

## 视觉定案（2026-11-20）

定案为「55% 厚玻璃」，已固化进 `DEFAULT_PARAMS`，打开就是这套：

| 层 | 参数 |
|---|---|
| L1 背景 | `#0e1622`，噪声 0.03 |
| L2 几何 | 可用 = 绿色圆（右下，出界 35%）；不可用 = 黄色圆（左上，出界 35%）；加载 = 曲奇（6 瓣正弦扰动 + 旋转 + 呼吸，颜色跟随状态） |
| L3 模糊 | 36px，1/4 降采样，55% 叠加 |
| L4 玻璃 | 20px backdrop-blur，染色 55%，整块覆盖（不是多面板） |
| 边缘模型 | 曲面：柔和亮带 → 长尾；32px `squircle` 连续曲率圆角 |
| 边缘强度 | `--glass-bevel: 1`（`?bevel=` 仅调试用） |
| 动画速度 | 1.0× |

对应的硬编码值在 `src/types.ts` 的 `DEFAULT_PARAMS`；`src/lab/presets.ts` 里保留了「基准 / 重玻璃 / 性能优先 / 取消模糊」作为对照。

状态切换时形状会做 morph，时长 **1400ms**，曲线用 `smootherstep`（两端一阶、二阶导都为 0）。

拆成两段，避免五个维度同时变化显得乱：

- **0–30%**：只做位置和缩放
- **30–100%**：长花瓣、换色

所有几何的 `lobes` 都固定为 6，只插值 `amp`，所以圆是「平滑长出花瓣」，不会经过三角形 / 四边形这类中间态。

**旋转**：过渡期间整体转一圈（`2π`），方向与时机随形状方向镜像：

| 过渡 | 方向 | 旋转曲线 |
|---|---|---|
| 曲奇 → 圆 | 顺时针 | `raw^1.5`（先缩后转，偏后半段） |
| 圆 → 曲奇 | 逆时针 | `1-(1-raw)^1.5`（先转后长，偏前半段） |

终值取 `2π` 的整数倍，结束时角度与开始时等价，不会跳帧。6 瓣形状本身 60° 对称，所以改系数只要是 60° 的倍数也无缝。

动态层只有三种几何，映射写在 `src/layers/motion/scene.ts`：`healthy` → 绿圆，`degraded` / `error` → 黄圆，其余（`booting` / `working` / `restarting`）→ 曲奇。圆的圆心落在视口外 35%，只露出大半个，读起来像是从角落溢出的色块；曲奇的凸起幅度是 `0.13`，可以往下调到 `0.07` 变得更像饼干。

边缘不用 1px 描边，也不用固定的环带，而是 `glass.css` 里一组 inset shadow 叠出的曲面：
曲面亮带离边 2–7px、再长尾衰减；底部反向成暗带，形成厚度；四角用 radial-gradient 补聚光。
这套结构使用超椭圆连续曲率，从直边开始缓慢弯折，再平滑过渡到最弯处，没有任何一条能单独被看见的亮线。

它现在作用在**整块磨砂**（`.layer-frost`）上，而不是每个面板各来一份：
全 app 只有一层 backdrop-filter，一次采样、一次模糊；布局面板退化成纯容器，
不再有自己的圆角/描边/投影。窗口本身无边框，玻璃直接形成连续曲率窗口轮廓。

> **构建期陷阱**：CSS 里同时写 `backdrop-filter` 和 `-webkit-backdrop-filter` 时，
> 生产构建的压缩器会把标准属性判定为重复并删掉，只留下 `-webkit-` 版本。
> Chromium 认前缀所以看着正常，Firefox 只认标准属性 → 磨砂直接失效。
> 因此只写标准属性，前缀交给工具链补。

## 怎么跑

### 1. 浏览器里手动跑（最快，用于调视觉）

```bash
npm install
npm run dev          # http://127.0.0.1:5199
```

打开页面后：

- 右侧面板是参数区，可以直接拖 L3 模糊 / 降采样 / 透明度、L4 模糊 / 染色、噪点、高光、描边、动画速度；
- 点「跑 48 秒测量」按钮，会依次跑完 6 个状态，每态约 7 秒；
- 跑完后点导出，会下载一份 `lab-report-*.json`。

也可以在 DevTools Console 里直接操作 `window.__lab`：
```js
await window.__lab.runMeasure();   // 完整测量，约 48 秒
window.__lab.isMeasuring();        // 是否正在测量
window.__lab.getReport();          // 最近一次报告（未跑过为 null）
window.__lab.getParams();          // 当前参数
window.__lab.info();               // gpu / screen / ua / platform
window.__lab.setParams({ l3Blur: 24 });
```

> 注意：浏览器标签页切到后台后 `requestAnimationFrame` 会被降频甚至暂停，后台跑出来的数据没有意义。请把窗口放在前台、不要最小化。

URL 参数可以直接定格画面，方便批量截图和回归：

```text
?state=error                  # 固定状态
?l3blur=56&ds=2&l4blur=28     # 固定参数（ds 只接受 2 / 4 / 8）
?duration=8000&states=healthy # 缩短测量：每态 8s，只测 healthy
```

### 2. Electron 里跑（推荐，数据更接近真实桌面应用）

Electron 壳的意义是把页面放进一个**不透明、系统标题栏、固定 1440x900** 的真实窗口里，并显式关掉后台节流（`backgroundThrottling: false`），让测量条件接近最终形态的桌面应用。

```bash
# 终端 A：保持 dev server 运行
npm run dev

# 终端 B：Electron 测量
npm run lab
```

`npm run lab` 背后是 `node scripts/run-lab.mjs`，它会：

1. 用 `fetch` 探测 `--url`（默认 `http://127.0.0.1:5199`）是否可达，不可达就提示先跑 `npm run dev`；
2. 找到 `node_modules/electron` 里的可执行文件；
3. spawn `electron electron/main.cjs`，`stdio: inherit`；
4. 等 Electron 退出，打印报告与截图路径。

可用参数（两个脚本都支持）：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--url <url>` | `http://127.0.0.1:5199` | 要测量的页面 |
| `--out <path>` | `./lab-report-<timestamp>.json` | 报告路径 |
| `--width <n>` | `1440` | 窗口宽（CSS px） |
| `--height <n>` | `900` | 窗口高（CSS px） |
| `--electron <path>` | 从 `node_modules/electron` 解析 | 手动指定 Electron 可执行文件 |

示例：

```bash
node scripts/run-lab.mjs --out ./lab-shots/mac-1440x900.json
node scripts/run-lab.mjs --url http://127.0.0.1:5173
```

> 建议把 `--out` 放到 `lab-shots/` 下：`.gitignore` 已经忽略 `lab-shots/` 和根目录的 `lab-report-*.json`，但报告旁边的 `-before.png` / `-after.png` 不会被 `lab-report-*.json` 规则匹配，放在根目录会出现在 `git status` 里。

Electron 壳的行为：

1. 等到 `typeof window.__lab === 'object'` 且 `runMeasure/isMeasuring/getReport` 都存在（最多 20 秒）；
2. 截图 `<out>-before.png`；
3. 调 `window.__lab.runMeasure()`，每 500ms 轮询 `isMeasuring()`；
4. 结束后取 `getReport()` + `info()`，与 Electron 运行时信息合并写 JSON；
5. 截图 `<out>-after.png`，退出码 0。

失败（20 秒内 `__lab` 不可用、测量超过 120 秒、页面内抛错）会写一份带 `error.stage` 的错误 JSON，并以非 0 退出。

## 报告怎么读

报告结构：

```jsonc
{
  "report": {
    "schema": 1,
    "createdAt": "…",
    "platform": "…",
    "userAgent": "…",
    "screen": { "width": 0, "height": 0, "dpr": 0 },
    "gpu": { "vendor": "…", "renderer": "…" },
    "params": { /* 测量开始时的参数快照 */ },
    "stages": [
      {
        "name": "state:healthy",
        "state": "healthy",
        "summary": {
          "frames": 0,       // 采样帧数
          "durationMs": 0,   // 采样时长
          "fps": 0,          // 平均帧率
          "p50": 0,          // 帧间隔中位数（ms）
          "p95": 0,
          "p99": 0,
          "max": 0,
          "dropped": 0       // 帧间隔 > 20ms 的帧数
        }
      }
      // …共 6 个状态
    ]
  },
  "info": { "gpu": {}, "screen": {}, "ua": "…", "platform": "…" },
  "electron": { "version": "…", "chrome": "…", "node": "…", "platform": "darwin", "arch": "arm64" },
  "measuredAt": "…"
}
```

### 字段含义

- **`p50`**：一半的帧间隔小于这个值。接近 16.7ms 说明大部分时间跑在 60Hz 的节奏上；如果 p50 本身就在 20ms 以上，说明不是偶发卡顿，而是**整体掉出了 60fps**。
- **`p95` / `p99`**：尾部延迟。玻璃层的成本往往不是均匀的，而是集中在某些合成/重绘时刻（状态切换、动画相位、面板进出）。p95 和 p99 与 p50 的差距越大，体感越「一顿一顿」。判断流畅度时优先看 p95，不要只看平均值。
- **`fps`**：`(帧数 - 1) / 采样时长`。它会被长尾拉低，适合做粗略对比；细粒度问题看分位数。
- **`dropped`**：帧间隔 > 20ms 的帧数（约等于掉出 60fps 的帧）。同样的采样窗口下，这个数字跨状态比较很直观。
- **`max`**：最坏的一帧。常见于状态切换的首帧、GC、或首次触发 `backdrop-filter` 时的着色器编译。
- **`gpu.renderer` 为什么要记**：`backdrop-filter`、大半径模糊、离屏降采样的实际开销高度依赖 GPU 与驱动。同一份代码在集显、独显、软件渲染（SwiftShader）上的结果可能差一个数量级。不记录 renderer，报告就无法比较，也无法判断「慢」是代码问题还是机器问题。`vendor` 一起记，方便识别虚拟机和远程桌面。
- **`screen` / `dpr`**：同样的 CSS 尺寸，DPR=2 时 GPU 实际要合成的像素是 4 倍。1440x900@2x 和 1440x900@1x 不是同一个测试。

## 三平台测量的注意事项

- **不要跨平台外推。** Linux 的数字**不能**用来推断 Windows 或 macOS。三者的合成器、窗口装饰、字体渲染、`backdrop-filter` 实现路径都不同（Windows 的 DWM、macOS 的 Core Animation、Linux 上 X11/Wayland + 各家驱动差异很大），同一份 CSS 的实测开销可能相差很大。每个目标平台都要单独跑、单独记录。
- **必须记录 GPU 型号。** 报告里的 `gpu.vendor` / `gpu.renderer` 是这份数据的前提条件，贴结论时要一起贴。
- **必须记录屏幕分辨率和 DPR。** 高 DPR 屏幕上的模糊半径是按 CSS px 写的，但像素吞吐按物理像素走；不知道 DPR 就没法解释 p95 的差异。
- 测量时关掉屏幕录制、直播、省电模式、电池节能、以及其他占用 GPU 的应用；笔记本要插电，避免降频。
- 窗口必须保持可见且在前台。Electron 壳已设置 `backgroundThrottling: false` 并调用 `show()/focus()`，但被其他窗口完全遮挡、最小化、或锁屏时数据仍不可信。
- 每个平台建议至少跑 2~3 次，看同一状态的 p95 波动范围，再下结论。

## 本机实测（2026-11-15，Linux）

> 这组数据只描述下面这台机器，**不能外推到 Windows / macOS**。

环境：Linux + niri（Wayland）、AMD Radeon RX 6900 XT（ANGLE OpenGL ES 3.2）、面板 2560×1440@180Hz、Electron 45.3.2（Chromium 156）。niri 平铺下实际视口 **1268×1382**、DPR 1（约 175 万物理像素），`--fullscreen` 被合成器接管，无法撑到 4K。

硬件渲染，单状态采样 8s：

| 组合 | L3 | 降采样 | L4 | fps | p50 | p95 | p99 | dropped |
|---|---|---|---|---|---|---|---|---|
| 基准 | 36px | 1/4 | 20px | 180.0 | 5.6 | 5.6 | 5.7 | 0 |
| 重玻璃 | 56px | 1/2 | 28px | 180.0 | 5.6 | 5.6 | 5.7 | 0 |
| 性能优先 | 36px | 1/8 | 0px | 180.0 | 5.6 | 5.6 | 5.7 | 0 |
| 极端 | 64px | 1/2 | 32px | 180.0 | 5.6 | 5.6 | 5.7 | 0 |

结论：**在这块独显上性能完全过剩**，四组参数没有可测差异（180fps 是 180Hz vsync 上限，p50 5.6ms 就是 vsync 间隔）。这个视口尺寸下，lab 无法区分参数档位，需要集显或更大物理分辨率才能压出差异。

软件渲染（`--software`，`app.disableHardwareAcceleration()`）对照：

| 组合 | L3 | 降采样 | L4 | fps | p50 | p95 | dropped |
|---|---|---|---|---|---|---|---|
| 基准 | 36px | 1/4 | 20px | 17.8 | 50.1 | 100.0 | 177 |
| 关 L4 模糊 | 36px | 1/4 | 0px | 14.1 | 66.7 | 100.0 | 140 |
| 性能优先 | 36px | 1/8 | 0px | 14.5 | 66.7 | 94.4 | 144 |

软件渲染下数字波动很大、且不随参数单调变化（多次重跑会出现 3fps 这类离群值），**只能当作「数量级」参考**。但它说明一件确定的事：**一旦 Electron 掉进软件合成，这套四层玻璃会直接不可用（15fps 级别）**。GPU 加速是硬依赖，不是优化项。

因此下一步该做的不是继续调参数，而是：

1. 在集显机器（Intel Iris Xe / AMD Vega 核显 / Apple M1 基础款）上复跑同一套矩阵；
2. 在 4K 或 DPR 2 的真实视口下复跑，当前窗口太小，成本没被压满；
3. 确认 Windows（DWM）和 macOS（Core Animation）下 `backdrop-filter` 的路径差异，这两个平台无法用 Linux 数据推断。

## 已知限制

- **没有逐状态自动截图。** 第一版只在测量前后各截一张（`-before.png` / `-after.png`），用来确认「页面确实渲染出来了、玻璃层没崩」。6 个状态各自的画面需要手动截或后续再加。
- **没有长稳测试。** 单次测量约 48 秒（6 态 × 约 7 秒采样），只能反映短时间内的合成成本，看不出内存增长、GPU 显存泄漏、温度降频后的表现。
- 没有做自动化基线对比（历史报告 diff），目前靠人工看 JSON。
- 参数是测量开始时的快照；测量过程中改参数不会反映到 `report.params`。
- Electron 版本、Chromium 版本会影响 `backdrop-filter` 的实现细节，跨版本数据也要谨慎比较。
