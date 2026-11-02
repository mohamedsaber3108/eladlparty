import { sql } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";

export async function GET(request: Request) {
  const u = new URL(request.url);
  const type = u.searchParams.get("type");
  const slug = u.searchParams.get("slug");
  const q = u.searchParams.get("q");
  const locale = u.searchParams.get("locale") || "ar";
  const page = Math.max(1, Number(u.searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(u.searchParams.get("limit") || 12)));
  if (!["ar", "en"].includes(locale)) return Response.json({ error: "invalid_locale" }, { status: 400 });

  try {
    const db = getDb();
    const conditions = [sql`status = 'published'`, sql`locale = ${locale}`];
    if (type) conditions.push(sql`type = ${type}`);
    if (slug) conditions.push(sql`slug = ${slug}`);
    if (q) conditions.push(sql`(title LIKE ${`%${q}%`} OR excerpt LIKE ${`%${q}%`} OR tags LIKE ${`%${q}%`})`);
    const whereClause = sql.join(conditions, sql` AND `);

    const countResult = await db.execute<{ total: number }>(
      sql`SELECT COUNT(*)::int AS total FROM portal_content WHERE ${whereClause}`
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const rows = await db.execute(sql`
      SELECT id, type, slug, locale, title, excerpt, body, category, tags,
             cover_image AS "coverImage", status, featured, published_at AS "publishedAt"
      FROM portal_content
      WHERE ${whereClause}
      ORDER BY featured DESC, published_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `);
    return Response.json({ items: rows.rows, page, limit, total });
  } catch {
    return Response.json({ items: [], page, limit, total: 0, error: "content_unavailable" }, { status: 503 });
  }
}
