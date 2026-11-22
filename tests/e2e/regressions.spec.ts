import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.stack ?? error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    errors.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`,
    );
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

async function installMock(
  page: Page,
  scenario: Record<string, unknown> = {},
): Promise<void> {
  await page.addInitScript((value) => {
    (
      window as typeof window & {
        __TAURI_TEST_SCENARIO__?: Record<string, unknown>;
      }
    ).__TAURI_TEST_SCENARIO__ = value;
  }, scenario);
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
}

test("routes the tray logs action to the logs page", async ({ page }) => {
  await installMock(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  await page.evaluate(() => {
    (
      window as typeof window & {
        __TAURI_TEST_EMIT__: (event: string, payload: unknown) => void;
      }
    ).__TAURI_TEST_EMIT__("asg://navigate", "logs");
  });

  await expect(page.getByRole("heading", { name: "日志", exact: true })).toBeVisible();
});

test("refreshes status and configuration when switching to another valid root", async ({
  page,
}) => {
  const nextRoot = "C:\\ASG-Fixture-B";
  await installMock(page, { selectedRoot: nextRoot });
  await page.goto("/#/settings");
  await expect(
    page.getByRole("heading", { name: "设置", exact: true }),
  ).toBeVisible();

  const marker = page.locator(".config-field").filter({
    hasText: "gateway.root_marker",
  });
  await expect(marker).toContainText("C:\\ASG-Fixture");

  await page.getByRole("button", { name: "切换目录" }).click();
  await expect(marker).toContainText(nextRoot);

  const calls = await page.evaluate(() => {
    const scenario = (
      window as typeof window & {
        __TAURI_TEST_SCENARIO__: {
          statusCallCount: number;
          configCallCount: number;
        };
      }
    ).__TAURI_TEST_SCENARIO__;
    return {
      status: scenario.statusCallCount,
      config: scenario.configCallCount,
    };
  });
  expect(calls.status).toBeGreaterThanOrEqual(2);
  expect(calls.config).toBeGreaterThanOrEqual(2);
});

test("keeps secret input visible when the write fails", async ({ page }) => {
  await installMock(page, { secretError: "密钥写入失败。" });
  await page.goto("/#/settings");
  await expect(
    page.getByRole("heading", { name: "设置", exact: true }),
  ).toBeVisible();

  await page
    .locator(".config-field")
    .filter({ hasText: "secrets.test.api_key" })
    .click();
  const input = page.getByPlaceholder("输入后仅通过 stdin 发送");
  await input.fill("super-secret");
  await page.getByRole("button", { name: "保存并重启" }).click();

  await expect(page.getByRole("heading", { name: "更新密钥" })).toBeVisible();
  await expect(page.getByText("密钥写入失败。", { exact: true }).first()).toBeVisible();
  await expect(input).toHaveValue("super-secret");
});

test("keeps engine mutation errors visible after the operation settles", async ({
  page,
}) => {
  await installMock(page, { engineMutationError: "引擎更新失败。" });
  await page.goto("/#/sources");
  await expect(page.getByRole("heading", { name: "引擎与扩展" })).toBeVisible();

  const engine = page.locator(".engine-card").filter({ hasText: "deepseek" });
  await engine.getByRole("checkbox").check({ force: true });

  await expect(page.getByText("引擎更新失败。", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("deepseek 已启用。", { exact: true })).toHaveCount(0);
});

test("disables log follow while the CLI stream is starting", async ({ page }) => {
  await installMock(page, { followStartDelay: 350 });
  await page.goto("/#/logs");
  await expect(page.getByRole("heading", { name: "日志", exact: true })).toBeVisible();

  const button = page.getByRole("button", { name: "实时跟随" });
  await button.click();
  const starting = page.getByRole("button", { name: "正在跟随" });
  await expect(starting).toBeDisabled();
  await starting.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(450);

  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & {
            __TAURI_TEST_CLI_COMMANDS__: string[];
          }
        ).__TAURI_TEST_CLI_COMMANDS__.filter((command) => command === "logs")
          .length,
    ),
  ).toBe(2);
  await expect(page.getByRole("button", { name: "暂停跟随" })).toBeVisible();
});

test("shows a terminal log stream failure", async ({ page }) => {
  await installMock(page, { followRuntimeError: true });
  await page.goto("/#/logs");
  await expect(page.getByRole("heading", { name: "日志", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "实时跟随" }).click();
  await expect(
    page.getByText("日志流异常结束。", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "实时跟随" })).toBeVisible();
});

test("allows structured extension fields to be edited and validated", async ({
  page,
}) => {
  await installMock(page, {
    extensions: [
      {
        id: "object-extension",
        name: "Object Extension",
        version: "1.0.0",
        provides: ["fetch"],
        backends: [],
        fetch_channels: [{ id: "object:http", name: "HTTP" }],
        search_engines: [],
      },
    ],
    extensionConfig: { limits: { max: 1 } },
    extensionConfigFields: [
      {
        key: "limits",
        type: "object",
        required: false,
        description: "抓取限制",
      },
    ],
  });
  await page.goto("/#/sources");
  await page.getByRole("tab", { name: "扩展 V2" }).click();
  await page.getByRole("button", { name: "配置", exact: true }).click();

  const editor = page.locator(".extension-editor textarea");
  await expect(editor).toHaveValue(/"max": 1/);
  await editor.fill('{"max":');
  await page.getByText("抓取限制", { exact: true }).click();
  await expect(page.locator(".structured-field-error")).toBeVisible();

  await editor.fill('{"max": 5}');
  await page.getByText("抓取限制", { exact: true }).click();
  await expect(page.locator(".structured-field-error")).toHaveCount(0);
});
