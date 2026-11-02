import { readFileSync } from "node:fs";
import { Pool, type PoolConfig } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

/**
 * Postgres connection pool — Amazon RDS for PostgreSQL in production, Docker Postgres in
 * local development. Reused as a real, long-lived connection pool across requests: this app
 * runs as a persistent Node.js process (the `web` service in docker-compose.yml), not a
 * serverless function, so there is no per-invocation cold-start/pool-churn concern.
 */
let pool: Pool | undefined;
let db: NodePgDatabase<typeof schema> | undefined;

function buildSslConfig(): PoolConfig["ssl"] {
  // Explicit opt-in via DATABASE_SSL=true, rather than sniffing the connection string — RDS
  // deployments should set this, local Docker Postgres should leave it unset.
  if (process.env.DATABASE_SSL !== "true") return undefined;
  const caPath = process.env.DATABASE_SSL_CA_PATH;
  if (caPath) {
    // Preferred for production: verify against Amazon RDS's combined CA bundle
    // (https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem), mounted into the
    // container and referenced by this path — see docs/DEPLOYMENT.md.
    return { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true };
  }
  // Fallback: encrypt the connection without verifying RDS's certificate chain. Acceptable for
  // a quick start but documented as the less secure option — bundle the RDS CA for production.
  return { rejectUnauthorized: false };
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Set it to a Postgres connection string (Amazon RDS in production, or the local Docker Postgres instance in development) before using the database."
    );
  }
  if (!pool) {
    pool = new Pool({ connectionString, ssl: buildSslConfig() });
  }
  return pool;
}

/** Returns the Drizzle query builder bound to the Postgres connection pool. */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) db = drizzle(getPool(), { schema });
  return db;
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
