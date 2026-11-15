// 抓 morph 中间帧：需要 dev server 在 5199 跑着。
// 用法：node scripts/capture-morph.mjs <from> <to> <outDir>
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const from = process.argv[2] ?? 'healthy';
const to = process.argv[3] ?? 'working';
const outDir = path.resolve(process.argv[4] ?? '/tmp/opencode/lab/morph');
const URL_BASE = process.env.LAB_URL ?? 'http://127.0.0.1:5199';

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.goto(`${URL_BASE}/?state=${from}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const shots = [];
await page.evaluate((next) => window.__lab.setParams({ state: next }), to);

// 850ms 的过渡，按 70ms 采样，覆盖 0 → 100%
for (let i = 0; i <= 12; i += 1) {
  const file = path.join(outDir, `frame-${String(i).padStart(2, '0')}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
  await page.waitForTimeout(70);
}

await browser.close();
console.log(JSON.stringify({ from, to, shots }, null, 2));
