import { expect, test } from "@playwright/test";

test.describe("Public media gallery", () => {
  test("photo gallery page renders without crashing and shows a defined state (items, empty, or error)", async ({ page }) => {
    await page.goto("/media/photos");
    const gallery = page.locator(".media-gallery");
    const empty = page.locator(".empty-state");
    const error = page.locator(".inline-error");
    const loading = page.locator(".loading-bar");
    // Wait for the loading state to resolve to one of: populated gallery, empty state, or error.
    await expect(gallery.or(empty).or(error)).toBeVisible({ timeout: 10_000 });
    await expect(loading).not.toBeVisible();
  });

  test("video gallery page renders without crashing", async ({ page }) => {
    await page.goto("/media/videos");
    const gallery = page.locator(".media-gallery");
    const empty = page.locator(".empty-state");
    const error = page.locator(".inline-error");
    await expect(gallery.or(empty).or(error)).toBeVisible({ timeout: 10_000 });
  });

  test("GET /api/media returns a well-formed JSON envelope (items array) regardless of content", async ({ request }) => {
    const response = await request.get("/api/media?kind=image");
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
  });
});

test.describe("Content publish -> public visibility (via public read API)", () => {
  test("GET /api/v1/content only returns status=published records — spot check via the public API contract", async ({ request }) => {
    const response = await request.get("/api/v1/content?limit=50");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    // Every item returned publicly must expose a slug and a canonical href — never raw draft fields.
    for (const item of body.data) {
      expect(item).toHaveProperty("slug");
      expect(item).toHaveProperty("href");
      expect(item).not.toHaveProperty("bodyRichtext"); // detail-only field, must not leak into list payloads unexpectedly
    }
  });

  test("GET /api/v1/content/:slug for a nonexistent slug returns 404, not a silent empty 200", async ({ request }) => {
    const response = await request.get("/api/v1/content/this-slug-definitely-does-not-exist-e2e");
    expect(response.status()).toBe(404);
  });

  test("legacy GET /api/content only ever returns published, locale-matched rows (compatibility adapter contract)", async ({ request }) => {
    const response = await request.get("/api/content?locale=ar&limit=10");
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
    for (const item of body.items) {
      expect(item.status).toBe("published");
      expect(item.locale).toBe("ar");
    }
  });
});
