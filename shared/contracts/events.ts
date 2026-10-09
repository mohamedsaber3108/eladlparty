import { z } from "zod";
import { contentCardSchema } from "./content";

export const eventFormatSchema = z.enum(["in_person", "online", "hybrid"]);
export const eventStatusSchema = z.enum(["draft", "published", "cancelled", "completed"]);
export const registrationModeSchema = z.enum(["internal", "external", "closed", "not_required"]);
export const registrationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "waitlisted",
  "cancelled",
  "attended",
]);

export const eventCardSchema = contentCardSchema.extend({
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  format: eventFormatSchema,
  venueName: z.string().nullable(),
  eventStatus: eventStatusSchema,
  registrationMode: registrationModeSchema,
  registrationOpen: z.boolean(),
  capacityRemaining: z.number().int().nullable(),
});
export type EventCard = z.infer<typeof eventCardSchema>;

export const eventDetailSchema = eventCardSchema.extend({
  body: z.string(),
  venueAddress: z.string().nullable(),
  timezone: z.string(),
  externalRegistrationUrl: z.string().nullable(),
});
export type EventDetail = z.infer<typeof eventDetailSchema>;

export const eventListQuerySchema = z.object({
  when: z.enum(["upcoming", "past", "all"]).default("all"),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  locale: z.enum(["ar", "en"]).default("ar"),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;

export const eventRegistrationInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(30).optional(),
  governorate: z.string().trim().min(2).max(60).optional(),
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
});
export type EventRegistrationInput = z.infer<typeof eventRegistrationInputSchema>;

export const eventRegistrationResultSchema = z.object({
  reference: z.string(),
  status: registrationStatusSchema,
});
export type EventRegistrationResult = z.infer<typeof eventRegistrationResultSchema>;
