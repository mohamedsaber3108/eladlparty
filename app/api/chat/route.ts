import { sql } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";

const defaults = [
  { terms: ["فعالية", "events", "دعوة"], text: "تجد الفعاليات والدعوات في «المركز الإعلامي»، ويمكن التسجيل أو إبداء الاهتمام من صفحة كل فعالية." },
  { terms: ["مقترح", "مشكلة", "تحدي", "problem"], text: "استخدم نموذج «أبلغ عن مشكلة» أو «قدّم مقترحًا». تصل المشاركة لفريق الأمانة وتظهر في المرصد فقط بعد المراجعة." },
  { terms: ["انضم", "تطوع", "join"], text: "يمكنك الانضمام أو التطوع من قسم «شارك». اختر المجال واكتب نبذة عن خبرتك." },
  { terms: ["تقرير", "بحث", "document"], text: "ستجد التقارير والأبحاث والمنشورات داخل قسم «المعرفة والسياسات»." },
];

export async function POST(request: Request) {
  const { message = "" } = (await request.json()) as { message?: string };
  const q = message.toLowerCase();
  try {
    const db = getDb();
    const result = await db.execute<{ answer: string }>(sql`
      SELECT answer FROM knowledge_entries
      WHERE status = 'published' AND (question LIKE ${`%${message}%`} OR answer LIKE ${`%${message}%`})
      ORDER BY id DESC LIMIT 1
    `);
    const answer = result.rows[0]?.answer;
    if (answer) return Response.json({ answer, source: "knowledge-base" });
  } catch {
    // Fall through to the guided default below if the DB is unavailable.
  }
  const x = defaults.find((a) => a.terms.some((t) => q.includes(t)));
  return Response.json({
    answer: x?.text || "أستطيع توجيهك إلى البرامج والفعاليات والفرص وطرق المشاركة. جرّب البحث في البوابة، أو أرسل استفسارك من صفحة التواصل.",
    source: "guided",
  });
}
