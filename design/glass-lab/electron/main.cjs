'use strict';

/**
 * 玻璃拟态 lab 的最小 Electron 测量壳。
 *
 * 职责：
 *   1. 用真实窗口（非透明、系统标题栏、1440x900）加载 lab 页面
 *   2. 等页面暴露 window.__lab
 *   3. 触发一次完整测量（6 个状态，约 48 秒），期间保持窗口可见 + 前台
 *   4. 把页面回报的 report / info 与 Electron 运行时信息合并成 JSON
 *   5. 前后各截一张图，然后退出
 *
 * 用法：
 *   electron electron/main.cjs --url http://127.0.0.1:5199 \
 *     --width 1440 --height 900 --out ./lab-report-xxx.json
 */

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const READY_TIMEOUT_MS = 20_000;
const MEASURE_TIMEOUT_MS = 120_000;
const MEASURE_KICK_GRACE_MS = 8_000;
const POLL_INTERVAL_MS = 500;
/** __lab 就绪后再等一会儿，让首帧、字体、动画先稳下来 */
const SETTLE_AFTER_READY_MS = 1_000;
/** 测量结束后给 React 一次提交机会再取 report */
const SETTLE_AFTER_MEASURE_MS = 500;

const DEFAULTS = {
  url: 'http://127.0.0.1:5199',
  width: 1440,
  height: 900,
  out: null,
  fullscreen: false,
  scale: 0,
  software: false,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(...args) {
  console.log('[lab]', ...args);
}

function warn(...args) {
  console.error('[lab]', ...args);
}

function timestampSlug(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function parsePositiveInt(raw, fallback) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (typeof token !== 'string' || !token.startsWith('--')) continue;

    const eq = token.indexOf('=');
    let key;
    let value;

    if (eq !== -1) {
      key = token.slice(2, eq);
      value = token.slice(eq + 1);
    } else {
      key = token.slice(2);
      const next = argv[i + 1];
      if (typeof next === 'string' && !next.startsWith('--')) {
        value = next;
        i += 1;
      } else {
        value = '';
      }
    }

    switch (key) {
      case 'url':
        if (value) args.url = value;
        break;
      case 'width':
        args.width = parsePositiveInt(value, DEFAULTS.width);
        break;
      case 'height':
        args.height = parsePositiveInt(value, DEFAULTS.height);
        break;
      case 'out':
        if (value) args.out = value;
        break;
      case 'fullscreen':
        args.fullscreen = true;
        break;
      case 'scale':
        args.scale = parsePositiveInt(value, 0);
        break;
      case 'software':
        args.software = true;
        break;
      default:
        warn(`忽略未知参数 --${key}`);
        break;
    }
  }

  return args;
}

function resolveOutPath(rawOut) {
  const target = rawOut && rawOut.trim() ? rawOut.trim() : `./lab-report-${timestampSlug()}.json`;
  return path.resolve(process.cwd(), target);
}

/** <out 去掉扩展名>-before.png / -after.png */
function shotPaths(outPath) {
  const dir = path.dirname(outPath);
  const base = path.basename(outPath, path.extname(outPath));
  return {
    before: path.join(dir, `${base}-before.png`),
    after: path.join(dir, `${base}-after.png`),
  };
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writePng(filePath, image) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, image.toPNG());
}

function electronEnv() {
  return {
    version: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
}

/** 在页面主世界里求值；executeJavaScript 会 await 返回的 Promise，故表达式本身要保持轻量 */
async function evalInPage(win, expression) {
  if (win.isDestroyed()) throw new Error('窗口已销毁，无法执行脚本');
  return win.webContents.executeJavaScript(expression, true);
}

async function readPageJson(win, getterCall) {
  const raw = await evalInPage(
    win,
    `(() => { const v = ${getterCall}; return v == null ? 'null' : JSON.stringify(v); })()`,
  );
  if (raw == null) return null;
  return JSON.parse(raw);
}

async function waitForLab(win) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    if (win.isDestroyed()) throw new Error('窗口在等待 __lab 期间被关闭');
    try {
      const kind = await evalInPage(win, 'typeof window.__lab');
      if (kind === 'object') {
        const ready = await evalInPage(
          win,
          `Boolean(window.__lab) &&
           typeof window.__lab.runMeasure === 'function' &&
           typeof window.__lab.isMeasuring === 'function' &&
           typeof window.__lab.getReport === 'function'`,
        );
        if (ready) return;
      }
    } catch (err) {
      // 页面尚未完成首次导航 / 正在 HMR 重载时可能抛错，继续轮询
      lastError = err;
    }
    await sleep(250);
  }

  const suffix = lastError ? `（最后一次错误：${lastError.message}）` : '';
  throw new Error(`等待 window.__lab 超时（${READY_TIMEOUT_MS / 1000}s）${suffix}`);
}

async function pollMeasure(win) {
  const kickAt = Date.now();
  let sawMeasuring = false;
  let consecutiveErrors = 0;

  while (Date.now() - kickAt < MEASURE_TIMEOUT_MS) {
    if (win.isDestroyed()) throw new Error('窗口在测量期间被关闭');

    let state;
    try {
      state = await evalInPage(
        win,
        `(() => ({
          measuring: typeof window.__lab?.isMeasuring === 'function'
            ? Boolean(window.__lab.isMeasuring())
            : false,
          hasReport: typeof window.__lab?.getReport === 'function'
            ? window.__lab.getReport() != null
            : false,
          error: typeof window.__labError === 'string' ? window.__labError : null,
        }))()`,
      );
      consecutiveErrors = 0;
    } catch (err) {
      // 页面重载 / HMR 时 executeJavaScript 会短暂失败，容忍几轮再放弃
      consecutiveErrors += 1;
      if (consecutiveErrors >= 10) {
        throw new Error(`读取页面测量状态连续失败：${err && err.message ? err.message : err}`);
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (state.error) {
      throw new Error(`页面内 runMeasure() 抛出异常：${state.error}`);
    }

    if (state.measuring) {
      sawMeasuring = true;
    } else if (sawMeasuring) {
      // 正常路径：isMeasuring() 由 true 翻回 false，测量结束
      return;
    } else if (state.hasReport && Date.now() - kickAt > MEASURE_KICK_GRACE_MS) {
      // 兜底：isMeasuring() 始终没被观察到，但报告已经生成
      return;
    } else if (Date.now() - kickAt > MEASURE_KICK_GRACE_MS) {
      throw new Error(
        `runMeasure() 调用后 ${MEASURE_KICK_GRACE_MS / 1000}s 内未进入测量状态（isMeasuring() 一直为 false）`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`测量超时（>${MEASURE_TIMEOUT_MS / 1000}s）`);
}

async function capture(win, filePath, label) {
  try {
    const image = await win.capturePage();
    if (image.isEmpty()) {
      warn(`${label} 截图为空，跳过写入：${filePath}`);
      return null;
    }
    await writePng(filePath, image);
    log(`${label} 截图已写入 ${filePath}`);
    return filePath;
  } catch (err) {
    warn(`${label} 截图失败：${err && err.message ? err.message : err}`);
    return null;
  }
}

function createWindow(args) {
  const win = new BrowserWindow({
    width: args.width,
    height: args.height,
    // 第一版特意保留系统标题栏：无边框 + 拖拽区会引入额外的合成开销
    frame: true,
    show: true,
    backgroundColor: '#0b0f14',
    transparent: false,
    hasShadow: true,
    autoHideMenuBar: true,
    title: 'Glass Lab',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  win.setMenuBarVisibility(false);
  if (args.fullscreen) win.setFullScreen(true);
  // 测量期间必须可见且前台：后台窗口的 rAF 会被降到 1Hz 甚至暂停
  win.show();
  win.focus();
  win.moveTop();

  return win;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = resolveOutPath(args.out);
  const shots = shotPaths(outPath);
  const measuredAt = new Date().toISOString();

  if (args.software) {
    // 最坏情况基准：关闭 GPU 合成，暴露 CPU 路径的真实成本。
    app.disableHardwareAcceleration();
  }

  if (args.scale > 0) {
    // 必须在 app ready 之前设置，才能影响合成与 canvas backing store。
    app.commandLine.appendSwitch('force-device-scale-factor', String(args.scale));
  }

  await app.whenReady();

  if (process.platform === 'darwin' && app.dock) {
    try {
      await app.dock.show();
    } catch {
      // dock 不可用时不影响测量
    }
  }

  log(`加载 ${args.url}（${args.width}x${args.height}）`);
  const win = createWindow(args);

  const stageRef = { value: 'load' };

  try {
    stageRef.value = 'load';
    await win.loadURL(args.url);
    log('页面已加载，等待 window.__lab');

    stageRef.value = 'wait-lab';
    await waitForLab(win);
    log('window.__lab 就绪');

    await sleep(SETTLE_AFTER_READY_MS);
    await capture(win, shots.before, 'before');

    stageRef.value = 'measure';
    const params = await readPageJson(win, 'window.__lab.getParams()');
    log(`测量参数 ${JSON.stringify(params)}`);
    log('开始测量，预计 ~48s');

    await evalInPage(
      win,
      `(() => {
        window.__labError = null;
        window.__lab.runMeasure().catch((err) => {
          window.__labError = String((err && err.stack) || err);
        });
        return true;
      })()`,
    );

    await pollMeasure(win);
    await sleep(SETTLE_AFTER_MEASURE_MS);

    stageRef.value = 'collect';
    const report = await readPageJson(win, 'window.__lab.getReport()');
    if (!report) throw new Error('测量结束但 getReport() 仍返回 null');
    const info = await readPageJson(win, 'window.__lab.info()');

    stageRef.value = 'write';
    await writeJson(outPath, {
      report,
      info,
      electron: electronEnv(),
      measuredAt,
    });
    log(`报告已写入 ${outPath}`);

    await capture(win, shots.after, 'after');

    app.exit(0);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    warn(`测量失败（stage=${stageRef.value}）：${message}`);

    const payload = {
      error: {
        message,
        stage: stageRef.value,
        stack: err && err.stack ? String(err.stack) : null,
      },
      partial: null,
      electron: electronEnv(),
      measuredAt,
      url: args.url,
      window: { width: args.width, height: args.height, fullscreen: Boolean(args.fullscreen), scale: args.scale, software: Boolean(args.software) },
      out: outPath,
    };

    // 尽力保留已生成的部分数据，方便定位是「页面没起来」还是「测量中途崩」
    try {
      if (!win.isDestroyed()) {
        payload.partial = {
          report: await readPageJson(win, 'window.__lab?.getReport?.() ?? null'),
          info: await readPageJson(win, 'window.__lab?.info?.() ?? null'),
        };
      }
    } catch {
      // 忽略：错误路径下的收集失败不应覆盖原始错误
    }

    try {
      await writeJson(outPath, payload);
      warn(`错误报告已写入 ${outPath}`);
    } catch (writeErr) {
      warn(`写入错误报告失败：${writeErr && writeErr.message ? writeErr.message : writeErr}`);
    }

    app.exit(1);
  }
}

app.on('window-all-closed', () => {
  // 由 run() 自己控制退出时机
});

run().catch((err) => {
  warn('未捕获的启动错误：', err);
  app.exit(1);
});
