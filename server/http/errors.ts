import type { ZodError } from "zod";
import { dataResponse, problemResponse } from "@/shared/contracts/common";

/** Base class for every typed service/policy error. Carries the HTTP status to use. */
export class AppError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(fieldErrors: Record<string, string[]>, message = "بيانات غير صالحة") {
    super(400, message, fieldErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "يجب تسجيل الدخول للوصول إلى هذا المورد") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "لا تملك صلاحية تنفيذ هذا الإجراء") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "العنصر المطلوب غير موجود") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "تعارض في البيانات") {
    super(409, message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "عدد كبير من الطلبات، حاول بعد قليل") {
    super(429, message);
  }
}

/** Converts a Zod validation failure into field-keyed error arrays for the API envelope. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

const titles: Record<number, string> = {
  400: "طلب غير صالح",
  401: "غير مصرح",
  403: "ممنوع",
  404: "غير موجود",
  409: "تعارض",
  429: "طلبات كثيرة",
  500: "خطأ في الخادم",
  503: "الخدمة غير متاحة",
};

/** Converts any thrown error into a JSON Response following the project's envelope. */
export function toErrorResponse(error: unknown, requestId: string): Response {
  if (error instanceof AppError) {
    const body = problemResponse(requestId, error.status, titles[error.status] ?? "خطأ", error.message, error.fieldErrors);
    return Response.json(body, { status: error.status, headers: { "x-request-id": requestId } });
  }
  console.error(`[${requestId}]`, error);
  const body = problemResponse(requestId, 500, titles[500], "حدث خطأ غير متوقع، حاول مرة أخرى لاحقًا");
  return Response.json(body, { status: 500, headers: { "x-request-id": requestId } });
}

/** Wraps a successful payload in the `{data, meta, requestId}` envelope. */
export function jsonOk<T>(data: T, requestId: string, init?: { status?: number; meta?: Record<string, unknown> }): Response {
  return Response.json(dataResponse(data, requestId, init?.meta), {
    status: init?.status ?? 200,
    headers: { "x-request-id": requestId },
  });
}
