import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.NODE_ENV !== "test") {
  // drizzle-kit reads this file directly (outside Next.js's env loading), so surface a clear
  // error early instead of a cryptic connection failure when generating/pushing migrations.
  console.warn("DATABASE_URL is not set. drizzle-kit commands (generate/push/migrate) need it.");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "postgres://localhost:5432/placeholder",
  },
});
