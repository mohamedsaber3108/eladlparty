import { z } from "zod";
import { honeypotSchema } from "./common";

export const intakeKindSchema = z.enum([
  "join",
  "volunteer",
  "idea",
  "problem",
  "proposal",
  "contact",
  "partnership",
]);
export type IntakeKind = z.infer<typeof intakeKindSchema>;

export const intakeCaseStatusSchema = z.enum([
  "new",
  "triaged",
  "assigned",
  "in_review",
  "action_taken",
  "closed",
  "archived",
]);
export type IntakeCaseStatus = z.infer<typeof intakeCaseStatusSchema>;

/** Base fields shared by every public intake form (join/volunteer/idea/problem/proposal/contact). */
const intakeBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  governorate: z.string().trim().min(2).max(60).optional(),
  profession: z.string().trim().max(120).optional(),
  body: z.string().trim().min(20).max(5000),
  consent: z.literal(true, { message: "يجب الموافقة على الشروط قبل الإرسال" }),
});

export const joinIntakeSchema = intakeBaseSchema.merge(honeypotSchema).extend({
  participationType: z.enum(["member", "expert", "partner", "entrepreneur"]).optional(),
  linkedin: z.string().trim().url().max(300).optional(),
});
export type JoinIntakeInput = z.infer<typeof joinIntakeSchema>;

export const volunteerIntakeSchema = intakeBaseSchema.merge(honeypotSchema).extend({
  skills: z.string().trim().max(500).optional(),
  availability: z.string().trim().max(300).optional(),
});
export type VolunteerIntakeInput = z.infer<typeof volunteerIntakeSchema>;

export const ideaIntakeSchema = intakeBaseSchema.merge(honeypotSchema).extend({
  field: z.string().trim().max(120).optional(),
});
export type IdeaIntakeInput = z.infer<typeof ideaIntakeSchema>;

export const problemIntakeSchema = intakeBaseSchema.merge(honeypotSchema).extend({
  sector: z.string().trim().max(120).optional(),
  affectedGroup: z.string().trim().max(200).optional(),
});
export type ProblemIntakeInput = z.infer<typeof problemIntakeSchema>;

export const proposalIntakeSchema = intakeBaseSchema.merge(honeypotSchema).extend({
  reason: z.string().trim().max(1000).optional(),
});
export type ProposalIntakeInput = z.infer<typeof proposalIntakeSchema>;

export const contactIntakeSchema = intakeBaseSchema.merge(honeypotSchema);
export type ContactIntakeInput = z.infer<typeof contactIntakeSchema>;

export const partnershipRequestSchema = honeypotSchema.extend({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(30).optional(),
  organizationName: z.string().trim().min(2).max(200),
  proposal: z.string().trim().min(20).max(5000),
  requestedScope: z.string().trim().max(500).optional(),
  consent: z.literal(true, { message: "يجب الموافقة على الشروط قبل الإرسال" }),
});
export type PartnershipRequestInput = z.infer<typeof partnershipRequestSchema>;

/** Generic non-sensitive acknowledgement returned to every public submitter. */
export const intakeAckSchema = z.object({
  reference: z.string(),
  status: z.literal("received"),
});
export type IntakeAck = z.infer<typeof intakeAckSchema>;

export const caseListQuerySchema = z.object({
  kind: intakeKindSchema.optional(),
  status: intakeCaseStatusSchema.optional(),
  assignedTo: z.coerce.number().int().optional(),
  q: z.string().trim().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CaseListQuery = z.infer<typeof caseListQuerySchema>;
