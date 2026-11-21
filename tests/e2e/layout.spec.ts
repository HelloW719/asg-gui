import { expect, test, type Page } from "@playwright/test";

async function expectIntegratedWorkspace(
  page: Page,
  selector: string,
): Promise<void> {
  const workspace = page.locator(selector);
  await expect(workspace).toHaveCount(1);
  await expect(workspace.locator(".glass-surface")).toHaveCount(0);
  expect(
    await workspace.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.backdropFilter || style.webkitBackdropFilter;
    }),
  ).toBe("none");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

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
  const expectedScheme = before === "dark" ? "light" : "dark";
  await page.getByRole("button", { name: /切换到.+主题/ }).click();
  await expect
    .poll(() => page.locator("html").getAttribute("data-theme"))
    .toBe(expectedScheme);
  await expect
    .poll(() =>
      page.locator("m3e-theme").evaluate(
        (element) =>
          (element as HTMLElement & { scheme?: string }).scheme,
      ),
    )
    .toBe(expectedScheme);
});

test("starts native window dragging from titlebar content only", async ({
  page,
}) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  const dragInvocations = () =>
    page.evaluate(
      () =>
        (window as typeof window & { __TAURI_TEST_INVOKES__?: string[] })
          .__TAURI_TEST_INVOKES__?.filter(
            (command) => command === "plugin:window|start_dragging",
          ).length ?? 0,
    );

  await page.locator(".app-titlebar__name").dispatchEvent("mousedown", {
    button: 0,
    buttons: 1,
    detail: 1,
  });
  await expect.poll(dragInvocations).toBe(1);

  await page
    .getByRole("button", { name: /切换到.+主题/ })
    .dispatchEvent("mousedown", {
      button: 0,
      buttons: 1,
      detail: 1,
    });
  expect(await dragInvocations()).toBe(1);
});

test("does not poll the stack status automatically", async ({ page }) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & {
            __TAURI_TEST_CLI_COMMANDS__?: string[];
          }).__TAURI_TEST_CLI_COMMANDS__?.filter(
            (command) => command === "status",
          ).length ?? 0,
      ),
    )
    .toBe(1);

  await page.waitForTimeout(5_500);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & {
          __TAURI_TEST_CLI_COMMANDS__?: string[];
        }).__TAURI_TEST_CLI_COMMANDS__?.filter(
          (command) => command === "status",
        ).length ?? 0,
    ),
  ).toBe(1);
});

test("renders a continuous squircle window without a border", async ({
  page,
}) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
  expect(
    await page.evaluate(() => CSS.supports("corner-shape", "squircle")),
  ).toBe(true);

  const shell = await page.evaluate(() => {
    const selectors = [
      ".app-root",
      ".background-layer",
      ".glass-scene",
      ".glass-frost-layer",
      ".app-frame",
    ];
    return {
      backgrounds: ["html", "body", "#app"].map(
        (selector) => getComputedStyle(document.querySelector(selector)!).backgroundColor,
      ),
      dividers: {
        titlebar: getComputedStyle(
          document.querySelector<HTMLElement>(".app-titlebar")!,
        ).borderBottomWidth,
        sidebar: getComputedStyle(
          document.querySelector<HTMLElement>(".app-sidebar")!,
        ).borderRightWidth,
      },
      backdrops: [".app-titlebar", ".app-sidebar", ".page"].map((selector) => {
        const style = getComputedStyle(
          document.querySelector<HTMLElement>(selector)!,
        );
        return {
          selector,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
        };
      }),
      frost: (() => {
        const style = getComputedStyle(
          document.querySelector<HTMLElement>(".glass-frost-layer")!,
        );
        return {
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          boxShadow: style.boxShadow,
          beforeContent: getComputedStyle(
            document.querySelector<HTMLElement>(".glass-frost-layer")!,
            "::before",
          ).content,
        };
      })(),
      surfaces: selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return {
          selector,
          radius: style.borderRadius,
          cornerShape: style.getPropertyValue("corner-shape"),
          top: bounds.top,
          left: bounds.left,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
        };
      }),
    };
  });

  expect(shell.backgrounds).toEqual([
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0)",
  ]);
  expect(shell.dividers).toEqual({
    titlebar: "0px",
    sidebar: "0px",
  });
  for (const backdrop of shell.backdrops) {
    expect(backdrop.backgroundColor, backdrop.selector).toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(backdrop.backgroundImage, backdrop.selector).toBe("none");
  }
  expect(shell.frost.backgroundColor).not.toContain("255, 255, 255");
  expect(shell.frost.backgroundImage).not.toContain("255, 255, 255");
  expect(shell.frost.boxShadow).not.toContain("255, 255, 255");
  expect(shell.frost.beforeContent).toBe("none");
  for (const surface of shell.surfaces) {
    expect(surface.radius, surface.selector).toBe("32px");
    expect(surface.cornerShape, surface.selector).toBe("superellipse(2)");
    expect(surface.top, surface.selector).toBe(0);
    expect(surface.left, surface.selector).toBe(0);
    expect(surface.borderWidth, surface.selector).toBe("0px");
    expect(surface.boxShadow, surface.selector).not.toContain(
      "0px 0px 0px 1px",
    );
  }
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
    await expect(page.locator("m3e-theme")).toHaveCount(1);
    await expect
      .poll(() =>
        page.locator("m3e-theme").evaluate(
          (element) =>
            (element as HTMLElement & { motion?: string }).motion,
        ),
      )
      .toBe("expressive");
    await expect(page.locator("m3e-card.service-board")).toHaveCount(1);
    await expect(page.locator(".service-board .service-card")).toHaveCount(3);
    expect(await page.locator("m3e-button").count()).toBeGreaterThan(0);
    await expect(page.locator("m3e-card.service-board")).toHaveCSS(
      "backdrop-filter",
      "none",
    );
    await page.getByRole("button", { name: "重启", exact: true }).click();
    await expect(page.getByRole("heading", { name: "重启整栈？" })).toBeVisible();
    await expect(page.getByRole("button", { name: "确认重启" })).toBeVisible();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(page.getByRole("heading", { name: "重启整栈？" })).toBeHidden();
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

    // 在缩窄布局中避开主几何扫过的区域，单独观察指针离场。
    const point =
      test.info().project.name === "minimum-window"
        ? { x: 0.12, y: 0.34 }
        : { x: 0.3, y: 0.34 };
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
      Math.max(
        Math.abs(tracking[0] - geometryColor[0]),
        Math.abs(tracking[1] - geometryColor[1]),
        Math.abs(tracking[2] - geometryColor[2]),
      ),
    ).toBeLessThanOrEqual(16);

    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent("pointerleave"));
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    expect(await maxParticleAlpha()).toBeGreaterThan(0);
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
    await expect
      .poll(() =>
        page.locator("m3e-button").first().evaluate((element) => {
          return Number.parseFloat(getComputedStyle(element).transitionDuration);
        }),
      )
      .toBeLessThanOrEqual(0.001);
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
    await expectIntegratedWorkspace(page, ".sources-workspace");
    await expect(page.getByText("通用上游")).toBeVisible();
    await expect(page.getByRole("heading", { name: "deepseek" })).toBeVisible();
    await expect(page.getByText("待配置密钥")).toBeVisible();
    await expect(
      page.getByText("通用查询时与 SearXNG 并发，结果由网关统一融合。"),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "内置插件" })).toHaveCount(0);
    await page.getByRole("tab", { name: "扩展 V2" }).click();
    await expect(page.getByPlaceholder("owner/repo[@version]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Example V2" })).toBeVisible();
    await expect(page.getByText("V2 · fetch · search")).toBeVisible();
    await expect(page.getByText("example:cli")).toBeVisible();
    await expect(page.getByText("gateway.search:example")).toBeVisible();
    await expect(page.getByText("已安装", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "重跑 setup" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("renders settings panels and configuration browser", async ({ page }) => {
    await page.getByRole("link", { name: "设置" }).click();
    await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
    await expectIntegratedWorkspace(page, ".settings-workspace");
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
    await expectIntegratedWorkspace(page, ".logs-workspace");
    await expect(page.getByText("gateway listening on 127.0.0.1:3000")).toBeVisible();
    await page.getByPlaceholder("筛选日志").fill("not-present");
    await expect(page.getByText("暂无匹配日志。启动服务或开启实时跟随后会显示新内容。")).toBeVisible();
  });

  test("runs maintenance diagnostics from the report components", async ({ page }) => {
    await page.getByRole("link", { name: "维护" }).click();
    await expect(page.getByRole("heading", { name: "环境诊断" })).toBeVisible();
    await expectIntegratedWorkspace(page, ".maintenance-workspace");
    await expect(page.getByRole("heading", { name: "检查项" })).toBeVisible();
    await page.getByRole("button", { name: "重新诊断" }).click();
    await expect(page.getByText("installation")).toBeVisible();
  });
});

