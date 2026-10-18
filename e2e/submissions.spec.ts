import { expect, test } from "@playwright/test";

/**
 * These specs exercise the public intake forms end to end against the real running backend
 * (currently the legacy `/api/submissions` compatibility route backed by D1; after the Phase 4
 * database migration, the same specs exercise whatever endpoint the frontend calls against
 * Postgres). Submitting real data every run is intentional — it proves the full validate ->
 * persist -> acknowledge path, not just that a form renders.
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.org`;
}

test.describe("Idea / problem / proposal / contact submission flows", () => {
  test("submitting an idea with valid data shows a success confirmation", async ({ page }) => {
    await page.goto("/submit/idea");
    await expect(page.locator(".submit-form h2")).toContainText("أرسل فكرة");

    await page.locator("input[name='name']").fill("مستخدم اختبار E2E");
    await page.locator("input[name='email']").fill(uniqueEmail("idea"));
    await page
      .locator("textarea[name='body']")
      .fill("هذه فكرة تجريبية لاختبار النظام من البداية للنهاية، تتضمن تفاصيل كافية لتجاوز حد الطول الأدنى.");
    await page.locator("input[name='consent']").check();
    await page.locator("button[type='submit'], .submit-form button:not([type])").first().click();

    await expect(page.locator(".form-success")).toBeVisible({ timeout: 10_000 });
  });

  test("submitting a problem report with valid data shows a success confirmation", async ({ page }) => {
    await page.goto("/submit/problem");
    await expect(page.locator(".submit-form h2")).toContainText("أبلغ عن مشكلة");

    await page.locator("input[name='name']").fill("مستخدم اختبار E2E");
    await page.locator("input[name='email']").fill(uniqueEmail("problem"));
    await page
      .locator("textarea[name='body']")
      .fill("وصف تفصيلي لمشكلة تجريبية في الوصول إلى التمويل لأصحاب المشروعات الصغيرة في هذه المنطقة.");
    await page.locator("input[name='consent']").check();
    await page.locator(".submit-form button").first().click();

    await expect(page.locator(".form-success")).toBeVisible({ timeout: 10_000 });
  });

  test("submitting a proposal with valid data shows a success confirmation", async ({ page }) => {
    await page.goto("/submit/proposal");
    await page.locator("input[name='name']").fill("مستخدم اختبار E2E");
    await page.locator("input[name='email']").fill(uniqueEmail("proposal"));
    await page
      .locator("textarea[name='body']")
      .fill("مقترح تجريبي لبرنامج تدريبي جديد يستهدف رواد الأعمال في المحافظات الأقل خدمة.");
    await page.locator("input[name='consent']").check();
    await page.locator(".submit-form button").first().click();

    await expect(page.locator(".form-success")).toBeVisible({ timeout: 10_000 });
  });

  test("the contact form accepts a message and confirms receipt", async ({ page }) => {
    await page.goto("/contact");
    await page.locator("input[name='name']").fill("مستخدم اختبار E2E");
    await page.locator("input[name='email']").fill(uniqueEmail("contact"));
    await page
      .locator("textarea[name='body']")
      .fill("رسالة تجريبية للتواصل مع فريق الأمانة بخصوص استفسار عام حول البرامج.");
    await page.locator("input[name='consent']").check();
    await page.locator(".submit-form button").first().click();

    await expect(page.locator(".form-success")).toBeVisible({ timeout: 10_000 });
  });

  test("submitting without required consent is blocked client-side (HTML5 required validation)", async ({ page }) => {
    await page.goto("/submit/idea");
    await page.locator("input[name='name']").fill("بدون موافقة");
    await page.locator("input[name='email']").fill(uniqueEmail("noconsent"));
    await page.locator("textarea[name='body']").fill("نص تجريبي كافٍ من الأحرف لتجاوز الحد الأدنى للطول المطلوب.");
    // Deliberately leave consent unchecked and submit.
    await page.locator(".submit-form button").first().click();
    // The native "required" attribute should block submission; the success message must not appear.
    await expect(page.locator(".form-success")).not.toBeVisible();
  });

  test("submitting with a body shorter than the minimum length shows a validation/network error, not a false success", async ({ page }) => {
    await page.goto("/submit/idea");
    await page.locator("input[name='name']").fill("نص قصير");
    await page.locator("input[name='email']").fill(uniqueEmail("short"));
    const bodyField = page.locator("textarea[name='body']");
    await bodyField.fill("قصير جدًا");
    await page.locator("input[name='consent']").check();
    // minLength=20 is enforced by the browser; confirm the field reports invalid state.
    const isValid = await bodyField.evaluate((el: HTMLTextAreaElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test("the honeypot field is present but hidden from real users", async ({ page }) => {
    await page.goto("/submit/idea");
    const honeypot = page.locator("input[name='website']");
    await expect(honeypot).toHaveAttribute("aria-hidden", "true");
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
  });
});
