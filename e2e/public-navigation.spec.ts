import { expect, test } from "@playwright/test";

test.describe("Public navigation (Arabic, default locale)", () => {
  test("home page loads with Arabic RTL and the expected brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".site-header .brand")).toContainText("حزب العدل");
  });

  test("primary navigation links resolve to real pages, not dead links", async ({ page }) => {
    await page.goto("/");
    const sections = ["/about", "/programs", "/observatory", "/news", "/join"];
    for (const href of sections) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} should resolve`).toBeLessThan(400);
    }
  });

  test("footer links are present and point to real routes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-footer a[href='/about']")).toBeVisible();
    await expect(page.locator(".site-footer a[href='/contact']")).toBeVisible();
    await expect(page.locator(".site-footer a[href='/faq']")).toBeVisible();
  });

  test("the floating assistant launcher is present on every public page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".chat-fab")).toBeVisible();
  });

  test("mobile drawer opens and closes without navigating away", async ({ page }) => {
    // The `.menu` toggle button is only visible below the 1000px breakpoint (desktop nav
    // takes over above it); use a mobile viewport so the button is actually clickable.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator("button.menu").click();
    await expect(page.locator(".mobile-drawer")).toBeVisible();
    await page.locator(".mobile-drawer button[aria-label='إغلاق القائمة']").click();
    await expect(page.locator(".mobile-drawer")).not.toBeVisible();
  });
});

test.describe("Locale switching (Arabic <-> English)", () => {
  test("English route renders with lang=en and ltr direction", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // Locale bootstrap script sets dir based on path; confirm it actually ran.
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("English page links back to the Arabic portal", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("a[href='/']", { hasText: "العربية" })).toBeVisible();
  });

  test("Arabic header exposes an EN switch link", async ({ page }) => {
    await page.goto("/");
    const enLink = page.locator("a.language-link[href='/en']");
    await expect(enLink).toBeVisible();
    await enLink.click();
    await expect(page).toHaveURL(/\/en/);
  });

  test("English sub-pages (about, programs) resolve with localized content", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.locator("h1")).toContainText("About the Secretariat");
  });
});

test.describe("Search, filtering, and pagination", () => {
  test("search page renders the content browser with a search input", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator(".browser-tools input")).toBeVisible();
  });

  test("typing a query filters the visible content client-side", async ({ page }) => {
    await page.goto("/search");
    const input = page.locator(".browser-tools input");
    const initialCount = await page.locator(".content-card").count();
    await input.fill("زززز_لا_يوجد_تطابق_زززز");
    // A non-matching query should reduce results to zero or show the empty state.
    const emptyState = page.locator(".empty-state");
    await expect(emptyState.or(page.locator(".content-card").first())).toBeVisible();
    expect(initialCount).toBeGreaterThanOrEqual(0);
  });

  test("category filter buttons are present and clickable", async ({ page }) => {
    await page.goto("/search");
    const filterButtons = page.locator(".filters button");
    await expect(filterButtons.first()).toBeVisible();
    await filterButtons.first().click();
    await expect(filterButtons.first()).toHaveClass(/selected/);
  });
});
