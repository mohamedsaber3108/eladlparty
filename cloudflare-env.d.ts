declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** Legacy shared-secret admin token. Kept only for the compatibility adapter during migration. */
    ADMIN_TOKEN?: string;
    BUCKET?: R2Bucket;
    /** Secret used to sign staff session cookies and CSRF tokens. Required for staff auth to work. */
    SESSION_SECRET?: string;
    /** Base public URL used to build magic-link verification URLs, e.g. https://eladl.party */
    PUBLIC_BASE_URL?: string;
    /** Transactional email provider adapter selection. "resend" or unset (logging no-op adapter). */
    EMAIL_PROVIDER?: string;
    EMAIL_API_KEY?: string;
    EMAIL_FROM?: string;
    /** Cloudflare Turnstile secret for public write-form bot protection. */
    TURNSTILE_SECRET_KEY?: string;
    /** Optional AI provider adapter key for the assistant. Assistant degrades gracefully if unset. */
    AI_PROVIDER_API_KEY?: string;
  }
}
