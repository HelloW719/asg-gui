import { expect, test, type Locator, type Page } from "@playwright/test";

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
      return (
        style.getPropertyValue("backdrop-filter") ||
        style.getPropertyValue("-webkit-backdrop-filter")
      );
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

async function expectFlatLightSurface(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const surface = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
    };
  });
  expect(surface.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(surface.backgroundImage).toBe("none");
  expect(surface.boxShadow).toBe("none");
}

async function expectReadableFloatingSurface(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const surface = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundImage: style.backgroundImage,
      backdropFilter:
        style.getPropertyValue("backdrop-filter") ||
        style.getPropertyValue("-webkit-backdrop-filter"),
    };
  });
  expect(surface.backgroundImage).toContain("linear-gradient");
  expect(surface.backdropFilter).toBe("none");
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
  ).toBeLessThanOrEqual(44);

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
        ].map((match) => Number.parseFloat(match[1] ?? "0"));
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
    const [primarySurface, secondarySurface, ghostSurface, dangerSurface] =
      buttonSurfaces;
    if (!primarySurface || !secondarySurface || !ghostSurface || !dangerSurface) {
      throw new Error("missing button surface fixture");
    }
    expect(primarySurface.labelColor).toBe(secondarySurface.labelColor);
    expect(primarySurface.labelColor).not.toBe(ghostSurface.labelColor);
    expect(primarySurface.labelColor).not.toBe(dangerSurface.labelColor);

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
    const primaryRestingStyle = restingStyles["button-primary"];
    if (!primaryRestingStyle) {
      throw new Error("missing primary button resting style");
    }
    await page.mouse.move(
      primaryBox.x + primaryBox.width / 2,
      primaryBox.y + primaryBox.height / 2,
    );
    await expect
      .poll(() =>
        primary.evaluate((element) => getComputedStyle(element).boxShadow),
      )
      .not.toBe(primaryRestingStyle.boxShadow);
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

test("renders oversized edge-cropped route-code ghost marks without overflow", async ({
  page,
}) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });

  for (const [route, title, ghostText] of [
    ["/#/status", "系统状态", "STATUS"],
    ["/#/explore", "检索与抓取", "SEARCH"],
    ["/#/sources", "引擎与扩展", "SOURCES"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    const ghost = page.locator(".page-header__ghost");
    await expect(ghost).toHaveText(ghostText);
    await expect(ghost).toHaveAttribute("aria-hidden", "true");
    if (test.info().project.name === "minimum-window") {
      await expect(ghost).toHaveCSS("display", "none");
      continue;
    }

    const metrics = await ghost.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundImage: style.backgroundImage,
        clipPath: style.clipPath,
        color: style.color,
        textFillColor: style.webkitTextFillColor,
        textTransform: style.textTransform,
      };
    });

    expect(metrics.backgroundImage).toBe("none");
    expect(metrics.clipPath).not.toBe("none");
    expect(metrics.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(metrics.textFillColor).toBe(metrics.color);
    expect(metrics.textTransform).toBe("uppercase");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test("uses an architectural baseline instead of a scrollbar-like rail", async ({
  page,
}) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
  await page.goto("/#/status");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  const baseline = page.locator(".page-header__baseline");
  await expect(baseline).toHaveAttribute("aria-hidden", "true");
  const metrics = await baseline.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      headerBeforeContent: getComputedStyle(
        element.closest(".page-header")!,
        "::before",
      ).content,
    };
  });

  expect(metrics.width).toBeGreaterThan(metrics.height * 20);
  expect(metrics.headerBeforeContent).toBe("none");
  await expect(page.locator(".page-header__rail")).toHaveCount(0);
  await expect(page.locator(".page-header__signal")).toHaveCount(0);
  await expect(page.locator(".page-header__context")).toHaveText("01 // STATUS");
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

test("keeps operational text readable and progressive at minimum width", async ({
  page,
}) => {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  const fontSizes = await page.evaluate(() =>
    [
      ".page-header p",
      ".status-summary dt",
      ".service-card__label",
      ".service-card__meta dt",
      ".service-card__meta dd",
    ].map((selector) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>(selector)!).fontSize,
      ),
    ),
  );
  expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(12);

  const deckColumns = await page
    .locator(".status-deck")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" "));
  await expect(page.locator(".status-rail")).toBeVisible();

  if (test.info().project.name === "minimum-window") {
    await expect(page.locator(".nav-item__copy").first()).toBeHidden();
    expect(deckColumns).toHaveLength(1);
    expect(
      await page.getByText("FlareSolverr", { exact: true }).evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  } else {
    expect(deckColumns).toHaveLength(2);
    await expect(page.locator(".nav-item--active .nav-item__copy small")).toBeVisible();
    await expect(
      page.locator(".nav-item:not(.nav-item--active) .nav-item__copy small").first(),
    ).toBeHidden();
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
    await expect(page.locator(".tactical-plane")).toHaveCount(1);
    await expect(page.locator(".tactical-plane")).toHaveCSS(
      "pointer-events",
      "none",
    );
    await expect(page.locator(".tactical-plane")).toHaveCSS(
      "backdrop-filter",
      "none",
    );
    await expect(page.locator(".nav-item__index")).toHaveCount(6);
    await expect(page.locator(".nav-item__copy small")).toHaveCount(6);
    await expect(page.getByRole("link", { name: "状态" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await page
        .locator(".app-sidebar")
        .evaluate((element) => getComputedStyle(element, "::after").content),
    ).toBe("none");
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
        const sceneCanvas = element as HTMLCanvasElement;
        const context = sceneCanvas.getContext("2d");
        if (!context) {
          return normalizedPoints.map(() => [0, 0, 0, 0]);
        }
        return normalizedPoints.map((point) =>
          Array.from(
            context.getImageData(
              Math.round(point.x * sceneCanvas.width),
              Math.round(point.y * sceneCanvas.height),
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
        const sceneCanvas = element as HTMLCanvasElement;
        const context = sceneCanvas.getContext("2d");
        if (!context) return 0;
        const image = context.getImageData(
          0,
          0,
          sceneCanvas.width,
          sceneCanvas.height,
        );
        let maximum = 0;
        for (let index = 3; index < image.data.length; index += 4) {
          maximum = Math.max(maximum, image.data[index] ?? 0);
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
    if (!tracking || !geometryColor) {
      throw new Error("missing sampled pixel fixture");
    }
    const channelDelta = (index: number): number => {
      const trackingValue = tracking[index];
      const geometryValue = geometryColor[index];
      if (trackingValue === undefined || geometryValue === undefined) {
        throw new Error("sampled pixel is missing an RGBA channel");
      }
      return Math.abs(trackingValue - geometryValue);
    };
    expect(
      Math.max(
        channelDelta(0),
        channelDelta(1),
        channelDelta(2),
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
    await expect(page.getByRole("heading", { name: "等待搜索结果" })).toBeVisible();
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
    await expect(page.getByText("待配置密钥").first()).toBeVisible();
    await expect(
      page.getByText("通用查询时与 SearXNG 并发，结果由网关统一融合。"),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "deepseek 的启用状态" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "main search 的启用状态" }),
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

  test("explains empty searches and pending data states", async ({ page }) => {
    await page.getByRole("link", { name: "来源" }).click();
    await page.getByRole("tab", { name: "扩展 V2" }).click();
    await page.getByPlaceholder("搜索 GitHub 扩展").fill("missing-extension");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(
      page.getByText("没有找到匹配的扩展", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("可以换一个关键词，或直接使用上方仓库地址安装。"),
    ).toBeVisible();

    await page.getByRole("link", { name: "设置" }).click();
    await expect(
      page.getByRole("heading", { name: "主题与效果" }),
    ).toBeVisible();
    await page.getByPlaceholder("搜索配置路径").fill("not-a-real-field");
    await expect(
      page.getByText("没有匹配的配置字段", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("尝试缩短搜索内容或清除筛选。")).toBeVisible();
  });

  test("renders settings panels and configuration browser", async ({ page }) => {
    await page.getByRole("link", { name: "设置" }).click();
    await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
    await expectIntegratedWorkspace(page, ".settings-workspace");
    await expect(page.getByRole("heading", { name: "高级设置" })).toBeVisible();
    const overviewColumns = await page
      .locator(".settings-overview")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" "));
    expect(overviewColumns).toHaveLength(
      test.info().project.name === "minimum-window" ? 1 : 2,
    );
    const configSearch = page.getByPlaceholder("搜索配置路径");
    const configSearchField = page.locator(".config-search");
    await expect(configSearch).toBeVisible();
    await configSearch.click();
    await expect(configSearch).toHaveCSS("outline-style", "none");
    await expect(configSearchField).toHaveCSS("outline-style", "solid");
    await expect(configSearchField).toHaveCSS("border-radius", "999px");
    const frameRate = page.getByRole("combobox", {
      name: "玻璃动效帧率",
    });
    await frameRate.click();
    const frameRateMenu = page.getByRole("listbox");
    await expect(frameRateMenu).toBeVisible();
    await expectReadableFloatingSurface(page.locator(".select-field__content"));
    await expect(frameRateMenu).toHaveCSS("border-radius", "14px");
    await expect(frameRateMenu).toHaveCSS("backdrop-filter", "none");
    await expect(frameRateMenu).toHaveCSS("width", "220px");
    await expect(frameRateMenu).toHaveCSS("max-height", "224px");
    expect(
      await page.getByRole("option", { name: "90 Hz" }).evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThan(13);
    await page.getByRole("option", { name: "90 Hz" }).click();
    await expect(frameRate).toContainText("90 Hz");
    await page.reload();
    await expect(page.getByRole("heading", { name: "主题与效果" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "玻璃动效帧率" }),
    ).toContainText("90 Hz");

    const configField = page.locator(".config-field").first();
    await configField.click();
    const configEditor = page.locator(".config-editor");
    await expect(configEditor).toBeVisible();
    await expect(configEditor).toHaveCSS("position", "relative");
    await expect(configField).toHaveAttribute("aria-expanded", "true");
    await configEditor.getByRole("button", { name: "保存并重启" }).click();
    await expectReadableFloatingSurface(page.getByRole("dialog"));
  });

  test("uses shared glass styling for selects and disclosures", async ({ page }) => {
    await page.getByRole("link", { name: "检索" }).click();
    await expect(page.getByText("搜索参数", { exact: true })).toBeVisible();

    await page.getByText("搜索参数", { exact: true }).click();
    const disclosure = page.locator(".disclosure-panel");
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(disclosure).toHaveCSS("border-radius", "14px");
    await expect(disclosure.locator(".disclosure-panel__body")).toHaveCSS(
      "backdrop-filter",
      "none",
    );

    const safeSearch = page.getByRole("combobox", { name: "安全搜索" });
    await safeSearch.click();
    const safeSearchMenu = page.getByRole("listbox");
    await expect(safeSearchMenu).toBeVisible();
    await expect(safeSearchMenu).toHaveCSS("border-radius", "14px");
    await expect(safeSearchMenu).toHaveCSS("backdrop-filter", "none");
    await page.getByRole("option", { name: "2 · 严格" }).click();
    await expect(safeSearch).toContainText("2 · 严格");
    await expect(page.locator("select")).toHaveCount(0);

    await page.getByRole("link", { name: "来源" }).click();
    await expect(
      page.getByRole("heading", { name: "引擎与扩展" }),
    ).toBeVisible();
    const routeTrigger = page.getByText("编辑类别路由", { exact: true });
    await routeTrigger.click();
    const routePanel = page.locator(".route-editor");
    await expect(routePanel).toHaveAttribute("open", "");
    await expect(routePanel).toHaveCSS("border-radius", "14px");
    await expect(page.locator("select")).toHaveCount(0);
  });

  test("filters log entries through the extracted log feed", async ({ page }) => {
    await page.getByRole("link", { name: "日志", exact: true }).click();
    await expectIntegratedWorkspace(page, ".logs-workspace");
    await expect(page.getByText("gateway listening on 127.0.0.1:3000")).toBeVisible();
    const search = page.getByPlaceholder("筛选日志");
    const searchField = page.locator(".log-toolbar .search-field");
    await search.click();
    await expect(search).toHaveCSS("outline-style", "none");
    await expect(searchField).toHaveCSS("outline-style", "solid");
    await expect(searchField).toHaveCSS("border-radius", "999px");
    await search.fill("not-present");
    await expect(page.getByText("暂无匹配日志", { exact: true })).toBeVisible();
    await expect(
      page.getByText("启动服务或开启实时跟随后，新内容会显示在这里。"),
    ).toBeVisible();
  });

  test("runs maintenance diagnostics from the report components", async ({ page }) => {
    await page.getByRole("link", { name: "维护" }).click();
    await expect(page.getByRole("heading", { name: "环境诊断" })).toBeVisible();
    await expectIntegratedWorkspace(page, ".maintenance-workspace");
    await expect(page.getByRole("heading", { name: "检查项" })).toBeVisible();

    const adLevel = page.getByRole("combobox", {
      name: "广告过滤级别",
    });
    const adLevelBox = await adLevel.boundingBox();
    expect(adLevelBox?.width ?? 0).toBeGreaterThanOrEqual(150);
    await adLevel.click();
    await expect(page.getByRole("listbox")).toHaveCSS("min-width", "170px");
    const trackingOption = page.getByRole("option", {
      name: "ads+tracking",
    });
    await expect
      .poll(() =>
        trackingOption.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      )
      .toBe(true);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "重新诊断" }).click();
    await expect(page.getByText("installation")).toBeVisible();
  });

  test("removes light-mode sunken surfaces across feature pages", async ({
    page,
  }) => {
    const size =
      test.info().project.name === "minimum-window" ? "minimum" : "desktop";
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
    expect(
      await page
        .locator(".status-summary")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    ).not.toBe("rgba(0, 0, 0, 0)");

    await page.getByRole("button", { name: "切换到浅色主题" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page
        .locator(".app-root")
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--surface-sunken").trim(),
        ),
    ).toBe("transparent");

    await expectFlatLightSurface(page.locator(".status-summary"));
    await expectFlatLightSurface(page.locator(".log-preview__line").first());
    await expect(page.locator(".status-summary")).toHaveCSS(
      "border-bottom-width",
      "1px",
    );

    await page.getByRole("link", { name: "检索" }).click();
    await expect(
      page.getByRole("heading", { name: "检索与抓取" }),
    ).toBeVisible();
    await page.getByText("搜索参数", { exact: true }).click();
    await expectFlatLightSurface(page.locator(".disclosure-panel__body"));

    await page.getByRole("link", { name: "来源" }).click();
    await expect(
      page.getByRole("heading", { name: "引擎与扩展" }),
    ).toBeVisible();
    await expectFlatLightSurface(page.locator(".engine-grid"));
    await expectFlatLightSurface(page.locator(".engine-card").first());
    await expect(page.locator(".engine-card").nth(2)).toHaveCSS(
      "border-top-width",
      "1px",
    );
    await page.screenshot({
      path: `test-results/sources-engine-${size}-light-flat.png`,
      fullPage: true,
    });
    await page.getByRole("tab", { name: "扩展 V2" }).click();
    await expect(page.locator(".source-list")).toBeVisible();
    await expectFlatLightSurface(page.locator(".source-list"));
    await expectFlatLightSurface(page.locator(".extension-row").first());
    await expect(page.locator(".source-list")).toHaveCSS(
      "border-top-width",
      "1px",
    );
    await page.screenshot({
      path: `test-results/sources-${size}-light-flat.png`,
      fullPage: true,
    });

    await page.getByRole("link", { name: "日志", exact: true }).click();
    await expect(page.locator(".log-console")).toBeVisible();
    await expectFlatLightSurface(page.locator(".log-console"));

    await page.getByRole("link", { name: "设置" }).click();
    await expect(
      page.getByRole("heading", { name: "主题与效果" }),
    ).toBeVisible();
    await expectFlatLightSurface(page.locator(".settings-install"));
    await expect(page.locator(".config-groups")).toBeVisible();
    await expectFlatLightSurface(page.locator(".config-groups"));

    await page.getByRole("link", { name: "维护" }).click();
    await expect(page.getByRole("heading", { name: "环境诊断" })).toBeVisible();
    await expectFlatLightSurface(page.locator(".maintenance-grid"));
    await expectFlatLightSurface(page.locator(".maintenance-card").first());
    await expect(page.locator(".maintenance-card").nth(1)).toHaveCSS(
      "border-top-width",
      "1px",
    );
    await page.screenshot({
      path: `test-results/maintenance-${size}-light-flat.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});

