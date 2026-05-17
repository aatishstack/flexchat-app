import { defineConfig, devices } from "@playwright/test";

const chromeExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ??
      "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        chromeExecutablePath,
    },
  },
});
