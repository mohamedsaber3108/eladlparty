import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import type { PublicPolicyPaper, PublicProblem, PublicSolution } from "@/shared/contracts/observatory";

/** Public problem registry: only `problemStatus=published` AND `visibility=public` rows are ever returned. */
export async function listPublicProblems(locale: "ar" | "en", cursor?: string, limit = 12): Promise<{ items: PublicProblem[]; nextCursor: string | null }> {
  const db = getDb();
  const conditions = [
    eq(schema.problems.problemStatus, "published"),
    eq(schema.problems.visibility, "public"),
    eq(schema.contentEntries.locale, locale),
    eq(schema.contentEntries.status, "published"),
  ];
  if (cursor) conditions.push(lt(schema.problems.id, Number(cursor)));

  const rows = await db
    .select({ problem: schema.problems, entry: schema.contentEntries })
    .from(schema.problems)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.problems.contentEntryId))
    .where(and(...conditions))
    .orderBy(desc(schema.problems.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: PublicProblem[] = [];
  for (const row of page) {
    const evidenceRows = await db
      .select()
      .from(schema.problemEvidence)
      .where(and(eq(schema.problemEvidence.problemId, row.problem.id), eq(schema.problemEvidence.verificationStatus, "verified")));
    items.push({
      id: row.entry.id,
      contentType: "page",
      slug: row.entry.canonicalSlug,
      locale: row.entry.locale as PublicProblem["locale"],
      title: row.entry.title,
      excerpt: row.entry.excerpt,
      coverImageUrl: null,
      featured: row.entry.featured === 1,
      publishedAt: row.entry.publishedAt,
      categories: [],
      tags: [],
      href: `/observatory/problems/${row.entry.canonicalSlug}`,
      sector: row.problem.sector,
      governorate: row.problem.governorate,
      severity: row.problem.severity as PublicProblem["severity"],
      affectedGroup: row.problem.affectedGroup,
      evidence: evidenceRows.map((e) => ({ citation: e.citation, url: e.url, publicationDate: e.publicationDate })),
    });
  }
  return { items, nextCursor: hasMore ? String(page[page.length - 1].problem.id) : null };
}

export async function getPublicProblemBySlug(slug: string, locale: "ar" | "en"): Promise<PublicProblem> {
  const db = getDb();
  const [row] = await db
    .select({ problem: schema.problems, entry: schema.contentEntries })
    .from(schema.problems)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.problems.contentEntryId))
    .where(
      and(
        eq(schema.contentEntries.canonicalSlug, slug),
        eq(schema.contentEntries.locale, locale),
        eq(schema.problems.problemStatus, "published"),
        eq(schema.problems.visibility, "public")
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError("هذا المحتوى غير متاح للعرض العام");
  const evidenceRows = await db.select().from(schema.problemEvidence).where(eq(schema.problemEvidence.problemId, row.problem.id));
  return {
    id: row.entry.id,
    contentType: "page",
    slug: row.entry.canonicalSlug,
    locale: row.entry.locale as PublicProblem["locale"],
    title: row.entry.title,
    excerpt: row.entry.excerpt,
    coverImageUrl: null,
    featured: row.entry.featured === 1,
    publishedAt: row.entry.publishedAt,
    categories: [],
    tags: [],
    href: `/observatory/problems/${row.entry.canonicalSlug}`,
    sector: row.problem.sector,
    governorate: row.problem.governorate,
    severity: row.problem.severity as PublicProblem["severity"],
    affectedGroup: row.problem.affectedGroup,
    evidence: evidenceRows.map((e) => ({ citation: e.citation, url: e.url, publicationDate: e.publicationDate })),
  };
}

export async function listPublicSolutions(locale: "ar" | "en"): Promise<PublicSolution[]> {
  const db = getDb();
  const rows = await db
    .select({ solution: schema.proposedSolutions, entry: schema.contentEntries, problem: schema.problems })
    .from(schema.proposedSolutions)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.proposedSolutions.contentEntryId))
    .innerJoin(schema.problems, eq(schema.problems.id, schema.proposedSolutions.problemId))
    .where(and(eq(schema.contentEntries.status, "published"), eq(schema.contentEntries.locale, locale), eq(schema.problems.visibility, "public")))
    .orderBy(desc(schema.proposedSolutions.id))
    .limit(50);
  return rows.map((r) => ({
    id: r.entry.id,
    contentType: "solution",
    slug: r.entry.canonicalSlug,
    locale: r.entry.locale as PublicSolution["locale"],
    title: r.entry.title,
    excerpt: r.entry.excerpt,
    coverImageUrl: null,
    featured: r.entry.featured === 1,
    publishedAt: r.entry.publishedAt,
    categories: [],
    tags: [],
    href: `/observatory/solutions/${r.entry.canonicalSlug}`,
    problemSlug: null,
    solutionType: r.solution.solutionType,
    status: r.solution.status,
  }));
}

export async function listPublicPolicyPapers(locale: "ar" | "en"): Promise<PublicPolicyPaper[]> {
  const db = getDb();
  const rows = await db
    .select({ policy: schema.policyPapers, entry: schema.contentEntries })
    .from(schema.policyPapers)
    .innerJoin(schema.contentEntries, eq(schema.contentEntries.id, schema.policyPapers.contentEntryId))
    .where(and(eq(schema.contentEntries.status, "published"), eq(schema.contentEntries.locale, locale)))
    .orderBy(desc(schema.policyPapers.id))
    .limit(50);
  return rows.map((r) => ({
    id: r.entry.id,
    contentType: "policy_paper",
    slug: r.entry.canonicalSlug,
    locale: r.entry.locale as PublicPolicyPaper["locale"],
    title: r.entry.title,
    excerpt: r.entry.excerpt,
    coverImageUrl: null,
    featured: r.entry.featured === 1,
    publishedAt: r.entry.publishedAt,
    categories: [],
    tags: [],
    href: `/observatory/policies/${r.entry.canonicalSlug}`,
    policyStatus: r.policy.policyStatus as PublicPolicyPaper["policyStatus"],
    consultationDeadline: r.policy.consultationDeadline,
    finalDocumentUrl: null,
  }));
}
