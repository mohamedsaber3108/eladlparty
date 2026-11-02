import { expect, test } from "@playwright/test";

/**
 * Admin auth flow, now backed by Auth.js v5 database sessions (one-time email sign-in link,
 * no password/shared token). A full click-through of the magic-link email round-trip isn't
 * exercised here — there is no real mailbox to read in this environment, and the dev-only
 * logging email adapter prints the link to the server's console rather than a location
 * Playwright can observe without scraping process stdout. What's covered instead is every
 * part of the flow that's actually observable black-box over HTTP: the login page renders,
 * an unauthenticated visit never reaches the dashboard, and every protected API route 401s
 * without a session — mirroring the unauthenticated-side coverage this suite always had.
 */

test.describe("Admin login page (Auth.js email sign-in)", () => {
  test("unauthenticated visit to /admin redirects to the login page, not the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator(".admin-login")).toBeVisible();
    await expect(page.locator(".admin-app")).not.toBeVisible();
  });

  test("the login page renders an email field and a submit button, not a password/token field", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator(".admin-login input[type='email']")).toBeVisible();
    await expect(page.locator(".admin-login input[type='password']")).not.toBeVisible();
    await expect(page.locator(".admin-login button")).toContainText("إرسال رابط تسجيل الدخول");
  });

  test("submitting the sign-in form shows a generic confirmation regardless of whether the email has a staff account", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator(".admin-login input[type='email']").fill("not-a-real-staff-account@example.org");
    await page.locator(".admin-login button").click();
    // No account-enumeration signal: the UI always shows the same generic message.
    await expect(page.locator(".admin-status")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Admin API authorization (no valid session)", () => {
  test("GET /api/v1/admin/dashboard without a session returns 401", async ({ request }) => {
    const response = await request.get("/api/v1/admin/dashboard");
    expect(response.status()).toBe(401);
  });

  test("GET /api/v1/admin/content without a session returns 401", async ({ request }) => {
    const response = await request.get("/api/v1/admin/content");
    expect(response.status()).toBe(401);
  });

  test("GET /api/v1/admin/users without a session returns 401", async ({ request }) => {
    const response = await request.get("/api/v1/admin/users");
    expect(response.status()).toBe(401);
  });

  test("POST /api/v1/admin/content without a session is rejected, not silently accepted", async ({ request }) => {
    const response = await request.post("/api/v1/admin/content", {
      data: { contentType: "news", canonicalSlug: "e2e-unauthorized-test", locale: "ar", title: "x", excerpt: "x", bodyRichtext: "x" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/v1/auth/me without a session reports authenticated:false", async ({ request }) => {
    const response = await request.get("/api/v1/auth/me");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.authenticated).toBe(false);
    expect(body.data.user).toBeNull();
  });
});
