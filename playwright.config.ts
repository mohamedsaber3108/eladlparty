import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. These specs are black-box over HTTP against the real running dev server
 * (currently the Vinext/Wrangler dev server; after the Phase 3 runtime migration, the exact
 * same specs run against `next dev`/`next start` with zero changes). That's deliberate: this
 * suite is the actual regression safety net proving the Vercel/Postgres/Auth.js migration
 * didn't break the public-facing or admin-facing behavior, not a disposable pre-migration
 * artifact.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Keep the HTML report outside the project tree: Vite's dev-server file watcher otherwise
  // tries to watch playwright-report/index.html while it's being written mid-run, which
  // previously produced an EBUSY error that crashed the dev server (confirmed by inspecting
  // its crash log during this phase).
  reporter: [["list"], ["html", { open: "never", outputFolder: "../adl-party-playwright-report" }]],
  outputDir: "../adl-party-test-results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // This environment already has a fully-extracted Chromium build from other local
        // projects (the version matching this Playwright release, build 1194, repeatedly
        // failed mid-extraction here). Point at that known-good binary instead of forcing a
        // fresh download. Override with PLAYWRIGHT_CHROMIUM_PATH if the path differs elsewhere
        // (e.g. CI, a teammate's machine, or after a clean `playwright install`).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
});
