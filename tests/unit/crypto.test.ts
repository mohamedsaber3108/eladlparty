import { describe, expect, it } from "vitest";
import { hashForAudit, hmacSha256Hex, randomToken, sha256Hex } from "@/server/security/crypto";

describe("sha256Hex", () => {
  it("produces a 64-character lowercase hex digest", async () => {
    const digest = await sha256Hex("eladl");
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the known SHA-256 digest of an empty string", async () => {
    // Well-known reference value: SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("is deterministic: the same input always produces the same digest", async () => {
    const a = await sha256Hex("membership-reference-MB-ABCD1234");
    const b = await sha256Hex("membership-reference-MB-ABCD1234");
    expect(a).toBe(b);
  });

  it("produces different digests for different inputs", async () => {
    const a = await sha256Hex("token-one");
    const b = await sha256Hex("token-two");
    expect(a).not.toBe(b);
  });
});

describe("hmacSha256Hex", () => {
  it("is deterministic for the same secret and value", async () => {
    const a = await hmacSha256Hex("secret-key", "payload");
    const b = await hmacSha256Hex("secret-key", "payload");
    expect(a).toBe(b);
  });

  it("produces different signatures for different secrets (session forgery protection)", async () => {
    const a = await hmacSha256Hex("secret-key-one", "payload");
    const b = await hmacSha256Hex("secret-key-two", "payload");
    expect(a).not.toBe(b);
  });

  it("produces a 64-char hex signature", async () => {
    const sig = await hmacSha256Hex("secret", "value");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("randomToken", () => {
  it("produces a URL-safe token with no padding or unsafe characters", () => {
    const token = randomToken(32);
    expect(token).not.toMatch(/[+/=]/);
    expect(token.length).toBeGreaterThan(0);
  });

  it("produces different tokens on each call (collision resistance)", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => randomToken(32)));
    expect(tokens.size).toBe(50);
  });

  it("respects the requested byte length proportionally", () => {
    const short = randomToken(8);
    const long = randomToken(32);
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe("hashForAudit", () => {
  it("returns null for null/undefined input (never fabricates a hash for absent data)", async () => {
    expect(await hashForAudit(null)).toBeNull();
    expect(await hashForAudit(undefined)).toBeNull();
  });

  it("returns a hex digest for a real IP/user-agent string", async () => {
    const hash = await hashForAudit("203.0.113.42");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never returns the raw input value (privacy minimization)", async () => {
    const ip = "203.0.113.42";
    const hash = await hashForAudit(ip);
    expect(hash).not.toBe(ip);
    expect(hash).not.toContain(ip);
  });
});
