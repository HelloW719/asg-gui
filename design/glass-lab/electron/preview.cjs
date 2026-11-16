'use strict';

/**
 * 玻璃 lab 的桌面预览壳（只看效果，不做测量）。
 *
 * 与 electron/main.cjs 的区别：那个是 48 秒自动测量，跑完就退出；
 * 这个只是把构建产物装进真实窗口，方便直接看观感和帧率。
 *
 * 用法：
 *   npm run app            # 默认 1440x900，加载 vite preview
 *   npm run app -- --url=http://127.0.0.1:4173/?state=error
 *   npm run app -- --width=1600 --height=1000
 */

const { app, BrowserWindow } = require('electron');

const DEFAULTS = {
  url: 'http://127.0.0.1:4173/?state=error',
  width: 1440,
  height: 900,
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (const token of argv) {
    if (typeof token !== 'string' || !token.startsWith('--')) continue;
    const [key, raw] = token.slice(2).split('=');
    if (key === 'url' && raw) args.url = raw;
    if (key === 'width' && Number(raw) > 0) args.width = Number(raw);
    if (key === 'height' && Number(raw) > 0) args.height = Number(raw);
  }
  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  await app.whenReady();

  const win = new BrowserWindow({
    width: args.width,
    height: args.height,
    show: true,
    // 无边框 + 透明：圆角由页面自己画（.stage 的 24px），圆角外保持透明。
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    autoHideMenuBar: true,
    title: 'Glass Lab',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 后台窗口的 rAF 会掉到 1Hz，看帧率时必须保持全速。
      backgroundThrottling: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(args.url);
  win.show();
  win.focus();

  // 合成器（niri）对浮动窗口的初始尺寸有自己的默认值，这里再显式设一次。
  win.setBounds({ width: args.width, height: args.height });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[app] 加载失败 ${code} ${desc}：${args.url}`);
    console.error('[app] 先跑 npm run build && npx vite preview --port 4173');
  });

  app.on('window-all-closed', () => app.quit());
}

run().catch((err) => {
  console.error('[app] 启动失败：', err);
  app.exit(1);
});
