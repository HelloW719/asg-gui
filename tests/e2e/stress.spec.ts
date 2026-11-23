import { expect, test, type Page } from "@playwright/test";

async function installMock(page: Page): Promise<void> {
  await page.addInitScript({ path: "tests/e2e/tauri-mock.js" });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

test("rapid route and theme churn settles without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await installMock(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();

  for (let cycle = 0; cycle < 4; cycle += 1) {
    for (const name of ["检索", "来源", "日志", "设置", "维护", "状态"]) {
      await page.getByRole("link", { name, exact: true }).click();
    }
  }
  for (let index = 0; index < 40; index += 1) {
    await page.getByRole("button", { name: /切换到.+主题/ }).click();
  }

  await expect(page.getByRole("heading", { name: "系统状态" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.dataset.theme ===
        (
          document.querySelector("m3e-theme") as
            | (HTMLElement & { scheme?: string })
            | null
        )?.scheme,
    ),
  ).toBe(true);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("caps a high-rate log stream and announces through one throttled region", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  await installMock(page);
  await page.goto("/#/logs");
  await expect(page.getByRole("heading", { name: "日志", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "实时跟随" }).click();
  await expect(page.getByRole("button", { name: "暂停跟随" })).toBeVisible();

  const jobId = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __TAURI_TEST_LAST_FOLLOW_JOB_ID__?: string;
        }
      ).__TAURI_TEST_LAST_FOLLOW_JOB_ID__,
  );
  expect(jobId).toBeTruthy();
  await page.evaluate((activeJobId) => {
    for (let index = 0; index < 2_200; index += 1) {
      (
        window as typeof window & {
          __TAURI_TEST_EMIT__: (event: string, payload: unknown) => void;
        }
      ).__TAURI_TEST_EMIT__("asg://job", {
        jobId: activeJobId,
        kind: "stdout",
        data: {
          type: "event",
          schema_version: 1,
          event: "log",
          service: "gateway",
          line: `stress line ${index}`,
        },
      });
    }
  }, jobId);

  await expect
    .poll(() => page.locator(".log-line").count(), { timeout: 10_000 })
    .toBe(2_000);
  await expect(page.locator(".log-console")).not.toHaveAttribute("aria-live");
  await expect(page.locator(".log-live-region")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
