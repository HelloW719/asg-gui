import { expect, test, type Page } from "@playwright/test";

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

async function readScenario(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __TAURI_TEST_SCENARIO__: Record<string, unknown>;
        }
      ).__TAURI_TEST_SCENARIO__,
  );
}

test("auto-detects a fresh install and completes skippable steps", async ({
  page,
}) => {
  await installMock(page, {
    root: null,
    rootValid: false,
    onboardingCompleted: false,
    detectedRoot: "C:\\Users\\fixture\\agent_search_gateway",
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "欢迎使用" })).toBeVisible();
  await expect(
    page.getByText("C:\\Users\\fixture\\agent_search_gateway"),
  ).toBeVisible();
  await expectIntegratedWelcome(page);

  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect(page.getByRole("heading", { name: "配置可选密钥" })).toBeVisible();
  await expect(page.getByText("DeepSeek API Key")).toBeVisible();
  await page.getByRole("button", { name: "跳过此步" }).click();

  await expect(page.getByRole("heading", { name: "下载 V2 扩展" })).toBeVisible();
  await expect(page.getByText("Bilibili", { exact: true })).toBeVisible();
  await expect(page.getByText("微博", { exact: true })).toBeVisible();
  await expect(page.getByText("知网", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "跳过并完成" }).click();

  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
  expect((await readScenario(page)).onboardingCompleted).toBe(true);
  const commands = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __TAURI_TEST_CLI_COMMANDS__: string[];
        }
      ).__TAURI_TEST_CLI_COMMANDS__,
  );
  expect(commands.filter((command) => command === "restart")).toHaveLength(0);
});

test("keeps a failed secret input available", async ({ page }) => {
  await installMock(page, {
    onboardingCompleted: false,
    secretError: "密钥写入失败。",
  });
  await page.goto("/");
  await page.getByRole("button", { name: "继续", exact: true }).click();

  const input = page.getByPlaceholder("输入后仅通过 stdin 发送");
  await input.fill("super-secret");
  await page.getByRole("button", { name: "保存密钥" }).click();

  await expect(page.getByText("密钥写入失败。", { exact: true }).first()).toBeVisible();
  await expect(input).toHaveValue("super-secret");
});

test("restarts once after installing an extension during onboarding", async ({
  page,
}) => {
  await installMock(page, {
    onboardingCompleted: false,
    extensions: [],
  });
  await page.goto("/");
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "跳过此步" }).click();

  const bilibili = page
    .locator(".welcome-extension-row")
    .filter({ hasText: "Bilibili" });
  await bilibili.getByRole("button", { name: "安装" }).click();
  await expect(
    page.getByText(/agent-search-gateway-plugin-bilibili 已安装/),
  ).toBeVisible();

  await page.getByRole("button", { name: "完成并重启" }).click();
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  const commands = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __TAURI_TEST_CLI_COMMANDS__: string[];
        }
      ).__TAURI_TEST_CLI_COMMANDS__,
  );
  expect(commands.filter((command) => command === "restart")).toHaveLength(1);
  expect((await readScenario(page)).onboardingCompleted).toBe(true);
});

test("keeps onboarding open when the final restart fails and allows retry", async ({
  page,
}) => {
  await installMock(page, {
    onboardingCompleted: false,
    extensions: [],
    restartError: "整栈重启失败。",
  });
  await page.goto("/");
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "跳过此步" }).click();

  const bilibili = page
    .locator(".welcome-extension-row")
    .filter({ hasText: "Bilibili" });
  await bilibili.getByRole("button", { name: "安装" }).click();
  await expect(bilibili.getByRole("button", { name: "已安装" })).toBeVisible();
  await page.getByRole("button", { name: "完成并重启" }).click();

  await expect(
    page.getByText("整栈重启失败。", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "下载 V2 扩展" })).toBeVisible();
  expect((await readScenario(page)).onboardingCompleted).toBe(false);

  await page.evaluate(() => {
    delete (
      window as typeof window & {
        __TAURI_TEST_SCENARIO__: { restartError?: string };
      }
    ).__TAURI_TEST_SCENARIO__.restartError;
  });
  await page.getByRole("button", { name: "完成并重启" }).click();
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
  expect((await readScenario(page)).onboardingCompleted).toBe(true);
});

test("falls back to manual installation selection when auto-detection misses", async ({
  page,
}) => {
  await installMock(page, {
    root: null,
    rootValid: false,
    onboardingCompleted: false,
    detectedRoot: null,
    selectedRoot: "C:\\Custom\\agent_search_gateway",
  });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "连接你的 ASG 安装" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "选择 ASG 安装目录" }).click();
  await expect(page.getByRole("heading", { name: "欢迎使用" })).toBeVisible();
  await expect(
    page.getByText("C:\\Custom\\agent_search_gateway"),
  ).toBeVisible();
});

test("can reopen the welcome wizard from settings", async ({ page }) => {
  await installMock(page);
  await page.goto("/#/settings");
  await expect(
    page.getByRole("heading", { name: "设置", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "重新打开欢迎向导" })
    .click();
  await expect(page.getByRole("heading", { name: "欢迎使用" })).toBeVisible();
  expect((await readScenario(page)).onboardingCompleted).toBe(false);
});

async function expectIntegratedWelcome(page: Page): Promise<void> {
  const workspace = page.locator(".welcome-workspace");
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
