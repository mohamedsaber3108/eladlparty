import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import { countFailedOutboxJobs } from "@/server/jobs/outbox";
import type { AdminDashboard } from "@/shared/contracts/admin";

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const db = getDb();

  const [[{ pendingCases }], [{ scheduledContent }], [{ upcomingRegistrations }], [{ contentCount }], [{ submissionCount }], [{ mediaCount }], recentActivity, notificationFailures] =
    await Promise.all([
      db.select({ pendingCases: sql<number>`count(*)` }).from(schema.intakeCases).where(sql`${schema.intakeCases.status} not in ('closed','archived')`),
      db.select({ scheduledContent: sql<number>`count(*)` }).from(schema.contentEntries).where(eq(schema.contentEntries.status, "scheduled")),
      db.select({ upcomingRegistrations: sql<number>`count(*)` }).from(schema.eventRegistrations).where(sql`${schema.eventRegistrations.status} in ('pending','confirmed')`),
      db.select({ contentCount: sql<number>`count(*)` }).from(schema.contentEntries),
      db.select({ submissionCount: sql<number>`count(*)` }).from(schema.intakeCases),
      db.select({ mediaCount: sql<number>`count(*)` }).from(schema.storageAssets),
      db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.id)).limit(10),
      countFailedOutboxJobs(),
    ]);

  return {
    pendingCases,
    scheduledContent,
    upcomingRegistrations,
    recentActivity: recentActivity.map((a) => ({ action: a.action, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt })),
    notificationFailures,
    totals: { content: contentCount, submissions: submissionCount, media: mediaCount },
  };
}
