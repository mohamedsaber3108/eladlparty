import { describe, expect, it } from "vitest";
import { joinIntakeSchema, partnershipRequestSchema, problemIntakeSchema } from "@/shared/contracts/intake";
import { honeypotSchema } from "@/shared/contracts/common";

const validJoin = {
  name: "محمد أحمد",
  email: "mohamed@example.org",
  body: "أرغب في المشاركة في برامج ريادة الأعمال لأن لدي خبرة في التدريب وتصميم المناهج.",
  consent: true as const,
};

describe("joinIntakeSchema (public /join form)", () => {
  it("accepts a valid minimal submission", () => {
    const result = joinIntakeSchema.safeParse(validJoin);
    expect(result.success).toBe(true);
  });

  it("rejects a submission without explicit consent=true", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects a submission with consent omitted entirely", () => {
    const { consent, ...withoutConsent } = validJoin;
    const result = joinIntakeSchema.safeParse(withoutConsent);
    expect(result.success).toBe(false);
  });

  it("rejects a body shorter than 20 characters (anti-spam minimum detail requirement)", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, body: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, name: "م" });
    expect(result.success).toBe(false);
  });

  it("defaults the honeypot `website` field to an empty string when omitted", () => {
    const result = joinIntakeSchema.safeParse(validJoin);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe("");
  });

  it("accepts a non-empty honeypot field at the schema level (bot detection happens in guardPublicWrite, not validation, so the trap stays invisible to bots)", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, website: "http://spam.example" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe("http://spam.example");
  });

  it("accepts an optional valid LinkedIn URL", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, linkedin: "https://linkedin.com/in/example" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid LinkedIn URL", () => {
    const result = joinIntakeSchema.safeParse({ ...validJoin, linkedin: "not-a-url" });
    expect(result.success).toBe(false);
  });
});

describe("problemIntakeSchema (public /submit/problem form)", () => {
  it("accepts a valid problem report with optional sector/affectedGroup", () => {
    const result = problemIntakeSchema.safeParse({
      name: "سارة محمود",
      body: "توجد مشكلة في توفر التمويل للمشروعات الصغيرة في هذه المحافظة تحديدًا.",
      consent: true,
      sector: "تمويل",
      affectedGroup: "رواد أعمال جدد",
    });
    expect(result.success).toBe(true);
  });

  it("still requires consent even for problem reports", () => {
    const result = problemIntakeSchema.safeParse({
      name: "سارة محمود",
      body: "توجد مشكلة في توفر التمويل للمشروعات الصغيرة في هذه المحافظة تحديدًا.",
      consent: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("partnershipRequestSchema", () => {
  const validPartnership = {
    name: "منظمة الشراكة",
    email: "partner@example.org",
    organizationName: "مؤسسة التنمية",
    proposal: "نقترح شراكة لدعم برامج ريادة الأعمال في المحافظات المستهدفة بالتدريب والتمويل.",
    consent: true as const,
  };

  it("requires an email (unlike base intake forms, where email is optional)", () => {
    const { email, ...withoutEmail } = validPartnership;
    const result = partnershipRequestSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });

  it("accepts a valid partnership request", () => {
    expect(partnershipRequestSchema.safeParse(validPartnership).success).toBe(true);
  });

  it("rejects a proposal shorter than 20 characters", () => {
    const result = partnershipRequestSchema.safeParse({ ...validPartnership, proposal: "too short" });
    expect(result.success).toBe(false);
  });
});

describe("honeypotSchema", () => {
  it("defaults to an empty string", () => {
    const result = honeypotSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe("");
  });

  it("accepts a non-empty value at the schema level (the fake-success/bot-trap logic lives in guardPublicWrite, not in validation)", () => {
    expect(honeypotSchema.safeParse({ website: "x" }).success).toBe(true);
  });
});
