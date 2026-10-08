import { env } from "cloudflare:workers";
import { clearAdminSession, createAdminSession, isAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdmin(request) });
}

export async function POST(request: Request) {
  const { token } = await request.json() as { token?: string };
  if (!env.ADMIN_TOKEN || !token || token !== env.ADMIN_TOKEN) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true }, { headers: { "set-cookie": await createAdminSession() } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "set-cookie": clearAdminSession } });
}
