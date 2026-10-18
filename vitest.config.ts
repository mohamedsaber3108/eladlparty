import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit/integration test config for portable logic only — Zod contracts, RBAC policy,
 * crypto helpers, and the HTTP error envelope. These modules have zero `cloudflare:workers`
 * coupling and survive the Postgres/Auth.js/R2 migration unchanged, so the tests here remain
 * valid before, during, and after that migration (unlike a D1-specific Workers test harness,
 * which would be thrown away in Phase 3).
 *
 * Service-layer code that touches `server/repositories/db.ts` (and therefore
 * `cloudflare:workers`) is NOT unit-tested here today — it's covered instead by the
 * Playwright E2E suite (`e2e/`), which exercises it black-box over HTTP against a real running
 * dev server. That approach is deliberately migration-proof: the same specs keep passing after
 * the database/runtime swap with zero changes, which is the actual regression safety net this
 * phase needs.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["shared/contracts/**", "server/policies/**", "server/security/**", "server/http/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
