import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 4,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:1421",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 820 } },
    },
    {
      name: "minimum-window",
      use: { ...devices["Desktop Chrome"], viewport: { width: 960, height: 640 } },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 1421 --strictPort",
    url: "http://127.0.0.1:1421",
    reuseExistingServer: false,
  },
});

