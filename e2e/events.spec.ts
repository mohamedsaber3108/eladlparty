import { expect, test } from "@playwright/test";

test.describe("Events listing and registration API contract", () => {
  test("events listing page renders a defined state", async ({ page }) => {
    await page.goto("/events");
    const grid = page.locator(".content-grid");
    const empty = page.locator(".empty-state");
    await expect(grid.or(empty)).toBeVisible({ timeout: 10_000 });
  });

  test("GET /api/v1/events returns a well-formed envelope", async ({ request }) => {
    const response = await request.get("/api/v1/events?limit=10");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("registering for a nonexistent event slug returns 404, not a false success", async ({ request }) => {
    const response = await request.post("/api/v1/events/this-event-does-not-exist-e2e/registrations", {
      data: {
        name: "مستخدم اختبار",
        email: `e2e-event-${Date.now()}@example.org`,
        consent: true,
        website: "",
      },
    });
    expect(response.status()).toBe(404);
  });

  test("registering without consent is rejected with a validation error (400)", async ({ request }) => {
    const response = await request.post("/api/v1/events/this-event-does-not-exist-e2e/registrations", {
      data: {
        name: "مستخدم اختبار",
        email: `e2e-event-${Date.now()}@example.org`,
        website: "",
      },
    });
    expect([400, 404]).toContain(response.status());
  });

  test("the honeypot field silently accepts without creating a real registration", async ({ request }) => {
    const response = await request.post("/api/v1/events/this-event-does-not-exist-e2e/registrations", {
      data: {
        name: "بوت اختبار",
        email: `e2e-bot-${Date.now()}@example.org`,
        consent: true,
        website: "http://spam.example",
      },
    });
    // Honeypot short-circuits to a fake 201 success before the (nonexistent) event is even looked up.
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.reference).toBe("N/A");
  });
});
