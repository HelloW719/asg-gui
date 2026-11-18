import { expect, test } from "@playwright/test";

test("renders the desktop bridge requirement without overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("当前是浏览器预览")).toBeVisible();
  await expect(page.getByText("Agent Search Gateway")).toBeVisible();
  await expect(page.locator(".setup-orbit")).toHaveCSS(
    "animation-name",
    "setup-orbit-turn",
  );

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("switches between dark and light appearance", async ({ page }) => {
  await page.goto("/");
  const before = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /切换到.+主题/ }).click();
  await expect
    .poll(() => page.locator("html").getAttribute("data-theme"))
    .not.toBe(before);
});

test.describe("dashboard fixture", () => {
  test.use({
    colorScheme: "dark",
  });

  test("renders live status, service cards and visual state", async ({ page }) => {
    const size = test.info().project.name === "minimum-window" ? "minimum" : "dark";
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
    await expect(page.getByText("稳定运行").first()).toBeVisible();
    await expect(page.getByText("Gateway", { exact: true })).toBeVisible();
    await expect(page.getByText("SearXNG", { exact: true })).toBeVisible();
    await expect(page.getByText("FlareSolverr", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "任务运行中" })).toBeHidden();
    await expect(page.locator(".glass-scene canvas")).toHaveCount(3);
    await expect(page.locator(".status-pill svg")).toHaveCSS(
      "animation-name",
      "status-breathe",
    );
    await expect(
      page.evaluate(() =>
        [...document.querySelectorAll("*")].filter((element) => {
          const filter = getComputedStyle(element).backdropFilter;
          return Boolean(filter && filter !== "none");
        }).length,
      ),
    ).resolves.toBe(1);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `test-results/dashboard-${size}.png`, fullPage: true });
    await page.getByRole("button", { name: "切换到浅色主题" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `test-results/dashboard-${size}-light.png`, fullPage: true });
  });

  test("gathers particles into the glass scene and clears after returning", async ({
    page,
  }) => {
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

    const canvas = page.locator(".glass-scene__motion");
    const particleCanvas = page.locator(".glass-scene__particles");
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) return;

    const samplePixels = (points: Array<{ x: number; y: number }>) =>
      canvas.evaluate((element, normalizedPoints) => {
        const context = (element as HTMLCanvasElement).getContext("2d");
        if (!context) {
          return normalizedPoints.map(() => [0, 0, 0, 0]);
        }
        return normalizedPoints.map((point) =>
          Array.from(
            context.getImageData(
              Math.round(point.x * element.width),
              Math.round(point.y * element.height),
              1,
              1,
            ).data,
          ),
        );
      }, points);

    const point = { x: 0.3, y: 0.34 };
    const before = (await samplePixels([point]))[0];
    const maxParticleAlpha = () =>
      particleCanvas.evaluate((element) => {
        const context = (element as HTMLCanvasElement).getContext("2d");
        if (!context) return 0;
        const image = context.getImageData(
          0,
          0,
          element.width,
          element.height,
        );
        let maximum = 0;
        for (let index = 3; index < image.data.length; index += 4) {
          maximum = Math.max(maximum, image.data[index]);
        }
        return maximum;
      });

    await page.mouse.move(
      bounds.x + bounds.width * point.x,
      bounds.y + bounds.height * point.y,
    );
    await expect.poll(maxParticleAlpha).toBeGreaterThan(0);
    await page.waitForTimeout(360);
    const [tracking, geometryColor] = await samplePixels([
      point,
      { x: 0.75, y: 0.7 },
    ]);
    expect(
      Math.hypot(
        tracking[0] - before[0],
        tracking[1] - before[1],
        tracking[2] - before[2],
      ),
    ).toBeGreaterThan(10);
    expect(
      Math.max(
        Math.abs(tracking[0] - geometryColor[0]),
        Math.abs(tracking[1] - geometryColor[1]),
        Math.abs(tracking[2] - geometryColor[2]),
      ),
    ).toBeLessThanOrEqual(16);

    await page.mouse.move(1, 1);
    await page.waitForTimeout(140);
    expect(await maxParticleAlpha()).toBeGreaterThan(0);
    await expect
      .poll(async () => (await samplePixels([point]))[0][1])
      .toBeLessThan(tracking[1]);
    await page.waitForTimeout(760);
    await expect.poll(maxParticleAlpha).toBe(0);
  });
});

test.describe("glass shell navigation", () => {
  test.use({ colorScheme: "dark" });

  test("keeps the shared glass scene while navigating to search", async ({ page }) => {
    const size = test.info().project.name === "minimum-window" ? "minimum" : "desktop";
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
    await page.getByRole("link", { name: "检索" }).click();
    await expect(page.getByRole("heading", { name: "检索与抓取" })).toBeVisible();
    await expect(page.getByPlaceholder("输入问题、关键词或站点范围")).toBeVisible();
    await expect(page.locator(".glass-scene canvas")).toHaveCount(3);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `test-results/explorer-${size}.png`, fullPage: true });
  });
});

test.describe("reduced motion compatibility", () => {
  test.use({
    colorScheme: "dark",
    reducedMotion: "reduce",
  });

  test("keeps the glass scene static and suppresses pulse animation", async ({
    page,
  }) => {
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    await expect(page.locator(".glass-scene canvas")).toHaveCount(3);
    await expect
      .poll(() =>
        page.locator(".status-pill svg").evaluate((element) => {
          return Number.parseFloat(getComputedStyle(element).animationDuration);
        }),
      )
      .toBeLessThan(0.001);
  });
});

test.describe("feature pages", () => {
  test.use({ colorScheme: "dark" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
  });

  test("renders source tabs in isolated feature components", async ({ page }) => {
    await page.getByRole("link", { name: "来源" }).click();
    await expect(page.getByRole("heading", { name: "引擎与扩展" })).toBeVisible();
    await page.getByRole("tab", { name: "内置插件" }).click();
    await expect(page.getByPlaceholder("插件名或规范通道，如 bilibili:kukemc")).toBeVisible();
    await page.getByRole("tab", { name: "第三方扩展" }).click();
    await expect(page.getByPlaceholder("owner/repo[@version]")).toBeVisible();
  });

  test("renders settings panels and configuration browser", async ({ page }) => {
    await page.getByRole("link", { name: "设置" }).click();
    await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "高级设置" })).toBeVisible();
    await expect(page.getByPlaceholder("搜索配置路径")).toBeVisible();
    const frameRate = page.getByLabel("玻璃动效帧率");
    await frameRate.selectOption("90");
    await expect(frameRate).toHaveValue("90");
    await page.reload();
    await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
    await expect(page.getByLabel("玻璃动效帧率")).toHaveValue("90");
  });

  test("filters log entries through the extracted log feed", async ({ page }) => {
    await page.getByRole("link", { name: "日志", exact: true }).click();
    await expect(page.getByText("gateway listening on 127.0.0.1:3000")).toBeVisible();
    await page.getByPlaceholder("筛选日志").fill("not-present");
    await expect(page.getByText("暂无匹配日志。启动服务或开启实时跟随后会显示新内容。")).toBeVisible();
  });

  test("runs maintenance diagnostics from the report components", async ({ page }) => {
    await page.getByRole("link", { name: "维护" }).click();
    await expect(page.getByRole("heading", { name: "环境诊断" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "检查项" })).toBeVisible();
    await page.getByRole("button", { name: "重新诊断" }).click();
    await expect(page.getByText("installation")).toBeVisible();
  });
});

