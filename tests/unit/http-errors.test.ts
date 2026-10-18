import { describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
  fieldErrorsFromZod,
  jsonOk,
  toErrorResponse,
} from "@/server/http/errors";
import { z } from "zod";

describe("typed AppError subclasses carry the correct HTTP status", () => {
  it("ValidationError -> 400", () => {
    expect(new ValidationError({ name: ["required"] }).status).toBe(400);
  });
  it("UnauthorizedError -> 401", () => {
    expect(new UnauthorizedError().status).toBe(401);
  });
  it("ForbiddenError -> 403", () => {
    expect(new ForbiddenError().status).toBe(403);
  });
  it("NotFoundError -> 404", () => {
    expect(new NotFoundError().status).toBe(404);
  });
  it("ConflictError -> 409", () => {
    expect(new ConflictError().status).toBe(409);
  });
  it("RateLimitedError -> 429", () => {
    expect(new RateLimitedError().status).toBe(429);
  });
});

describe("fieldErrorsFromZod", () => {
  it("converts a Zod validation failure into field-keyed error arrays", () => {
    const schema = z.object({ email: z.string().email(), name: z.string().min(2) });
    const result = schema.safeParse({ email: "bad", name: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = fieldErrorsFromZod(result.error);
      expect(Object.keys(fieldErrors)).toContain("email");
      expect(Object.keys(fieldErrors)).toContain("name");
      expect(fieldErrors.email.length).toBeGreaterThan(0);
    }
  });
});

describe("toErrorResponse", () => {
  it("renders a ValidationError as HTTP 400 with fieldErrors in the body", async () => {
    const response = toErrorResponse(new ValidationError({ body: ["too short"] }), "req-1");
    expect(response.status).toBe(400);
    const json = (await response.json()) as {
      error: { status: number; fieldErrors: Record<string, string[]> };
      requestId: string;
    };
    expect(json.error.status).toBe(400);
    expect(json.error.fieldErrors.body).toEqual(["too short"]);
    expect(json.requestId).toBe("req-1");
  });

  it("renders an unknown thrown error as a generic 500 without leaking internal details", async () => {
    // toErrorResponse intentionally logs unknown errors server-side via console.error for
    // operator visibility; silence that expected log line so test output stays clean.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = toErrorResponse(new Error("some internal DB connection string leaked here"), "req-2");
    expect(response.status).toBe(500);
    const json = (await response.json()) as { error: { detail?: string }; requestId: string };
    expect(json.error.detail).not.toContain("DB connection string");
    expect(json.requestId).toBe("req-2");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("sets the x-request-id response header", () => {
    const response = toErrorResponse(new NotFoundError(), "req-3");
    expect(response.headers.get("x-request-id")).toBe("req-3");
  });
});

describe("jsonOk", () => {
  it("wraps the payload in the {data, meta, requestId} envelope with default status 200", async () => {
    const response = jsonOk({ hello: "world" }, "req-4");
    expect(response.status).toBe(200);
    const json = (await response.json()) as { data: unknown; requestId: string; error: null };
    expect(json.data).toEqual({ hello: "world" });
    expect(json.requestId).toBe("req-4");
    expect(json.error).toBeNull();
  });

  it("respects a custom status code (e.g. 201 Created)", async () => {
    const response = jsonOk({ id: 1 }, "req-5", { status: 201 });
    expect(response.status).toBe(201);
  });

  it("includes meta when provided", async () => {
    const response = jsonOk([1, 2, 3], "req-6", { meta: { nextCursor: "abc", limit: 12 } });
    const json = (await response.json()) as { meta: Record<string, unknown> };
    expect(json.meta).toEqual({ nextCursor: "abc", limit: 12 });
  });
});
