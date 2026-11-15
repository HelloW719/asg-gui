import { expect, test } from "@playwright/test";

test("renders the desktop bridge requirement without overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("当前是浏览器预览")).toBeVisible();
  await expect(page.getByText("Agent Search Gateway")).toBeVisible();

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
    viewport: { width: 1280, height: 820 },
  });

  test("renders live status, service cards and visual state", async ({ page }) => {
    await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
    await expect(page.getByText("稳定运行").first()).toBeVisible();
    await expect(page.getByText("Gateway", { exact: true })).toBeVisible();
    await expect(page.getByText("SearXNG", { exact: true })).toBeVisible();
    await expect(page.getByText("FlareSolverr", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "任务运行中" })).toBeHidden();
    await page.screenshot({ path: "test-results/dashboard-dark.png", fullPage: true });
  });
});

