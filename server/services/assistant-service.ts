import { and, eq, like, or } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { RateLimitedError } from "@/server/http/errors";
import type { AssistantMessageRequest, AssistantMessageResponse } from "@/shared/contracts/assistant";
import { consumeRateLimit } from "@/server/services/rate-limit-service";
import { randomToken } from "@/server/security/crypto";

/**
 * Keyword-based retrieval over approved knowledge only. There is no AI_PROVIDER_API_KEY secret
 * configured in this environment, so the assistant answers strictly from approved
 * `knowledge_entries` and published `content_entries` matches — it never fabricates facts,
 * matching the brief's requirement to refuse when no approved source exists. If
 * `AI_PROVIDER_API_KEY` is set in the future, swap `composeAnswer` to call that provider,
 * but keep retrieval scoped to the same approved-source set so citations stay accurate.
 */
async function findKnowledgeMatch(message: string, _locale: string) {
  const db = getDb();
  const needle = `%${message.slice(0, 60)}%`;
  const [match] = await db
    .select()
    .from(schema.knowledgeEntries)
    .where(and(eq(schema.knowledgeEntries.status, "published"), or(like(schema.knowledgeEntries.question, needle), like(schema.knowledgeEntries.answer, needle))))
    .limit(1);
  return match ?? null;
}

async function findContentMatches(message: string, locale: "ar" | "en") {
  const db = getDb();
  const words = message.split(/\s+/).filter((w) => w.length >= 3).slice(0, 4);
  if (!words.length) return [];
  const likeConditions = words.map((w) => like(schema.contentEntries.title, `%${w}%`));
  const rows = await db
    .select()
    .from(schema.contentEntries)
    .where(and(eq(schema.contentEntries.status, "published"), eq(schema.contentEntries.locale, locale), or(...likeConditions)))
    .limit(3);
  return rows;
}

function guidedFallback(message: string, _locale: "ar" | "en"): { answer: string; citations: { title: string; href: string }[] } {
  const lower = message.toLowerCase();
  if (lower.includes("فعال") || lower.includes("event")) {
    return { answer: "تجد كل الفعاليات القادمة والسابقة في صفحة الفعاليات.", citations: [{ title: "الفعاليات", href: "/events" }] };
  }
  if (lower.includes("مشكل") || lower.includes("تحد") || lower.includes("problem")) {
    return { answer: "يمكنك الإبلاغ عن مشكلة من صفحة المرصد، وسيراجعها فريق الأمانة.", citations: [{ title: "أبلغ عن مشكلة", href: "/submit/problem" }] };
  }
  if (lower.includes("انضم") || lower.includes("تطوع") || lower.includes("join") || lower.includes("volunteer")) {
    return { answer: "يمكنك الانضمام إلى المسار أو التطوع بخبرتك من صفحة المشاركة.", citations: [{ title: "انضم إلى المسار", href: "/join" }] };
  }
  if (lower.includes("تقرير") || lower.includes("report")) {
    return { answer: "التقارير والمنشورات متاحة في قسم المعرفة والسياسات.", citations: [{ title: "التقارير", href: "/insights/reports" }] };
  }
  return {
    answer: "لم أجد إجابة مؤكدة لسؤالك ضمن المحتوى المعتمد حاليًا. جرّب البحث في الموقع أو تواصل مع فريق الأمانة.",
    citations: [{ title: "بحث", href: "/search" }, { title: "تواصل معنا", href: "/contact" }],
  };
}

export async function answerAssistantMessage(input: AssistantMessageRequest, request: Request): Promise<AssistantMessageResponse> {
  const bucketKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  const allowed = await consumeRateLimit(`assistant:${bucketKey}`, 20, 60 * 1000);
  if (!allowed) throw new RateLimitedError("عدد كبير من الأسئلة في وقت قصير، حاول بعد قليل");

  const sessionRef = input.sessionRef ?? randomToken(16);
  const db = getDb();
  const now = nowIso();

  let [conversation] = await db.select().from(schema.assistantConversations).where(eq(schema.assistantConversations.sessionRef, sessionRef)).limit(1);
  if (!conversation) {
    const inserted = await db
      .insert(schema.assistantConversations)
      .values({ sessionRef, locale: input.locale, contextRoute: input.contextPath ?? null, status: "active", createdAt: now, updatedAt: now })
      .returning();
    conversation = inserted[0];
  }

  await db.insert(schema.assistantMessages).values({ conversationId: conversation.id, role: "user", content: input.message, createdAt: now });

  const knowledgeMatch = await findKnowledgeMatch(input.message, input.locale);
  let answer: AssistantMessageResponse;

  if (knowledgeMatch) {
    answer = { answer: knowledgeMatch.answer, citations: [], source: "knowledge-base", sessionRef };
  } else {
    const contentMatches = await findContentMatches(input.message, input.locale);
    if (contentMatches.length) {
      answer = {
        answer: `قد يفيدك: ${contentMatches[0].title}. ${contentMatches[0].excerpt}`,
        citations: contentMatches.map((c) => ({ title: c.title, href: `/${c.contentType}/${c.canonicalSlug}` })),
        source: "knowledge-base",
        sessionRef,
      };
    } else {
      const fallback = guidedFallback(input.message, input.locale);
      answer = { ...fallback, source: "guided", sessionRef };
    }
  }

  await db.insert(schema.assistantMessages).values({
    conversationId: conversation.id,
    role: "assistant",
    content: answer.answer,
    citationsJson: JSON.stringify(answer.citations),
    createdAt: nowIso(),
  });

  return answer;
}
