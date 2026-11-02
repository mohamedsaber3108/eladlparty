import { sql } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q");

  const conditions = [];
  if (kind) conditions.push(sql`kind = ${kind}`);
  if (q) conditions.push(sql`(title LIKE ${`%${q}%`} OR alt LIKE ${`%${q}%`})`);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT id, kind, title, url, alt, created_at AS "createdAt"
      FROM media_assets
      ${whereClause}
      ORDER BY id DESC
      LIMIT 60
    `);
    return Response.json({ items: result.rows });
  } catch {
    return Response.json({ items: [], error: "media_unavailable" }, { status: 503 });
  }
}
