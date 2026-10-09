import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/repositories/db";
import * as schema from "@/db/schema";
import type { NavigationNode } from "@/shared/contracts/content";

/** Builds the public navigation tree for the given locale from `navigation_items`. */
export async function getPublicNavigationTree(locale: "ar" | "en"): Promise<NavigationNode[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.navigationItems)
    .where(and(eq(schema.navigationItems.locale, locale), eq(schema.navigationItems.visibility, "public")))
    .orderBy(asc(schema.navigationItems.sortOrder));

  const byParent = new Map<number | null, typeof rows>();
  for (const row of rows) {
    const key = row.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }

  function build(parentId: number | null): NavigationNode[] {
    return (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      href: row.href,
      icon: row.icon,
      children: build(row.id),
    }));
  }

  return build(null);
}
