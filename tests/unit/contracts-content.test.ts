import { describe, expect, it } from "vitest";
import { contentListQuerySchema, contentTypeSchema } from "@/shared/contracts/content";

describe("contentListQuerySchema", () => {
  it("defaults locale to 'ar' when omitted (Arabic-first requirement)", () => {
    const result = contentListQuerySchema.parse({});
    expect(result.locale).toBe("ar");
  });

  it("accepts an explicit locale=en override", () => {
    const result = contentListQuerySchema.parse({ locale: "en" });
    expect(result.locale).toBe("en");
  });

  it("rejects a locale outside the ar/en enum", () => {
    const result = contentListQuerySchema.safeParse({ locale: "fr" });
    expect(result.success).toBe(false);
  });

  it("defaults limit to 12 and caps it at 50", () => {
    expect(contentListQuerySchema.parse({}).limit).toBe(12);
    expect(contentListQuerySchema.safeParse({ limit: "9999" }).success).toBe(false);
  });

  it("coerces a string limit query param into a number", () => {
    const result = contentListQuerySchema.parse({ limit: "25" });
    expect(result.limit).toBe(25);
    expect(typeof result.limit).toBe("number");
  });

  it("rejects a content type outside the fixed enum (no arbitrary type injection)", () => {
    expect(contentListQuerySchema.safeParse({ type: "not_a_real_type" }).success).toBe(false);
  });

  it("accepts every documented content type", () => {
    for (const type of contentTypeSchema.options) {
      expect(contentListQuerySchema.safeParse({ type }).success).toBe(true);
    }
  });

  it("defaults sort to 'recent'", () => {
    expect(contentListQuerySchema.parse({}).sort).toBe("recent");
  });
});
