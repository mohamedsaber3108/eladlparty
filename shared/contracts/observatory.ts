import { z } from "zod";
import { contentCardSchema } from "./content";

export const problemSeveritySchema = z.enum(["low", "medium", "high", "unknown"]);
export const problemStatusSchema = z.enum([
  "submitted",
  "under_review",
  "verified",
  "published",
  "rejected",
  "archived",
]);

export const publicProblemSchema = contentCardSchema.extend({
  sector: z.string().nullable(),
  governorate: z.string().nullable(),
  severity: problemSeveritySchema,
  affectedGroup: z.string().nullable(),
  evidence: z
    .array(
      z.object({
        citation: z.string().nullable(),
        url: z.string().nullable(),
        publicationDate: z.string().nullable(),
      })
    )
    .default([]),
});
export type PublicProblem = z.infer<typeof publicProblemSchema>;

export const publicSolutionSchema = contentCardSchema.extend({
  problemSlug: z.string().nullable(),
  solutionType: z.string().nullable(),
  status: z.string(),
});
export type PublicSolution = z.infer<typeof publicSolutionSchema>;

export const publicPolicyPaperSchema = contentCardSchema.extend({
  policyStatus: z.enum(["draft", "consultation", "final", "published"]),
  consultationDeadline: z.string().nullable(),
  finalDocumentUrl: z.string().nullable(),
});
export type PublicPolicyPaper = z.infer<typeof publicPolicyPaperSchema>;
