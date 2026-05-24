import { defineConfig, devices } from "@playwright/test";

const port = 3210;

export default defineConfig({
  testDir: "tests/playwright",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`
  },
  webServer: {
    command: "rm -f data/test-playwright.sqlite && npm run start",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_PATH: "data/test-playwright.sqlite",
      ADMIN_PASSWORD: "secret",
      SESSION_SECRET: "test-secret-for-browser-verification",
      PUBLIC_BASE_URL: `http://127.0.0.1:${port}`
    }
  },
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 13"] } }
  ],
  reporter: [["list"], ["html", { open: "never" }]]
});
