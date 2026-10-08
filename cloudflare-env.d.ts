declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
