import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Test passwords and addresses come from .env, which git never sees. Copy .env.example to .env to start.
if (existsSync(".env")) process.loadEnvFile(".env");

// Runs against servers that are already up: the frontend on 5173 and a test backend behind it.
// See README, "Browser tests", for how to start them.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    // The Chrome already on this Mac, so no separate browser download is needed.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "laptop", testIgnore: /admin\.spec\.ts/, use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 800 } } },
    { name: "phone", testIgnore: /admin\.spec\.ts/, use: { ...devices["Pixel 7"], channel: "chrome" } },
    // The platform admin test changes settings every account sees (the announcement), so it runs on its own,
    // after the others, on a laptop screen.
    {
      name: "platform-admin",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["laptop", "phone"],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 800 } },
    },
  ],
});
