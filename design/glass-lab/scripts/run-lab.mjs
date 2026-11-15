#!/usr/bin/env node
/**
 * 一键跑 Electron 视觉性能测量的编排脚本。
 *
 * 职责：
 *   1. 确认 dev server 可访问（否则提示先跑 npm run dev）
 *   2. 解析 electron 可执行文件
 *   3. spawn electron electron/main.cjs，透传 --url / --out，stdio inherit
 *   4. 等退出码，打印报告路径
 *
 * 用法：
 *   node scripts/run-lab.mjs
 *   node scripts/run-lab.mjs --url http://127.0.0.1:5199 --out ./lab-report.json
 *   node scripts/run-lab.mjs --electron ./node_modules/electron/dist/electron
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MAIN_SCRIPT = path.join(ROOT, 'electron', 'main.cjs');

const DEFAULT_URL = 'http://127.0.0.1:5199';
const PROBE_TIMEOUT_MS = 5_000;

function log(...args) {
  console.log('[run-lab]', ...args);
}

function fail(message, hint) {
  console.error(`[run-lab] 错误：${message}`);
  if (hint) console.error(`[run-lab] ${hint}`);
  process.exit(1);
}

function timestampSlug(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function parsePositiveInt(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    electron: null,
    out: null,
    width: null,
    height: null,
    scale: null,
    fullscreen: false,
    software: false,
  };

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

    // 布尔开关没有值，不能被下面的 !value 过滤掉。
    if (key === 'fullscreen' || key === 'software') {
      args[key] = true;
      continue;
    }

    if (!value) continue;

    switch (key) {
      case 'url':
        args.url = value;
        break;
      case 'electron':
        args.electron = value;
        break;
      case 'out':
        args.out = value;
        break;
      case 'width':
        args.width = parsePositiveInt(value);
        break;
      case 'height':
        args.height = parsePositiveInt(value);
        break;
      case 'scale':
        args.scale = parsePositiveInt(value);
        break;
      default:
        console.warn(`[run-lab] 忽略未知参数 --${key}`);
        break;
    }
  }

  return args;
}

/**
 * 只读 node_modules/electron/path.txt 来定位二进制，避免 require('electron')
 * 在二进制缺失时触发 install.js 就地下载（那会卡住整个流程）。
 */
function resolveElectronBinary(explicit) {
  if (explicit) {
    const resolved = path.resolve(process.cwd(), explicit);
    if (!fs.existsSync(resolved)) {
      fail(`--electron 指定的文件不存在：${resolved}`);
    }
    return resolved;
  }

  const pkgDir = path.join(ROOT, 'node_modules', 'electron');
  const pathTxt = path.join(pkgDir, 'path.txt');

  if (!fs.existsSync(pathTxt)) {
    fail(
      'Electron 二进制还没安装好（node_modules/electron/path.txt 不存在）',
      '等 npm install 结束后重试，或用 --electron <可执行文件路径> 指定已有的 Electron。',
    );
  }

  const relative = fs.readFileSync(pathTxt, 'utf8').trim();
  const binary = path.join(pkgDir, 'dist', relative);

  if (!fs.existsSync(binary)) {
    fail(
      `Electron 可执行文件缺失：${binary}`,
      '重新执行 npm install（或 node node_modules/electron/install.js）后再试。',
    );
  }

  return binary;
}

async function probeServer(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (!res.ok) {
      fail(`dev server 返回 ${res.status} ${res.statusText}：${url}`);
    }
    // 只关心可达性，不消费 body
    await res.body?.cancel().catch(() => {});
    log(`dev server 可访问：${url}`);
  } catch (err) {
    const reason = err && err.message ? err.message : String(err);
    fail(`无法访问 ${url}（${reason}）`, '请先在另一个终端运行 npm run dev，确认 http://127.0.0.1:5199 已监听。');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(MAIN_SCRIPT)) {
    fail(`找不到 Electron 主进程脚本：${MAIN_SCRIPT}`);
  }

  const outPath = path.resolve(process.cwd(), args.out ?? `./lab-report-${timestampSlug()}.json`);
  const electronBinary = resolveElectronBinary(args.electron);

  await probeServer(args.url);

  const childArgs = [MAIN_SCRIPT, '--url', args.url, '--out', outPath];
  if (args.width) childArgs.push('--width', String(args.width));
  if (args.height) childArgs.push('--height', String(args.height));
  if (args.fullscreen) childArgs.push('--fullscreen');
  if (args.scale) childArgs.push('--scale', String(args.scale));
  if (args.software) childArgs.push('--software');

  log(`Electron：${electronBinary}`);
  log(`输出：${outPath}`);
  log(`窗口：${args.width ?? 1440}x${args.height ?? 900}`);
  log('启动测量窗口（约 50 秒，期间请勿遮挡/最小化窗口）');

  const child = spawn(electronBinary, childArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
    },
  });

  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => {
      if (signal) {
        console.error(`[run-lab] Electron 被信号 ${signal} 终止`);
        resolve(1);
      } else {
        resolve(exitCode ?? 1);
      }
    });
  }).catch((err) => {
    fail(`无法启动 Electron：${err && err.message ? err.message : err}`);
    return 1;
  });

  if (code !== 0) {
    console.error(`[run-lab] Electron 退出码 ${code}，测量未正常完成`);
    if (fs.existsSync(outPath)) console.error(`[run-lab] 错误报告：${outPath}`);
    process.exit(code);
  }

  const exists = fs.existsSync(outPath);
  if (!exists) {
    fail(`Electron 正常退出但报告文件不存在：${outPath}`);
  }

  const shots = [
    `${outPath.replace(/\.json$/i, '')}-before.png`,
    `${outPath.replace(/\.json$/i, '')}-after.png`,
  ];

  log(`完成，报告：${outPath}`);
  for (const shot of shots) {
    if (fs.existsSync(shot)) log(`截图：${shot}`);
  }
}

main().catch((err) => {
  fail(`未预期错误：${err && err.message ? err.message : err}`);
});
