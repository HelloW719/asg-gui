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

async function expectButtonHeight(
  page: Page,
  testId: string,
  height: number,
): Promise<void> {
  const actual = await page
    .getByTestId(testId)
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(Math.abs(actual - height)).toBeLessThanOrEqual(0.5);
}

test("renders the desktop bridge requirement without overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("当前是浏览器预览")).toBeVisible();
  await expect(page.getByText("Agent Search Gateway")).toBeVisible();
  await expect(page.locator(".setup-orbit")).toHaveCSS(
    "animation-name",
    "setup-orbit-turn",
  );
  expect(
    await page
      .getByRole("heading", { name: "连接你的 ASG 安装" })
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
  ).toBeLessThanOrEqual(40.8);

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

test.describe("Neumorphic M3E button visual contract", () => {
  test.use({ colorScheme: "dark" });

  test("keeps variants, focus, states and themes aligned", async ({ page }) => {
    await page.goto("/tests/e2e/button-visual.html?scheme=dark");
    const primary = page.getByTestId("button-primary");
    const secondary = page.getByTestId("button-secondary");
    const ghost = page.getByTestId("button-ghost");
    const danger = page.getByTestId("button-danger");
    const dangerText = page.getByTestId("button-danger-text");
    const icon = page.getByTestId("icon-button");
    const disabled = page.getByTestId("button-disabled");
    const loading = page.getByTestId("button-loading");
    const maxButtonShadowAlpha = () =>
      primary.evaluate((element) => {
        const shadow = getComputedStyle(element).boxShadow;
        const alphaValues = [
          ...shadow.matchAll(/(?:,\s*|\/\s*)([01](?:\.\d+)?)\)/g),
        ].map((match) => Number.parseFloat(match[1]));
        return Math.max(0, ...alphaValues);
      });

    await expect(primary).toBeVisible();
    await expect(primary).toHaveAttribute("variant", "filled");
    await expect(primary).toHaveClass(/button--primary/);
    await expect(secondary).toHaveAttribute("variant", "tonal");
    await expect(secondary).toHaveClass(/button--secondary/);
    await expect(ghost).toHaveAttribute("variant", "text");
    await expect(ghost).toHaveClass(/button--ghost/);
    await expect(danger).toHaveAttribute("variant", "filled");
    await expect(danger).toHaveClass(/button--danger/);
    await expect(dangerText).toHaveAttribute("variant", "text");
    await expect(dangerText).toHaveClass(/button--ghost/);
    await expect(dangerText).toHaveClass(/button--danger-text/);
    await expect(icon).toBeVisible();
    await expect(icon).toHaveClass(/icon-button/);

    const restingStyles = await page.evaluate(() =>
      Object.fromEntries(
        ["button-primary", "button-ghost", "icon-button"].map((testId) => {
          const style = getComputedStyle(
            document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!,
          );
          return [
            testId,
            {
              backgroundColor: style.backgroundColor,
              backgroundImage: style.backgroundImage,
              boxShadow: style.boxShadow,
              transform: style.transform,
            },
          ];
        }),
      ),
    );
    for (const style of Object.values(restingStyles)) {
      expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(style.backgroundImage).toBe("none");
      expect(style.boxShadow).not.toBe("none");
      expect(style.boxShadow).toContain("inset");
      expect(style.transform).toBe("none");
    }
    const darkMaxButtonShadowAlpha = await maxButtonShadowAlpha();
    expect(darkMaxButtonShadowAlpha).toBeGreaterThan(0);

    await expectButtonHeight(page, "button-compact", 34);
    await expectButtonHeight(page, "button-regular", 40);
    await expectButtonHeight(page, "button-large", 50);

    const buttonSurfaces = await page.evaluate(() =>
      [
        "button-primary",
        "button-secondary",
        "button-ghost",
        "button-danger",
      ].map((testId) => {
        const host = document.querySelector<HTMLElement>(
          `[data-testid="${testId}"]`,
        );
        const surface = host?.shadowRoot?.querySelector(".base");
        const label = host?.shadowRoot?.querySelector(".label");
        return {
          backgroundColor: surface
            ? getComputedStyle(surface).backgroundColor
            : "",
          labelColor: label ? getComputedStyle(label).color : "",
        };
      }),
    );
    expect([
      ...new Set(buttonSurfaces.map((surface) => surface.backgroundColor)),
    ]).toEqual(["rgba(0, 0, 0, 0)"]);
    expect(buttonSurfaces[0].labelColor).toBe(buttonSurfaces[1].labelColor);
    expect(buttonSurfaces[0].labelColor).not.toBe(buttonSurfaces[2].labelColor);
    expect(buttonSurfaces[0].labelColor).not.toBe(buttonSurfaces[3].labelColor);

    await page.keyboard.press("Tab");
    await expect(primary).toBeFocused();
    expect(
      await primary.evaluate((element) => {
        const focusRing =
          element.shadowRoot?.querySelector<HTMLElement>(".focus-ring");
        const outline =
          focusRing?.shadowRoot?.querySelector<HTMLElement>(".outline");
        return outline?.classList.contains("visible") ?? false;
      }),
    ).toBe(true);
    const size =
      test.info().project.name === "minimum-window" ? "minimum" : "desktop";
    await page.screenshot({
      path: `test-results/button-contract-${size}-dark-focus.png`,
      fullPage: true,
    });

    const primaryBox = await primary.boundingBox();
    expect(primaryBox).not.toBeNull();
    if (!primaryBox) return;
    await page.mouse.move(
      primaryBox.x + primaryBox.width / 2,
      primaryBox.y + primaryBox.height / 2,
    );
    await expect
      .poll(() =>
        primary.evaluate((element) => getComputedStyle(element).boxShadow),
      )
      .not.toBe(restingStyles["button-primary"].boxShadow);
    await expect
      .poll(() =>
        primary.evaluate((element) => getComputedStyle(element).transform),
      )
      .not.toBe("none");
    const hoveredStyles = await primary.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        transform: style.transform,
      };
    });
    await page.mouse.down();
    await page.waitForTimeout(180);
    const pressedSurface = await primary.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        hasM3ePressedState: element.matches(":state(--pressed)"),
        transform: style.transform,
      };
    });
    expect(pressedSurface.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(pressedSurface.boxShadow).toContain("inset");
    expect(pressedSurface.boxShadow).not.toBe(hoveredStyles.boxShadow);
    expect(pressedSurface.hasM3ePressedState).toBe(true);
    expect(pressedSurface.transform).not.toBe(hoveredStyles.transform);
    await page.screenshot({
      path: `test-results/button-contract-${size}-dark-pressed.png`,
      fullPage: true,
    });
    await page.mouse.up();

    await disabled.hover();
    await expect(disabled).toHaveAttribute("disabled", "");
    expect(
      await disabled.evaluate((element) => getComputedStyle(element).transform),
    ).toBe("none");
    expect(
      await disabled.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      ),
    ).not.toBe("none");

    const loadingWidthBefore = await loading.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    await page.getByTestId("button-toggle-loading").click();
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading).toHaveAttribute("disabled", "");
    const loadingWidthAfter = await loading.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    expect(Math.abs(loadingWidthAfter - loadingWidthBefore)).toBeLessThanOrEqual(
      0.5,
    );
    expect(
      await loading.evaluate((element) => ({
        boxShadow: getComputedStyle(element).boxShadow,
        cursor: getComputedStyle(element).cursor,
      })),
    ).toMatchObject({ cursor: "progress" });
    expect(
      await loading.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      ),
    ).not.toBe("none");
    await expect(loading.locator(".spin")).toBeVisible();
    await page.screenshot({
      path: `test-results/button-contract-${size}-dark-states.png`,
      fullPage: true,
    });

    await page.goto("/tests/e2e/button-visual.html?scheme=light");
    await expect(page.getByTestId("button-primary")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await maxButtonShadowAlpha()).toBeLessThan(
      darkMaxButtonShadowAlpha,
    );
    await page.screenshot({
      path: `test-results/button-contract-${size}-light.png`,
      fullPage: true,
    });
  });
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
  expect(
    await page
      .locator(".window-controls button")
      .evaluateAll((buttons) =>
        buttons.map((button) => getComputedStyle(button).boxShadow),
      ),
  ).toEqual(["none", "none", "none"]);
});

test("uses the shared shape scale across feature surfaces", async ({ page }) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  const tokens = await page.locator("html").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      window: style.getPropertyValue("--window-radius").trim(),
      xl: style.getPropertyValue("--radius-xl").trim(),
      lg: style.getPropertyValue("--radius-lg").trim(),
      md: style.getPropertyValue("--radius-md").trim(),
      sm: style.getPropertyValue("--radius-sm").trim(),
      xs: style.getPropertyValue("--radius-xs").trim(),
      full: style.getPropertyValue("--radius-full").trim(),
    };
  });
  expect(tokens).toEqual({
    window: "32px",
    xl: "24px",
    lg: "18px",
    md: "14px",
    sm: "10px",
    xs: "8px",
    full: "999px",
  });

  async function expectRadius(selector: string, radius: string) {
    await expect
      .poll(() =>
        page
          .locator(selector)
          .first()
          .evaluate((element) => getComputedStyle(element).borderRadius),
      )
      .toBe(radius);
  }

  await expectRadius(".status-hero", "24px");
  await expectRadius(".service-board", "24px");
  await expectRadius(".service-card", "0px");
  await expectRadius(".service-card__icon", "14px");
  await expectRadius(".status-pill", "999px");
  await expectRadius(".content-card", "18px");

  await page.getByRole("link", { name: "检索" }).click();
  await expect(page.getByRole("heading", { name: "检索与抓取" })).toBeVisible();
  await expectRadius(".query-card", "18px");
  await expectRadius(".field--hero input", "14px");
  await expect(page.locator(".field--hero input").first()).toHaveCSS(
    "height",
    "52px",
  );

  await page.getByRole("link", { name: "来源" }).click();
  await expect(page.getByRole("heading", { name: "引擎与扩展" })).toBeVisible();
  await expectRadius(".sources-workspace", "18px");
  await expectRadius(".engine-grid", "14px");
  await expectRadius(".engine-card", "0px");
  await expectRadius(".token", "8px");

  await page.getByRole("link", { name: "设置" }).click();
  await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
  await expectRadius(".settings-workspace", "18px");
  await expectRadius(".config-search input", "10px");

  await page.getByRole("link", { name: "日志", exact: true }).click();
  await expect(page.getByRole("heading", { name: "日志", exact: true })).toBeVisible();
  await expectRadius(".logs-workspace", "18px");
  await expectRadius(".log-console", "14px");
  await expectRadius(".log-line", "8px");

  await page.getByRole("link", { name: "维护" }).click();
  await expect(page.getByRole("heading", { name: "环境诊断" })).toBeVisible();
  await expectRadius(".maintenance-workspace", "18px");
  await expectRadius(".maintenance-grid", "14px");
  await expectRadius(".maintenance-card", "0px");
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
    await expect
      .poll(async () => {
        const [pixel] = await samplePixels([point]);
        return pixel?.[3] ?? 0;
      })
      .toBeGreaterThan(200);
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

test.describe("reduced transparency compatibility", () => {
  test.use({ colorScheme: "dark" });

  test("persists the setting and disables full-screen glass blur", async ({
    page,
  }) => {
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
    await page.getByRole("link", { name: "设置" }).click();

    const reducedTransparency = page.getByRole("checkbox", {
      name: /减少透明/,
    });
    await expect(reducedTransparency).not.toBeChecked();
    await page.getByText("减少透明", { exact: true }).click();
    await expect(reducedTransparency).toBeChecked();

    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-transparency",
      "true",
    );
    await expect
      .poll(() =>
        page
          .locator(".glass-frost-layer")
          .evaluate((element) => getComputedStyle(element).backdropFilter),
      )
      .toBe("none");
    expect(
      await page
        .locator(".glass-frost-layer")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toContain("0.78");

    await page.reload();
    await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-transparency",
      "true",
    );
    await expect(
      page.getByRole("checkbox", { name: /减少透明/ }),
    ).toBeChecked();
    await expect
      .poll(() =>
        page
          .locator(".glass-frost-layer")
          .evaluate((element) => getComputedStyle(element).backdropFilter),
      )
      .toBe("none");
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

