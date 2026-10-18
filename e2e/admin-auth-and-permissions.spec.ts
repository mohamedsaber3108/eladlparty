import { expect, test } from "@playwright/test";

/**
 * Admin login/logout + permission flow, exercised against the CURRENT shared-ADMIN_TOKEN
 * compatibility login (`/api/admin/auth`), which is what the frontend (`AdminDashboard`
 * component) actually calls today. This spec is explicitly a Phase-1/2 baseline, not the
 * final state: Phase 6 of the migration replaces this with Auth.js database sessions and
 * removes ADMIN_TOKEN/x-admin-token from the frontend entirely. When that lands, this file
 * must be rewritten to drive the magic-link flow instead — tracked as a required follow-up,
 * not silently left stale.
 */

const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN ?? "";

test.describe("Admin login/logout (current ADMIN_TOKEN baseline)", () => {
  test.skip(!ADMIN_TOKEN, "E2E_ADMIN_TOKEN not provided to the test runner");

  test("unauthenticated visit to /admin shows the login form, not the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".admin-login")).toBeVisible();
    await expect(page.locator(".admin-app")).not.toBeVisible();
  });

  test("logging in with a valid admin token reveals the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await page.locator(".admin-login input[type='password']").fill(ADMIN_TOKEN);
    await page.locator(".admin-login button").click();
    await expect(page.locator(".admin-app")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".admin-app aside")).toContainText("إدارة البوابة");
  });

  test("logging in with an invalid token shows an error and does not grant access", async ({ page }) => {
    await page.goto("/admin");
    await page.locator(".admin-login input[type='password']").fill("definitely-not-the-real-token");
    await page.locator(".admin-login button").click();
    await expect(page.locator(".admin-status")).toContainText("غير صحيح", { timeout: 10_000 });
    await expect(page.locator(".admin-app")).not.toBeVisible();
  });

  test("logout returns to the login form and clears the session", async ({ page }) => {
    await page.goto("/admin");
    await page.locator(".admin-login input[type='password']").fill(ADMIN_TOKEN);
    await page.locator(".admin-login button").click();
    await expect(page.locator(".admin-app")).toBeVisible({ timeout: 10_000 });

    await page.locator(".admin-logout").click();
    await expect(page.locator(".admin-login")).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.locator(".admin-login")).toBeVisible();
  });
});

test.describe("Admin API authorization (no valid session/token)", () => {
  test("GET /api/admin/content without a token returns 401", async ({ request }) => {
    const response = await request.get("/api/admin/content");
    expect(response.status()).toBe(401);
  });

  test("GET /api/v1/admin/dashboard without a session returns 401", async ({ request }) => {
    const response = await request.get("/api/v1/admin/dashboard");
    expect(response.status()).toBe(401);
  });

  test("POST /api/v1/admin/content without a session is rejected, not silently accepted", async ({ request }) => {
    const response = await request.post("/api/v1/admin/content", {
      data: { contentType: "news", canonicalSlug: "e2e-unauthorized-test", locale: "ar", title: "x", excerpt: "x", bodyRichtext: "x" },
    });
    expect([401, 403]).toContain(response.status());
  });
});
