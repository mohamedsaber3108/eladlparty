import { contentListQuerySchema, type ContentListQuery } from "@/shared/contracts/content";
import { eventListQuerySchema, type EventListQuery } from "@/shared/contracts/events";
import { listPublicContent } from "@/server/services/content-service";
import { listPublicEvents } from "@/server/services/events-service";

function contentQuery(overrides: Partial<ContentListQuery>): ContentListQuery {
  return contentListQuerySchema.parse(overrides);
}

function eventQuery(overrides: Partial<EventListQuery>): EventListQuery {
  return eventListQuerySchema.parse(overrides);
}

/** Single aggregated homepage payload: featured news, upcoming events, programs/initiatives, calls. */
export async function getHomeAggregate(locale: "ar" | "en") {
  const [news, events, programs, initiatives, calls] = await Promise.all([
    listPublicContent(contentQuery({ type: "news", locale, limit: 4, sort: "recent" })),
    listPublicEvents(eventQuery({ when: "upcoming", limit: 3, locale })),
    listPublicContent(contentQuery({ type: "program", locale, limit: 4, sort: "featured" })),
    listPublicContent(contentQuery({ type: "initiative", locale, limit: 4, sort: "recent" })),
    listPublicContent(contentQuery({ type: "call", locale, limit: 3, sort: "recent" })),
  ]);
  return {
    news: news.items,
    events: events.items,
    programs: programs.items,
    initiatives: initiatives.items,
    calls: calls.items,
  };
}
