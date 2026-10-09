import { listPublicContent } from "@/server/services/content-service";
import { contentListQuerySchema } from "@/shared/contracts/content";
import type { SearchResult } from "@/shared/contracts/content";

/**
 * Unified public search. Queries only published content (`listPublicContent` already scopes to
 * `status=published`). At current content volume this uses D1 `LIKE` matching; if the catalogue
 * grows significantly, replace the underlying query with FTS5 virtual table — the public
 * contract (`SearchResult`) will not need to change.
 */
export async function searchPublicContent(params: { q: string; locale: "ar" | "en"; type?: string; cursor?: string; limit: number }): Promise<SearchResult> {
  const query = contentListQuerySchema.parse({
    q: params.q,
    locale: params.locale,
    type: params.type,
    cursor: params.cursor,
    limit: params.limit,
  });
  const { items, nextCursor } = await listPublicContent(query);
  return { items, nextCursor, query: params.q };
}
