import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  const url = new URL(request.url), kind = url.searchParams.get("kind"), q = url.searchParams.get("q");
  const where: string[] = [], values: string[] = [];
  if (kind) { where.push("kind = ?"); values.push(kind); }
  if (q) { where.push("(title LIKE ? OR alt LIKE ?)"); values.push(`%${q}%`, `%${q}%`); }
  const sql = `SELECT id, kind, title, url, alt, created_at AS createdAt FROM media_assets ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT 60`;
  try { const result = await env.DB.prepare(sql).bind(...values).all(); return Response.json({ items: result.results }); }
  catch { return Response.json({ items: [], error: "media_unavailable" }, { status: 503 }); }
}
