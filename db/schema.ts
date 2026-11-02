import { index, integer, primaryKey, real, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
export const submissions=pgTable("submissions",{id:serial("id").primaryKey(),kind:text("kind").notNull(),name:text("name"),email:text("email"),phone:text("phone"),governorate:text("governorate"),profession:text("profession"),participationType:text("participation_type"),linkedin:text("linkedin"),metadata:text("metadata").notNull().default("{}"),body:text("body").notNull(),status:text("status").notNull().default("new"),createdAt:text("created_at").notNull()},t=>[index("idx_submissions_kind_status_created").on(t.kind,t.status,t.createdAt)]);
export const content=pgTable("content",{id:serial("id").primaryKey(),type:text("type").notNull(),title:text("title").notNull(),summary:text("summary").notNull(),publishedAt:text("published_at").notNull(),status:text("status").notNull().default("draft")});
export const portalContent=pgTable("portal_content",{id:serial("id").primaryKey(),type:text("type").notNull(),slug:text("slug").notNull(),locale:text("locale").notNull().default("ar"),title:text("title").notNull(),excerpt:text("excerpt").notNull(),body:text("body").notNull(),category:text("category").notNull().default("عام"),tags:text("tags").notNull().default("[]"),coverImage:text("cover_image"),status:text("status").notNull().default("draft"),featured:integer("featured").notNull().default(0),publishedAt:text("published_at"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("idx_portal_content_slug_locale").on(t.slug,t.locale),index("idx_portal_content_type_status_published").on(t.type,t.status,t.publishedAt)]);
export const mediaAssets=pgTable("media_assets",{id:serial("id").primaryKey(),kind:text("kind").notNull(),title:text("title").notNull(),url:text("url").notNull(),alt:text("alt"),createdAt:text("created_at").notNull()});
export const knowledgeEntries=pgTable("knowledge_entries",{id:serial("id").primaryKey(),question:text("question").notNull(),answer:text("answer").notNull(),status:text("status").notNull().default("published"),updatedAt:text("updated_at").notNull()});
export const adminUsers=pgTable("admin_users",{id:serial("id").primaryKey(),userId:text("user_id"),email:text("email").notNull(),role:text("role").notNull().default("editor"),createdAt:text("created_at").notNull()},t=>[uniqueIndex("idx_admin_users_email").on(t.email)]);

// ============================================================================
// Backend overhaul schema (ELADL_PORTAL_BACKEND_IMPLEMENTATION_PROMPT.md).
// Tables above this line are the original trial-era tables and are kept for
// backward compatibility with the existing /api/* routes during migration.
// Everything below is the canonical production data model. No .references()
// FK helpers are used anywhere in this file (matching the convention already
// established above); referential integrity is enforced in the service layer.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Identity & governance
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    status: text("status").notNull().default("invited"), // invited|active|suspended|deleted
    locale: text("locale").notNull().default("ar"),
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_users_email").on(t.email)]
);

export const roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_roles_key").on(t.key)]
);

export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    description: text("description"),
  },
  (t) => [uniqueIndex("idx_permissions_key").on(t.key)]
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    roleId: integer("role_id").notNull(),
    assignedAt: text("assigned_at").notNull(),
  },
  (t) => [uniqueIndex("idx_user_roles_pair").on(t.userId, t.roleId)]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id").notNull(),
    permissionId: integer("permission_id").notNull(),
  },
  (t) => [uniqueIndex("idx_role_permissions_pair").on(t.roleId, t.permissionId)]
);

/**
 * @deprecated Superseded by `authSessions` (Auth.js v5 database sessions, see below). Kept in
 * the schema rather than dropped so no forward migration needs to reconcile historical rows;
 * nothing in the application writes to this table anymore.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    csrfSecret: text("csrf_secret").notNull(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [uniqueIndex("idx_sessions_token_hash").on(t.tokenHash), index("idx_sessions_user").on(t.userId)]
);

/**
 * @deprecated Superseded by `authVerificationTokens` (Auth.js v5's own magic-link token
 * table). Kept in the schema rather than dropped so no forward migration needs to reconcile
 * historical rows; nothing in the application writes to this table anymore.
 */
export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    purpose: text("purpose").notNull().default("login"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    requestIpHash: text("request_ip_hash"),
  },
  (t) => [uniqueIndex("idx_magic_link_token_hash").on(t.tokenHash), index("idx_magic_link_email_purpose").on(t.email, t.purpose)]
);

// ---------------------------------------------------------------------------
// 1b. Auth.js v5 (@auth/drizzle-adapter) tables — identity/session source of
// truth for staff sign-in. Kept as separate tables from the domain `users`
// table above (rather than replacing it) because dozens of tables elsewhere
// in this schema hold integer FK references to `users.id`
// (content_entries.authorId, audit_logs.actorUserId, case_assignments.userId,
// etc.); Auth.js's adapter expects a string/UUID user id. The link between
// the two systems is by email: `with-auth.ts` resolves the authenticated
// Auth.js identity's email to the matching domain `users` row to load
// RBAC roles/permissions. Column names here intentionally match
// @auth/drizzle-adapter's expected property names exactly (including the
// snake_case OAuth token fields on `authAccounts`) — the adapter's generated
// queries reference these JS property names directly.
// ---------------------------------------------------------------------------

export const authUsers = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
  },
  (t) => [uniqueIndex("idx_auth_users_email").on(t.email)]
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const authSessions = pgTable("auth_sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_audit_entity").on(t.entityType, t.entityId), index("idx_audit_actor_created").on(t.actorUserId, t.createdAt)]
);

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    updatedBy: integer("updated_by"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_settings_key").on(t.key)]
);

// ---------------------------------------------------------------------------
// 2. Publishing model
// ---------------------------------------------------------------------------

export const contentEntries = pgTable(
  "content_entries",
  {
    id: serial("id").primaryKey(),
    contentType: text("content_type").notNull(),
    canonicalSlug: text("canonical_slug").notNull(),
    locale: text("locale").notNull().default("ar"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    bodyRichtext: text("body_richtext").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: text("status").notNull().default("draft"), // draft|review|changes_requested|approved|scheduled|published|archived
    publishedAt: text("published_at"),
    scheduledAt: text("scheduled_at"),
    featured: integer("featured").notNull().default(0),
    coverAssetId: integer("cover_asset_id"),
    authorId: integer("author_id"),
    reviewerId: integer("reviewer_id"),
    deletedAt: text("deleted_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_content_entries_slug_locale").on(t.canonicalSlug, t.locale),
    index("idx_content_entries_type_status_published").on(t.contentType, t.status, t.publishedAt),
  ]
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    changeNote: text("change_note"),
    authorId: integer("author_id"),
    reviewedBy: integer("reviewed_by"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_content_revisions_entry").on(t.entryId, t.revisionNumber)]
);

export const contentTranslations = pgTable(
  "content_translations",
  {
    id: serial("id").primaryKey(),
    sourceEntryId: integer("source_entry_id").notNull(),
    targetLocale: text("target_locale").notNull(),
    targetEntryId: integer("target_entry_id"),
    translationStatus: text("translation_status").notNull().default("missing"), // missing|draft|in_review|published
    translatorId: integer("translator_id"),
    reviewerId: integer("reviewer_id"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_content_translations_source_locale").on(t.sourceEntryId, t.targetLocale)]
);

export const taxonomyTerms = pgTable(
  "taxonomy_terms",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // category|tag
    locale: text("locale").notNull().default("ar"),
    label: text("label").notNull(),
    slug: text("slug").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_taxonomy_terms_kind_slug_locale").on(t.kind, t.slug, t.locale)]
);

export const contentTaxonomyTerms = pgTable(
  "content_taxonomy_terms",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id").notNull(),
    termId: integer("term_id").notNull(),
  },
  (t) => [uniqueIndex("idx_content_taxonomy_terms_pair").on(t.entryId, t.termId)]
);

export const relatedContent = pgTable(
  "related_content",
  {
    id: serial("id").primaryKey(),
    sourceEntryId: integer("source_entry_id").notNull(),
    targetEntryId: integer("target_entry_id").notNull(),
    relationshipType: text("relationship_type").notNull().default("related"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("idx_related_content_triplet").on(t.sourceEntryId, t.targetEntryId, t.relationshipType)]
);

export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: serial("id").primaryKey(),
    locale: text("locale").notNull(),
    oldPath: text("old_path").notNull(),
    newPath: text("new_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_slug_redirects_locale_old_path").on(t.locale, t.oldPath)]
);

export const navigationItems = pgTable(
  "navigation_items",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(),
    locale: text("locale").notNull().default("ar"),
    href: text("href").notNull(),
    parentId: integer("parent_id"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    visibility: text("visibility").notNull().default("public"), // public|staff
    requiredPermission: text("required_permission"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_navigation_items_locale_parent").on(t.locale, t.parentId, t.sortOrder)]
);

// ---------------------------------------------------------------------------
// 3. Typed operational content
// ---------------------------------------------------------------------------

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    contentEntryId: integer("content_entry_id").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at"),
    timezone: text("timezone").notNull().default("Africa/Cairo"),
    format: text("format").notNull().default("in_person"), // in_person|online|hybrid
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    venueLat: real("venue_lat"),
    venueLng: real("venue_lng"),
    capacity: integer("capacity"),
    registrationMode: text("registration_mode").notNull().default("internal"), // internal|external|closed|not_required
    registrationOpenAt: text("registration_open_at"),
    registrationCloseAt: text("registration_close_at"),
    eventStatus: text("event_status").notNull().default("draft"), // draft|published|cancelled|completed
    externalRegistrationUrl: text("external_registration_url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_events_content_entry").on(t.contentEntryId), index("idx_events_starts_status").on(t.startsAt, t.eventStatus)]
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    contactId: integer("contact_id").notNull(),
    status: text("status").notNull().default("pending"), // pending|confirmed|waitlisted|cancelled|attended
    consent: integer("consent").notNull().default(0),
    answersJson: text("answers_json").notNull().default("{}"),
    source: text("source").notNull().default("web"),
    reference: text("reference").notNull(),
    staffNotes: text("staff_notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_event_registrations_event_contact").on(t.eventId, t.contactId),
    uniqueIndex("idx_event_registrations_reference").on(t.reference),
  ]
);

export const programDetails = pgTable(
  "program_details",
  {
    id: serial("id").primaryKey(),
    contentEntryId: integer("content_entry_id").notNull(),
    audience: text("audience"),
    eligibility: text("eligibility"),
    deliveryMode: text("delivery_mode"),
    applicationOpenAt: text("application_open_at"),
    applicationCloseAt: text("application_close_at"),
    capacity: integer("capacity"),
    applicationMode: text("application_mode").notNull().default("none"), // none|internal|external
    ownerUserId: integer("owner_user_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_program_details_content_entry").on(t.contentEntryId)]
);

export const programApplications = pgTable(
  "program_applications",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    contactId: integer("contact_id").notNull(),
    answersJson: text("answers_json").notNull().default("{}"),
    status: text("status").notNull().default("submitted"), // submitted|under_review|accepted|rejected|waitlisted
    reviewerId: integer("reviewer_id"),
    decisionReason: text("decision_reason"),
    reference: text("reference").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_program_applications_program_status").on(t.programId, t.status), uniqueIndex("idx_program_applications_reference").on(t.reference)]
);

export const opportunityDetails = pgTable(
  "opportunity_details",
  {
    id: serial("id").primaryKey(),
    contentEntryId: integer("content_entry_id").notNull(),
    provider: text("provider"),
    deadline: text("deadline"),
    eligibility: text("eligibility"),
    applicationUrl: text("application_url"),
    opportunityStatus: text("opportunity_status").notNull().default("open"), // open|closed|upcoming
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_opportunity_details_content_entry").on(t.contentEntryId)]
);

export const partners = pgTable(
  "partners",
  {
    id: serial("id").primaryKey(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en"),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    type: text("type").notNull().default("other"), // university|private_sector|investment_fund|incubator|tech_company|organization|other
    website: text("website"),
    logoAssetId: integer("logo_asset_id"),
    verificationStatus: text("verification_status").notNull().default("pending"), // pending|verified|rejected
    relationshipOwnerId: integer("relationship_owner_id"),
    status: text("status").notNull().default("draft"), // draft|published
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  }
);

export const partnershipRequests = pgTable(
  "partnership_requests",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id").notNull(),
    organizationName: text("organization_name").notNull(),
    proposal: text("proposal").notNull(),
    requestedScope: text("requested_scope"),
    status: text("status").notNull().default("new"), // new|in_review|accepted|declined|closed
    assignedTo: integer("assigned_to"),
    reference: text("reference").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_partnership_requests_reference").on(t.reference)]
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    contentEntryId: integer("content_entry_id"),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en"),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en"),
    biographyAr: text("biography_ar"),
    biographyEn: text("biography_en"),
    imageAssetId: integer("image_asset_id"),
    status: text("status").notNull().default("draft"), // draft|published
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  }
);

export const governorateProfiles = pgTable(
  "governorate_profiles",
  {
    id: serial("id").primaryKey(),
    governorate: text("governorate").notNull(),
    overviewAr: text("overview_ar"),
    overviewEn: text("overview_en"),
    localStatus: text("local_status").notNull().default("planned"), // planned|active|paused
    coordinatorContactId: integer("coordinator_contact_id"),
    coverageIndicatorsJson: text("coverage_indicators_json").notNull().default("{}"),
    status: text("status").notNull().default("draft"), // draft|published
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_governorate_profiles_name").on(t.governorate)]
);

export const organizationStructureNodes = pgTable(
  "organization_structure_nodes",
  {
    id: serial("id").primaryKey(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en"),
    parentId: integer("parent_id"),
    nodeType: text("node_type").notNull().default("unit"), // secretariat|office|advisor|coordinator|sector|governorate_office|unit
    sortOrder: integer("sort_order").notNull().default(0),
    teamMemberId: integer("team_member_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  }
);

// ---------------------------------------------------------------------------
// 4. Observatory & policy
// ---------------------------------------------------------------------------

export const problems = pgTable(
  "problems",
  {
    id: serial("id").primaryKey(),
    contentEntryId: integer("content_entry_id"),
    sector: text("sector"),
    governorate: text("governorate"),
    severity: text("severity").notNull().default("unknown"), // low|medium|high|unknown
    affectedGroup: text("affected_group"),
    problemStatus: text("problem_status").notNull().default("submitted"), // submitted|under_review|verified|published|rejected|archived
    sourceConfidence: text("source_confidence").notNull().default("unverified"), // unverified|verified_single_source|verified_multi_source
    visibility: text("visibility").notNull().default("private"), // private|public
    ownerUserId: integer("owner_user_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_problems_status_visibility").on(t.problemStatus, t.visibility)]
);

export const problemEvidence = pgTable(
  "problem_evidence",
  {
    id: serial("id").primaryKey(),
    problemId: integer("problem_id").notNull(),
    sourceType: text("source_type").notNull().default("report"), // report|news|submission|survey|other
    citation: text("citation"),
    url: text("url"),
    fileAssetId: integer("file_asset_id"),
    publicationDate: text("publication_date"),
    notes: text("notes"),
    verificationStatus: text("verification_status").notNull().default("unverified"), // unverified|verified|rejected
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_problem_evidence_problem").on(t.problemId)]
);

export const proposedSolutions = pgTable(
  "proposed_solutions",
  {
    id: serial("id").primaryKey(),
    problemId: integer("problem_id").notNull(),
    contentEntryId: integer("content_entry_id"),
    solutionType: text("solution_type"),
    feasibility: text("feasibility").notNull().default("unassessed"), // unassessed|low|medium|high
    estimatedTimeframe: text("estimated_timeframe"),
    estimatedBudgetRange: text("estimated_budget_range"),
    status: text("status").notNull().default("draft"), // draft|proposed|approved|in_progress|completed|rejected
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_proposed_solutions_problem").on(t.problemId)]
);

export const solutionPartners = pgTable(
  "solution_partners",
  {
    id: serial("id").primaryKey(),
    solutionId: integer("solution_id").notNull(),
    partnerId: integer("partner_id"),
    candidateName: text("candidate_name"),
    relationshipStatus: text("relationship_status").notNull().default("candidate"), // candidate|contacted|committed|declined
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_solution_partners_solution").on(t.solutionId)]
);

export const policyPapers = pgTable(
  "policy_papers",
  {
    id: serial("id").primaryKey(),
    contentEntryId: integer("content_entry_id").notNull(),
    policyStatus: text("policy_status").notNull().default("draft"), // draft|consultation|final|published
    consultationDeadline: text("consultation_deadline"),
    finalDocumentAssetId: integer("final_document_asset_id"),
    approvedBy: integer("approved_by"),
    approvedAt: text("approved_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_policy_papers_content_entry").on(t.contentEntryId)]
);

export const problemUpdates = pgTable(
  "problem_updates",
  {
    id: serial("id").primaryKey(),
    problemId: integer("problem_id").notNull(),
    statusChange: text("status_change"),
    publicUpdateText: text("public_update_text"),
    privateNote: text("private_note"),
    actorUserId: integer("actor_user_id"),
    visibility: text("visibility").notNull().default("internal"), // internal|public
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_problem_updates_problem").on(t.problemId, t.createdAt)]
);

// ---------------------------------------------------------------------------
// 5. Participation, communication, CRM workflow
// ---------------------------------------------------------------------------

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    governorate: text("governorate"),
    profession: text("profession"),
    organization: text("organization"),
    linkedin: text("linkedin"),
    consentAcceptedAt: text("consent_accepted_at"),
    consentVersion: text("consent_version"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_contacts_email").on(t.email)]
);

export const intakeCases = pgTable(
  "intake_cases",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // join|volunteer|idea|problem|proposal|contact|partnership
    contactId: integer("contact_id").notNull(),
    status: text("status").notNull().default("new"), // new|triaged|assigned|in_review|action_taken|closed|archived
    priority: text("priority").notNull().default("normal"), // low|normal|high|urgent
    assignedTo: integer("assigned_to"),
    reference: text("reference").notNull(),
    sourceRoute: text("source_route"),
    consent: integer("consent").notNull().default(0),
    ipHash: text("ip_hash"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_intake_cases_kind_status_created").on(t.kind, t.status, t.createdAt), uniqueIndex("idx_intake_cases_reference").on(t.reference)]
);

export const intakeCaseDetails = pgTable(
  "intake_case_details",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").notNull(),
    answersJson: text("answers_json").notNull().default("{}"),
    narrativeBody: text("narrative_body").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_intake_case_details_case").on(t.caseId)]
);

export const caseStatusHistory = pgTable(
  "case_status_history",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    actorUserId: integer("actor_user_id"),
    visibility: text("visibility").notNull().default("internal"), // internal|public
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_case_status_history_case").on(t.caseId, t.createdAt)]
);

export const caseAssignments = pgTable(
  "case_assignments",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").notNull(),
    userId: integer("user_id").notNull(),
    assignedBy: integer("assigned_by"),
    assignedAt: text("assigned_at").notNull(),
  },
  (t) => [index("idx_case_assignments_case").on(t.caseId)]
);

export const caseComments = pgTable(
  "case_comments",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").notNull(),
    authorUserId: integer("author_user_id"),
    body: text("body").notNull(),
    internal: integer("internal").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_case_comments_case").on(t.caseId, t.createdAt)]
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id"),
    consentType: text("consent_type").notNull(),
    consentVersion: text("consent_version").notNull(),
    acceptedAt: text("accepted_at").notNull(),
    ipHash: text("ip_hash"),
    withdrawalAt: text("withdrawal_at"),
  },
  (t) => [index("idx_consent_records_contact").on(t.contactId)]
);

// ---------------------------------------------------------------------------
// 6. Media, documents, notifications, search, assistant, analytics
// ---------------------------------------------------------------------------

export const storageAssets = pgTable(
  "storage_assets",
  {
    id: serial("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    altText: text("alt_text"),
    caption: text("caption"),
    rightsNote: text("rights_note"),
    processingStatus: text("processing_status").notNull().default("pending"), // pending|ready|failed
    createdBy: integer("created_by"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_storage_assets_object_key").on(t.objectKey)]
);

export const documentAssets = pgTable(
  "document_assets",
  {
    id: serial("id").primaryKey(),
    storageAssetId: integer("storage_asset_id").notNull(),
    title: text("title").notNull(),
    fileCategory: text("file_category").notNull().default("report"), // report|policy|guide|form|other
    language: text("language").notNull().default("ar"),
    publicationDate: text("publication_date"),
    downloadVisibility: text("download_visibility").notNull().default("public"), // public|staff
    scanStatus: text("scan_status").notNull().default("pending"), // pending|clean|flagged
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_document_assets_storage").on(t.storageAssetId)]
);

export const contentMedia = pgTable(
  "content_media",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id").notNull(),
    assetId: integer("asset_id").notNull(),
    placement: text("placement").notNull().default("body"), // cover|gallery|body|attachment
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("idx_content_media_triplet").on(t.entryId, t.assetId, t.placement)]
);

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    locale: text("locale").notNull().default("ar"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    active: integer("active").notNull().default(1),
    version: integer("version").notNull().default(1),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_notification_templates_code_locale").on(t.code, t.locale)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    recipientContactId: integer("recipient_contact_id"),
    recipientUserId: integer("recipient_user_id"),
    templateCode: text("template_code").notNull(),
    channel: text("channel").notNull().default("email"), // email|sms|internal
    payloadJson: text("payload_json").notNull().default("{}"),
    status: text("status").notNull().default("queued"), // queued|sent|failed|skipped
    providerId: text("provider_id"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_notifications_status_created").on(t.status, t.createdAt)]
);

export const searchIndexQueue = pgTable(
  "search_index_queue",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    locale: text("locale").notNull().default("ar"),
    operation: text("operation").notNull().default("upsert"), // upsert|delete
    status: text("status").notNull().default("pending"), // pending|processing|done|failed
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull(),
    processedAt: text("processed_at"),
  },
  (t) => [index("idx_search_index_queue_status_created").on(t.status, t.createdAt)]
);

export const assistantKnowledgeSources = pgTable(
  "assistant_knowledge_sources",
  {
    id: serial("id").primaryKey(),
    sourceType: text("source_type").notNull().default("content"), // content|document|faq
    entryId: integer("entry_id"),
    documentAssetId: integer("document_asset_id"),
    locale: text("locale").notNull().default("ar"),
    approved: integer("approved").notNull().default(0),
    checksum: text("checksum"),
    ingestionStatus: text("ingestion_status").notNull().default("pending"), // pending|ingested|failed|stale
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_assistant_knowledge_sources_approved").on(t.approved, t.ingestionStatus)]
);

export const assistantKnowledgeChunks = pgTable(
  "assistant_knowledge_chunks",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").notNull(),
    chunkText: text("chunk_text").notNull(),
    chunkHash: text("chunk_hash").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (t) => [index("idx_assistant_knowledge_chunks_source").on(t.sourceId), index("idx_assistant_knowledge_chunks_hash").on(t.chunkHash)]
);

export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: serial("id").primaryKey(),
    sessionRef: text("session_ref").notNull(),
    userId: integer("user_id"),
    locale: text("locale").notNull().default("ar"),
    contextRoute: text("context_route"),
    status: text("status").notNull().default("active"), // active|closed
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_assistant_conversations_session").on(t.sessionRef)]
);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    role: text("role").notNull(), // user|assistant
    content: text("content").notNull(),
    citationsJson: text("citations_json").notNull().default("[]"),
    feedback: text("feedback"), // up|down|null
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_assistant_messages_conversation").on(t.conversationId, t.createdAt)]
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    eventName: text("event_name").notNull(),
    contentEntryId: integer("content_entry_id"),
    pagePath: text("page_path"),
    sessionHash: text("session_hash"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_analytics_events_name_created").on(t.eventName, t.createdAt)]
);

// ---------------------------------------------------------------------------
// 7. Infrastructure: rate limiting, idempotency, outbox (D1-backed substitute
//    for Cloudflare Queues until that binding is provisioned for this project)
// ---------------------------------------------------------------------------

/**
 * @deprecated Rate limiting now goes through Redis (`server/services/rate-limit-service.ts`,
 * `ioredis` INCR/EXPIRE) instead of a Postgres table. Kept in the schema rather than dropped
 * so no forward migration needs to reconcile historical rows; nothing in the application
 * writes to this table anymore.
 */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: serial("id").primaryKey(),
    bucketKey: text("bucket_key").notNull(),
    windowStart: text("window_start").notNull(),
    count: integer("count").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_rate_limit_events_bucket_window").on(t.bucketKey, t.windowStart)]
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: serial("id").primaryKey(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    responseJson: text("response_json"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_idempotency_keys_scope_key").on(t.scope, t.key)]
);

/**
 * @deprecated Background jobs now go through BullMQ + Redis (`server/jobs/queue.ts`,
 * `server/jobs/worker.ts`) instead of a Postgres-table outbox. Kept in the schema rather than
 * dropped so no forward migration needs to reconcile historical rows; nothing in the
 * application writes to this table anymore.
 */
export const outboxJobs = pgTable(
  "outbox_jobs",
  {
    id: serial("id").primaryKey(),
    jobType: text("job_type").notNull(), // notification|search_index|knowledge_ingest
    payloadJson: text("payload_json").notNull().default("{}"),
    status: text("status").notNull().default("pending"), // pending|processing|done|failed
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    availableAt: text("available_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_outbox_jobs_status_available").on(t.status, t.availableAt)]
);

// ============================================================================
// Section 15 additive schema (ELADL_PORTAL_BACKEND_IMPLEMENTATION_PROMPT (2).md
// §15): party membership application lifecycle, branches, fees, cards, and the
// Issue Intelligence / monitoring engine. Purely additive — does not touch or
// replace the existing Secretariat participation flows (intake_cases etc.)
// above. Membership requires its own explicit application + consent path.
// ============================================================================

// ---------------------------------------------------------------------------
// 8. Membership: branches, fees, applications, cards
// ---------------------------------------------------------------------------

export const partyBranches = pgTable(
  "party_branches",
  {
    id: serial("id").primaryKey(),
    governorate: text("governorate").notNull(),
    slug: text("slug").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en"),
    addressAr: text("address_ar"),
    addressEn: text("address_en"),
    lat: real("lat"),
    lng: real("lng"),
    contactsJson: text("contacts_json").notNull().default("{}"),
    officeHoursJson: text("office_hours_json").notNull().default("{}"),
    completionServicesJson: text("completion_services_json").notNull().default("[]"),
    active: integer("active").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_party_branches_slug").on(t.slug)]
);

export const membershipFeeRules = pgTable(
  "membership_fee_rules",
  {
    id: serial("id").primaryKey(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("EGP"),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    waiverRulesJson: text("waiver_rules_json").notNull().default("{}"),
    active: integer("active").notNull().default(1),
    setBy: integer("set_by"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_membership_fee_rules_active_from").on(t.active, t.effectiveFrom)]
);

export const membershipApplications = pgTable(
  "membership_applications",
  {
    id: serial("id").primaryKey(),
    publicReference: text("public_reference").notNull(),
    contactId: integer("contact_id").notNull(),
    applicationStatus: text("application_status").notNull().default("draft"),
    // draft|submitted|under_review|requires_action|accepted_in_principle|rejected|
    // branch_completion_pending|fee_pending|documents_pending|appointment_booked|
    // completed|card_issued|active|suspended|expired|revoked
    requestedGovernorate: text("requested_governorate"),
    recommendedBranchId: integer("recommended_branch_id"),
    reviewOwnerId: integer("review_owner_id"),
    submittedAt: text("submitted_at"),
    reviewedAt: text("reviewed_at"),
    decisionAt: text("decision_at"),
    paymentStatus: text("payment_status").notNull().default("not_applicable"), // not_applicable|pay_at_branch_pending|paid|waived
    completionStatus: text("completion_status").notNull().default("not_started"), // not_started|in_progress|completed
    consentVersion: text("consent_version"),
    verificationTokenHash: text("verification_token_hash"),
    verificationExpiresAt: text("verification_expires_at"),
    idempotencyKey: text("idempotency_key"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_membership_applications_reference").on(t.publicReference),
    index("idx_membership_applications_status").on(t.applicationStatus),
    uniqueIndex("idx_membership_applications_idempotency").on(t.idempotencyKey),
  ]
);

export const membershipApplicationProfile = pgTable(
  "membership_application_profile",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    legalName: text("legal_name"),
    dateOfBirth: text("date_of_birth"),
    occupation: text("occupation"),
    education: text("education"),
    addressJson: text("address_json").notNull().default("{}"),
    // Legal-ID fields are disabled (null) unless the Secretariat explicitly approves collecting
    // them; the admin-configurable toggle lives in `settings` (key: membership.collect_legal_id).
    legalIdNumber: text("legal_id_number"),
    answersJson: text("answers_json").notNull().default("{}"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_membership_application_profile_application").on(t.applicationId)]
);

export const membershipApplicationFiles = pgTable(
  "membership_application_files",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    storageAssetId: integer("storage_asset_id").notNull(),
    fileType: text("file_type").notNull(), // profile_photo|identity_document|supporting_document
    verificationStatus: text("verification_status").notNull().default("pending"), // pending|verified|rejected
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_membership_application_files_application").on(t.applicationId)]
);

export const membershipStatusHistory = pgTable(
  "membership_status_history",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    status: text("status").notNull(),
    publicMessage: text("public_message"),
    internalNote: text("internal_note"),
    actorUserId: integer("actor_user_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_membership_status_history_application").on(t.applicationId, t.createdAt)]
);

export const membershipActionRequests = pgTable(
  "membership_action_requests",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    requestedFieldsJson: text("requested_fields_json").notNull().default("[]"),
    publicInstructions: text("public_instructions").notNull(),
    dueDate: text("due_date"),
    resolvedAt: text("resolved_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_membership_action_requests_application").on(t.applicationId)]
);

export const membershipCompletionAppointments = pgTable(
  "membership_completion_appointments",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    branchId: integer("branch_id").notNull(),
    scheduledAt: text("scheduled_at"),
    status: text("status").notNull().default("pending"), // pending|confirmed|attended|no_show|cancelled
    attendance: text("attendance"),
    staffNotes: text("staff_notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_membership_completion_appointments_application").on(t.applicationId)]
);

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    membershipNumber: text("membership_number").notNull(),
    status: text("status").notNull().default("active"), // active|suspended|expired|revoked
    issuedAt: text("issued_at").notNull(),
    expiresAt: text("expires_at"),
    branchId: integer("branch_id").notNull(),
    completedAt: text("completed_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_memberships_number").on(t.membershipNumber),
    uniqueIndex("idx_memberships_application").on(t.applicationId),
  ]
);

export const membershipCardTemplates = pgTable(
  "membership_card_templates",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    version: integer("version").notNull(),
    layoutConfigJson: text("layout_config_json").notNull().default("{}"),
    allowedPublicFieldsJson: text("allowed_public_fields_json").notNull().default("[]"),
    locale: text("locale").notNull().default("ar"),
    active: integer("active").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_membership_card_templates_name_version").on(t.name, t.version)]
);

export const membershipCards = pgTable(
  "membership_cards",
  {
    id: serial("id").primaryKey(),
    membershipId: integer("membership_id").notNull(),
    templateVersion: integer("template_version").notNull(),
    renderAssetId: integer("render_asset_id"),
    publicShareTokenHash: text("public_share_token_hash"),
    shareEnabled: integer("share_enabled").notNull().default(0),
    issuedAt: text("issued_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [
    uniqueIndex("idx_membership_cards_membership").on(t.membershipId),
    uniqueIndex("idx_membership_cards_share_token_hash").on(t.publicShareTokenHash),
  ]
);

export const membershipShareEvents = pgTable(
  "membership_share_events",
  {
    id: serial("id").primaryKey(),
    membershipCardId: integer("membership_card_id").notNull(),
    channel: text("channel").notNull().default("link"), // link|whatsapp|other
    anonymizedAttribution: text("anonymized_attribution"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_membership_share_events_card").on(t.membershipCardId)]
);

// ---------------------------------------------------------------------------
// 9. Issue Intelligence / monitoring engine + discussion topics
// ---------------------------------------------------------------------------

export const monitoringSources = pgTable(
  "monitoring_sources",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull().default("manual"), // rss|official_website|approved_api|manual
    configSecretRef: text("config_secret_ref"),
    topicScope: text("topic_scope"),
    language: text("language").notNull().default("ar"),
    legalReviewStatus: text("legal_review_status").notNull().default("pending"), // pending|approved|rejected
    active: integer("active").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  }
);

export const monitoringIngestions = pgTable(
  "monitoring_ingestions",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").notNull(),
    externalUrl: text("external_url"),
    externalId: text("external_id"),
    headline: text("headline").notNull(),
    permittedExcerpt: text("permitted_excerpt"),
    publicationDate: text("publication_date"),
    rawMetadataHash: text("raw_metadata_hash"),
    ingestionStatus: text("ingestion_status").notNull().default("candidate"), // candidate|reviewed|promoted|rejected|duplicate
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_monitoring_ingestions_source_status").on(t.sourceId, t.ingestionStatus)]
);

export const monitoringItems = pgTable(
  "monitoring_items",
  {
    id: serial("id").primaryKey(),
    ingestionId: integer("ingestion_id").notNull(),
    itemType: text("item_type").notNull().default("news"), // news|report|issue|data_point
    relevanceScore: integer("relevance_score").notNull().default(0),
    sector: text("sector"),
    governorate: text("governorate"),
    verificationState: text("verification_state").notNull().default("unverified"), // unverified|verified|rejected
    analystOwnerId: integer("analyst_owner_id"),
    visibility: text("visibility").notNull().default("private"), // private|public
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_monitoring_items_visibility_state").on(t.visibility, t.verificationState)]
);

export const monitoringItemLinks = pgTable(
  "monitoring_item_links",
  {
    id: serial("id").primaryKey(),
    monitoringItemId: integer("monitoring_item_id").notNull(),
    linkedType: text("linked_type").notNull(), // problem|solution|policy|report|event|program|discussion_topic
    linkedId: integer("linked_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_monitoring_item_links_item").on(t.monitoringItemId)]
);

export const discussionTopics = pgTable(
  "discussion_topics",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    linkedMonitoringItemId: integer("linked_monitoring_item_id"),
    publicStatus: text("public_status").notNull().default("draft"), // draft|open|closed|archived
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    moderationPolicy: text("moderation_policy").notNull().default("form_only"), // form_only|moderated_comments
    outcomeContentEntryId: integer("outcome_content_entry_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_discussion_topics_status").on(t.publicStatus)]
);
