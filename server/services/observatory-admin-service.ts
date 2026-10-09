import { desc, eq } from "drizzle-orm";
import { getDb, nowIso } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import { recordAuditLog } from "@/server/services/audit-service";

export async function listAdminProblems() {
  const db = getDb();
  return db.select().from(schema.problems).orderBy(desc(schema.problems.id)).limit(100);
}

export interface ProblemModerationInput {
  problemStatus?: string;
  visibility?: "private" | "public";
  severity?: string;
  sourceConfidence?: string;
}

/** Moderates a problem report: verification/visibility must be set explicitly by staff before any public exposure. */
export async function moderateProblem(id: number, input: ProblemModerationInput, actorId: number | null): Promise<void> {
  const db = getDb();
  const [existing] = await db.select().from(schema.problems).where(eq(schema.problems.id, id)).limit(1);
  if (!existing) throw new NotFoundError("التحدي غير موجود");

  const now = nowIso();
  await db.update(schema.problems).set({ ...input, updatedAt: now }).where(eq(schema.problems.id, id));
  await db.insert(schema.problemUpdates).values({
    problemId: id,
    statusChange: input.problemStatus ?? null,
    publicUpdateText: null,
    privateNote: `تحديث حالة بواسطة فريق الإدارة`,
    actorUserId: actorId,
    visibility: "internal",
    createdAt: now,
  });
  await recordAuditLog({ actorUserId: actorId, action: "observatory.moderate_problem", entityType: "problems", entityId: id, before: existing, after: input, requestId: null });
}

export async function addProblemEvidence(
  problemId: number,
  input: { sourceType: string; citation?: string; url?: string; publicationDate?: string },
  actorId: number | null
): Promise<number> {
  const db = getDb();
  const [existing] = await db.select().from(schema.problems).where(eq(schema.problems.id, problemId)).limit(1);
  if (!existing) throw new NotFoundError("التحدي غير موجود");

  const inserted = await db
    .insert(schema.problemEvidence)
    .values({
      problemId,
      sourceType: input.sourceType,
      citation: input.citation ?? null,
      url: input.url ?? null,
      publicationDate: input.publicationDate ?? null,
      verificationStatus: "unverified",
      createdAt: nowIso(),
    })
    .returning({ id: schema.problemEvidence.id });

  await recordAuditLog({ actorUserId: actorId, action: "observatory.add_evidence", entityType: "problem_evidence", entityId: inserted[0].id, after: input, requestId: null });
  return inserted[0].id;
}
