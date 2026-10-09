import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const submissions=sqliteTable("submissions",{id:integer("id").primaryKey({autoIncrement:true}),kind:text("kind").notNull(),name:text("name"),email:text("email"),phone:text("phone"),governorate:text("governorate"),profession:text("profession"),participationType:text("participation_type"),linkedin:text("linkedin"),metadata:text("metadata").notNull().default("{}"),body:text("body").notNull(),status:text("status").notNull().default("new"),createdAt:text("created_at").notNull()},t=>[index("idx_submissions_kind_status_created").on(t.kind,t.status,t.createdAt)]);
export const content=sqliteTable("content",{id:integer("id").primaryKey({autoIncrement:true}),type:text("type").notNull(),title:text("title").notNull(),summary:text("summary").notNull(),publishedAt:text("published_at").notNull(),status:text("status").notNull().default("draft")});
export const portalContent=sqliteTable("portal_content",{id:integer("id").primaryKey({autoIncrement:true}),type:text("type").notNull(),slug:text("slug").notNull(),locale:text("locale").notNull().default("ar"),title:text("title").notNull(),excerpt:text("excerpt").notNull(),body:text("body").notNull(),category:text("category").notNull().default("عام"),tags:text("tags").notNull().default("[]"),coverImage:text("cover_image"),status:text("status").notNull().default("draft"),featured:integer("featured").notNull().default(0),publishedAt:text("published_at"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("idx_portal_content_slug_locale").on(t.slug,t.locale),index("idx_portal_content_type_status_published").on(t.type,t.status,t.publishedAt)]);
export const mediaAssets=sqliteTable("media_assets",{id:integer("id").primaryKey({autoIncrement:true}),kind:text("kind").notNull(),title:text("title").notNull(),url:text("url").notNull(),alt:text("alt"),createdAt:text("created_at").notNull()});
export const knowledgeEntries=sqliteTable("knowledge_entries",{id:integer("id").primaryKey({autoIncrement:true}),question:text("question").notNull(),answer:text("answer").notNull(),status:text("status").notNull().default("published"),updatedAt:text("updated_at").notNull()});
export const adminUsers=sqliteTable("admin_users",{id:integer("id").primaryKey({autoIncrement:true}),userId:text("user_id"),email:text("email").notNull(),role:text("role").notNull().default("editor"),createdAt:text("created_at").notNull()},t=>[uniqueIndex("idx_admin_users_email").on(t.email)]);

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

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const roles = sqliteTable(
  "roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_roles_key").on(t.key)]
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    description: text("description"),
  },
  (t) => [uniqueIndex("idx_permissions_key").on(t.key)]
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    roleId: integer("role_id").notNull(),
    assignedAt: text("assigned_at").notNull(),
  },
  (t) => [uniqueIndex("idx_user_roles_pair").on(t.userId, t.roleId)]
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roleId: integer("role_id").notNull(),
    permissionId: integer("permission_id").notNull(),
  },
  (t) => [uniqueIndex("idx_role_permissions_pair").on(t.roleId, t.permissionId)]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const magicLinkTokens = sqliteTable(
  "magic_link_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const settings = sqliteTable(
  "settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const contentEntries = sqliteTable(
  "content_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const contentRevisions = sqliteTable(
  "content_revisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const contentTranslations = sqliteTable(
  "content_translations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const taxonomyTerms = sqliteTable(
  "taxonomy_terms",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull(), // category|tag
    locale: text("locale").notNull().default("ar"),
    label: text("label").notNull(),
    slug: text("slug").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_taxonomy_terms_kind_slug_locale").on(t.kind, t.slug, t.locale)]
);

export const contentTaxonomyTerms = sqliteTable(
  "content_taxonomy_terms",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryId: integer("entry_id").notNull(),
    termId: integer("term_id").notNull(),
  },
  (t) => [uniqueIndex("idx_content_taxonomy_terms_pair").on(t.entryId, t.termId)]
);

export const relatedContent = sqliteTable(
  "related_content",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceEntryId: integer("source_entry_id").notNull(),
    targetEntryId: integer("target_entry_id").notNull(),
    relationshipType: text("relationship_type").notNull().default("related"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("idx_related_content_triplet").on(t.sourceEntryId, t.targetEntryId, t.relationshipType)]
);

export const slugRedirects = sqliteTable(
  "slug_redirects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    locale: text("locale").notNull(),
    oldPath: text("old_path").notNull(),
    newPath: text("new_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_slug_redirects_locale_old_path").on(t.locale, t.oldPath)]
);

export const navigationItems = sqliteTable(
  "navigation_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const eventRegistrations = sqliteTable(
  "event_registrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const programDetails = sqliteTable(
  "program_details",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const programApplications = sqliteTable(
  "program_applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const opportunityDetails = sqliteTable(
  "opportunity_details",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const partners = sqliteTable(
  "partners",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const partnershipRequests = sqliteTable(
  "partnership_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const teamMembers = sqliteTable(
  "team_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const governorateProfiles = sqliteTable(
  "governorate_profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const organizationStructureNodes = sqliteTable(
  "organization_structure_nodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const problems = sqliteTable(
  "problems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const problemEvidence = sqliteTable(
  "problem_evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const proposedSolutions = sqliteTable(
  "proposed_solutions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const solutionPartners = sqliteTable(
  "solution_partners",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    solutionId: integer("solution_id").notNull(),
    partnerId: integer("partner_id"),
    candidateName: text("candidate_name"),
    relationshipStatus: text("relationship_status").notNull().default("candidate"), // candidate|contacted|committed|declined
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_solution_partners_solution").on(t.solutionId)]
);

export const policyPapers = sqliteTable(
  "policy_papers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const problemUpdates = sqliteTable(
  "problem_updates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const intakeCases = sqliteTable(
  "intake_cases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const intakeCaseDetails = sqliteTable(
  "intake_case_details",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").notNull(),
    answersJson: text("answers_json").notNull().default("{}"),
    narrativeBody: text("narrative_body").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_intake_case_details_case").on(t.caseId)]
);

export const caseStatusHistory = sqliteTable(
  "case_status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    actorUserId: integer("actor_user_id"),
    visibility: text("visibility").notNull().default("internal"), // internal|public
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_case_status_history_case").on(t.caseId, t.createdAt)]
);

export const caseAssignments = sqliteTable(
  "case_assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").notNull(),
    userId: integer("user_id").notNull(),
    assignedBy: integer("assigned_by"),
    assignedAt: text("assigned_at").notNull(),
  },
  (t) => [index("idx_case_assignments_case").on(t.caseId)]
);

export const caseComments = sqliteTable(
  "case_comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").notNull(),
    authorUserId: integer("author_user_id"),
    body: text("body").notNull(),
    internal: integer("internal").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_case_comments_case").on(t.caseId, t.createdAt)]
);

export const consentRecords = sqliteTable(
  "consent_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const storageAssets = sqliteTable(
  "storage_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const documentAssets = sqliteTable(
  "document_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const contentMedia = sqliteTable(
  "content_media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryId: integer("entry_id").notNull(),
    assetId: integer("asset_id").notNull(),
    placement: text("placement").notNull().default("body"), // cover|gallery|body|attachment
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("idx_content_media_triplet").on(t.entryId, t.assetId, t.placement)]
);

export const notificationTemplates = sqliteTable(
  "notification_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const searchIndexQueue = sqliteTable(
  "search_index_queue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const assistantKnowledgeSources = sqliteTable(
  "assistant_knowledge_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const assistantKnowledgeChunks = sqliteTable(
  "assistant_knowledge_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id").notNull(),
    chunkText: text("chunk_text").notNull(),
    chunkHash: text("chunk_hash").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (t) => [index("idx_assistant_knowledge_chunks_source").on(t.sourceId), index("idx_assistant_knowledge_chunks_hash").on(t.chunkHash)]
);

export const assistantConversations = sqliteTable(
  "assistant_conversations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const assistantMessages = sqliteTable(
  "assistant_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    conversationId: integer("conversation_id").notNull(),
    role: text("role").notNull(), // user|assistant
    content: text("content").notNull(),
    citationsJson: text("citations_json").notNull().default("[]"),
    feedback: text("feedback"), // up|down|null
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_assistant_messages_conversation").on(t.conversationId, t.createdAt)]
);

export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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

export const rateLimitEvents = sqliteTable(
  "rate_limit_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bucketKey: text("bucket_key").notNull(),
    windowStart: text("window_start").notNull(),
    count: integer("count").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_rate_limit_events_bucket_window").on(t.bucketKey, t.windowStart)]
);

export const idempotencyKeys = sqliteTable(
  "idempotency_keys",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    responseJson: text("response_json"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_idempotency_keys_scope_key").on(t.scope, t.key)]
);

export const outboxJobs = sqliteTable(
  "outbox_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
