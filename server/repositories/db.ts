import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

/** Returns the Drizzle query builder bound to the Cloudflare D1 `DB` binding. */
export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;

export function nowIso(): string {
  return new Date().toISOString();
}

/** Generates a short, non-sensitive public reference code for intake cases / registrations. */
export function generateReference(prefix: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `${prefix}-${suffix}`;
}
