CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"content_entry_id" integer,
	"page_path" text,
	"session_hash" text,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_ref" text NOT NULL,
	"user_id" integer,
	"locale" text DEFAULT 'ar' NOT NULL,
	"context_route" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_hash" text NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_knowledge_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text DEFAULT 'content' NOT NULL,
	"entry_id" integer,
	"document_asset_id" integer,
	"locale" text DEFAULT 'ar' NOT NULL,
	"approved" integer DEFAULT 0 NOT NULL,
	"checksum" text,
	"ingestion_status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations_json" text DEFAULT '[]' NOT NULL,
	"feedback" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before_json" text,
	"after_json" text,
	"request_id" text,
	"ip_hash" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"author_user_id" integer,
	"body" text NOT NULL,
	"internal" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"actor_user_id" integer,
	"visibility" text DEFAULT 'internal' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer,
	"consent_type" text NOT NULL,
	"consent_version" text NOT NULL,
	"accepted_at" text NOT NULL,
	"ip_hash" text,
	"withdrawal_at" text
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"governorate" text,
	"profession" text,
	"organization" text,
	"linkedin" text,
	"consent_accepted_at" text,
	"consent_version" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"published_at" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"canonical_slug" text NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body_richtext" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" text,
	"scheduled_at" text,
	"featured" integer DEFAULT 0 NOT NULL,
	"cover_asset_id" integer,
	"author_id" integer,
	"reviewer_id" integer,
	"deleted_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"placement" text DEFAULT 'body' NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot_json" text NOT NULL,
	"change_note" text,
	"author_id" integer,
	"reviewed_by" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_taxonomy_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"term_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_entry_id" integer NOT NULL,
	"target_locale" text NOT NULL,
	"target_entry_id" integer,
	"translation_status" text DEFAULT 'missing' NOT NULL,
	"translator_id" integer,
	"reviewer_id" integer,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"linked_monitoring_item_id" integer,
	"public_status" text DEFAULT 'draft' NOT NULL,
	"starts_at" text,
	"ends_at" text,
	"moderation_policy" text DEFAULT 'form_only' NOT NULL,
	"outcome_content_entry_id" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_asset_id" integer NOT NULL,
	"title" text NOT NULL,
	"file_category" text DEFAULT 'report' NOT NULL,
	"language" text DEFAULT 'ar' NOT NULL,
	"publication_date" text,
	"download_visibility" text DEFAULT 'public' NOT NULL,
	"scan_status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"consent" integer DEFAULT 0 NOT NULL,
	"answers_json" text DEFAULT '{}' NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"reference" text NOT NULL,
	"staff_notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_entry_id" integer NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text,
	"timezone" text DEFAULT 'Africa/Cairo' NOT NULL,
	"format" text DEFAULT 'in_person' NOT NULL,
	"venue_name" text,
	"venue_address" text,
	"venue_lat" real,
	"venue_lng" real,
	"capacity" integer,
	"registration_mode" text DEFAULT 'internal' NOT NULL,
	"registration_open_at" text,
	"registration_close_at" text,
	"event_status" text DEFAULT 'draft' NOT NULL,
	"external_registration_url" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governorate_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"governorate" text NOT NULL,
	"overview_ar" text,
	"overview_en" text,
	"local_status" text DEFAULT 'planned' NOT NULL,
	"coordinator_contact_id" integer,
	"coverage_indicators_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"response_json" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_case_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"answers_json" text DEFAULT '{}' NOT NULL,
	"narrative_body" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"contact_id" integer NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_to" integer,
	"reference" text NOT NULL,
	"source_route" text,
	"consent" integer DEFAULT 0 NOT NULL,
	"ip_hash" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text DEFAULT 'login' NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	"consumed_at" text,
	"request_ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_action_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"requested_fields_json" text DEFAULT '[]' NOT NULL,
	"public_instructions" text NOT NULL,
	"due_date" text,
	"resolved_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_application_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"storage_asset_id" integer NOT NULL,
	"file_type" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_application_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"legal_name" text,
	"date_of_birth" text,
	"occupation" text,
	"education" text,
	"address_json" text DEFAULT '{}' NOT NULL,
	"legal_id_number" text,
	"answers_json" text DEFAULT '{}' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_reference" text NOT NULL,
	"contact_id" integer NOT NULL,
	"application_status" text DEFAULT 'draft' NOT NULL,
	"requested_governorate" text,
	"recommended_branch_id" integer,
	"review_owner_id" integer,
	"submitted_at" text,
	"reviewed_at" text,
	"decision_at" text,
	"payment_status" text DEFAULT 'not_applicable' NOT NULL,
	"completion_status" text DEFAULT 'not_started' NOT NULL,
	"consent_version" text,
	"verification_token_hash" text,
	"verification_expires_at" text,
	"idempotency_key" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_card_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"layout_config_json" text DEFAULT '{}' NOT NULL,
	"allowed_public_fields_json" text DEFAULT '[]' NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"active" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_id" integer NOT NULL,
	"template_version" integer NOT NULL,
	"render_asset_id" integer,
	"public_share_token_hash" text,
	"share_enabled" integer DEFAULT 0 NOT NULL,
	"issued_at" text NOT NULL,
	"revoked_at" text
);
--> statement-breakpoint
CREATE TABLE "membership_completion_appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"scheduled_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attendance" text,
	"staff_notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_fee_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"waiver_rules_json" text DEFAULT '{}' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"set_by" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_share_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_card_id" integer NOT NULL,
	"channel" text DEFAULT 'link' NOT NULL,
	"anonymized_attribution" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"status" text NOT NULL,
	"public_message" text,
	"internal_note" text,
	"actor_user_id" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"membership_number" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" text NOT NULL,
	"expires_at" text,
	"branch_id" integer NOT NULL,
	"completed_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_ingestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_url" text,
	"external_id" text,
	"headline" text NOT NULL,
	"permitted_excerpt" text,
	"publication_date" text,
	"raw_metadata_hash" text,
	"ingestion_status" text DEFAULT 'candidate' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_item_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"monitoring_item_id" integer NOT NULL,
	"linked_type" text NOT NULL,
	"linked_id" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingestion_id" integer NOT NULL,
	"item_type" text DEFAULT 'news' NOT NULL,
	"relevance_score" integer DEFAULT 0 NOT NULL,
	"sector" text,
	"governorate" text,
	"verification_state" text DEFAULT 'unverified' NOT NULL,
	"analyst_owner_id" integer,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"config_secret_ref" text,
	"topic_scope" text,
	"language" text DEFAULT 'ar' NOT NULL,
	"legal_review_status" text DEFAULT 'pending' NOT NULL,
	"active" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"href" text NOT NULL,
	"parent_id" integer,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"required_permission" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_contact_id" integer,
	"recipient_user_id" integer,
	"template_code" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_entry_id" integer NOT NULL,
	"provider" text,
	"deadline" text,
	"eligibility" text,
	"application_url" text,
	"opportunity_status" text DEFAULT 'open' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_structure_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"parent_id" integer,
	"node_type" text DEFAULT 'unit' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"team_member_id" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"description_ar" text,
	"description_en" text,
	"type" text DEFAULT 'other' NOT NULL,
	"website" text,
	"logo_asset_id" integer,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"relationship_owner_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnership_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"organization_name" text NOT NULL,
	"proposal" text NOT NULL,
	"requested_scope" text,
	"status" text DEFAULT 'new' NOT NULL,
	"assigned_to" integer,
	"reference" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"governorate" text NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"address_ar" text,
	"address_en" text,
	"lat" real,
	"lng" real,
	"contacts_json" text DEFAULT '{}' NOT NULL,
	"office_hours_json" text DEFAULT '{}' NOT NULL,
	"completion_services_json" text DEFAULT '[]' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "policy_papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_entry_id" integer NOT NULL,
	"policy_status" text DEFAULT 'draft' NOT NULL,
	"consultation_deadline" text,
	"final_document_asset_id" integer,
	"approved_by" integer,
	"approved_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"category" text DEFAULT 'عام' NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"cover_image" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"featured" integer DEFAULT 0 NOT NULL,
	"published_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_id" integer NOT NULL,
	"source_type" text DEFAULT 'report' NOT NULL,
	"citation" text,
	"url" text,
	"file_asset_id" integer,
	"publication_date" text,
	"notes" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_id" integer NOT NULL,
	"status_change" text,
	"public_update_text" text,
	"private_note" text,
	"actor_user_id" integer,
	"visibility" text DEFAULT 'internal' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_entry_id" integer,
	"sector" text,
	"governorate" text,
	"severity" text DEFAULT 'unknown' NOT NULL,
	"affected_group" text,
	"problem_status" text DEFAULT 'submitted' NOT NULL,
	"source_confidence" text DEFAULT 'unverified' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"owner_user_id" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"answers_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewer_id" integer,
	"decision_reason" text,
	"reference" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_entry_id" integer NOT NULL,
	"audience" text,
	"eligibility" text,
	"delivery_mode" text,
	"application_open_at" text,
	"application_close_at" text,
	"capacity" integer,
	"application_mode" text DEFAULT 'none' NOT NULL,
	"owner_user_id" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposed_solutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_id" integer NOT NULL,
	"content_entry_id" integer,
	"solution_type" text,
	"feasibility" text DEFAULT 'unassessed' NOT NULL,
	"estimated_timeframe" text,
	"estimated_budget_range" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_key" text NOT NULL,
	"window_start" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_entry_id" integer NOT NULL,
	"target_entry_id" integer NOT NULL,
	"relationship_type" text DEFAULT 'related' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_index_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"operation" text DEFAULT 'upsert' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" text NOT NULL,
	"processed_at" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"csrf_secret" text NOT NULL,
	"ip_hash" text,
	"user_agent_hash" text,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value_json" text NOT NULL,
	"updated_by" integer,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"old_path" text NOT NULL,
	"new_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"solution_id" integer NOT NULL,
	"partner_id" integer,
	"candidate_name" text,
	"relationship_status" text DEFAULT 'candidate' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"alt_text" text,
	"caption" text,
	"rights_note" text,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"created_by" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"governorate" text,
	"profession" text,
	"participation_type" text,
	"linkedin" text,
	"metadata" text DEFAULT '{}' NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"label" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_entry_id" integer,
	"name_ar" text NOT NULL,
	"name_en" text,
	"title_ar" text NOT NULL,
	"title_en" text,
	"biography_ar" text,
	"biography_en" text,
	"image_asset_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"last_login_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_admin_users_email" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_name_created" ON "analytics_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "idx_assistant_conversations_session" ON "assistant_conversations" USING btree ("session_ref");--> statement-breakpoint
CREATE INDEX "idx_assistant_knowledge_chunks_source" ON "assistant_knowledge_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_assistant_knowledge_chunks_hash" ON "assistant_knowledge_chunks" USING btree ("chunk_hash");--> statement-breakpoint
CREATE INDEX "idx_assistant_knowledge_sources_approved" ON "assistant_knowledge_sources" USING btree ("approved","ingestion_status");--> statement-breakpoint
CREATE INDEX "idx_assistant_messages_conversation" ON "assistant_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_actor_created" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_case_assignments_case" ON "case_assignments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_case_comments_case" ON "case_comments" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_case_status_history_case" ON "case_status_history" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_consent_records_contact" ON "consent_records" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_content_entries_slug_locale" ON "content_entries" USING btree ("canonical_slug","locale");--> statement-breakpoint
CREATE INDEX "idx_content_entries_type_status_published" ON "content_entries" USING btree ("content_type","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_content_media_triplet" ON "content_media" USING btree ("entry_id","asset_id","placement");--> statement-breakpoint
CREATE INDEX "idx_content_revisions_entry" ON "content_revisions" USING btree ("entry_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_content_taxonomy_terms_pair" ON "content_taxonomy_terms" USING btree ("entry_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_content_translations_source_locale" ON "content_translations" USING btree ("source_entry_id","target_locale");--> statement-breakpoint
CREATE INDEX "idx_discussion_topics_status" ON "discussion_topics" USING btree ("public_status");--> statement-breakpoint
CREATE INDEX "idx_document_assets_storage" ON "document_assets" USING btree ("storage_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_registrations_event_contact" ON "event_registrations" USING btree ("event_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_registrations_reference" ON "event_registrations" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_events_content_entry" ON "events" USING btree ("content_entry_id");--> statement-breakpoint
CREATE INDEX "idx_events_starts_status" ON "events" USING btree ("starts_at","event_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_governorate_profiles_name" ON "governorate_profiles" USING btree ("governorate");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_idempotency_keys_scope_key" ON "idempotency_keys" USING btree ("scope","key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_intake_case_details_case" ON "intake_case_details" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_intake_cases_kind_status_created" ON "intake_cases" USING btree ("kind","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_intake_cases_reference" ON "intake_cases" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_magic_link_token_hash" ON "magic_link_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_magic_link_email_purpose" ON "magic_link_tokens" USING btree ("email","purpose");--> statement-breakpoint
CREATE INDEX "idx_membership_action_requests_application" ON "membership_action_requests" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_membership_application_files_application" ON "membership_application_files" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_application_profile_application" ON "membership_application_profile" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_applications_reference" ON "membership_applications" USING btree ("public_reference");--> statement-breakpoint
CREATE INDEX "idx_membership_applications_status" ON "membership_applications" USING btree ("application_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_applications_idempotency" ON "membership_applications" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_card_templates_name_version" ON "membership_card_templates" USING btree ("name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_cards_membership" ON "membership_cards" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_cards_share_token_hash" ON "membership_cards" USING btree ("public_share_token_hash");--> statement-breakpoint
CREATE INDEX "idx_membership_completion_appointments_application" ON "membership_completion_appointments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_membership_fee_rules_active_from" ON "membership_fee_rules" USING btree ("active","effective_from");--> statement-breakpoint
CREATE INDEX "idx_membership_share_events_card" ON "membership_share_events" USING btree ("membership_card_id");--> statement-breakpoint
CREATE INDEX "idx_membership_status_history_application" ON "membership_status_history" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memberships_number" ON "memberships" USING btree ("membership_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memberships_application" ON "memberships" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_monitoring_ingestions_source_status" ON "monitoring_ingestions" USING btree ("source_id","ingestion_status");--> statement-breakpoint
CREATE INDEX "idx_monitoring_item_links_item" ON "monitoring_item_links" USING btree ("monitoring_item_id");--> statement-breakpoint
CREATE INDEX "idx_monitoring_items_visibility_state" ON "monitoring_items" USING btree ("visibility","verification_state");--> statement-breakpoint
CREATE INDEX "idx_navigation_items_locale_parent" ON "navigation_items" USING btree ("locale","parent_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notification_templates_code_locale" ON "notification_templates" USING btree ("code","locale");--> statement-breakpoint
CREATE INDEX "idx_notifications_status_created" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_opportunity_details_content_entry" ON "opportunity_details" USING btree ("content_entry_id");--> statement-breakpoint
CREATE INDEX "idx_outbox_jobs_status_available" ON "outbox_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_partnership_requests_reference" ON "partnership_requests" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_party_branches_slug" ON "party_branches" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_permissions_key" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_policy_papers_content_entry" ON "policy_papers" USING btree ("content_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_content_slug_locale" ON "portal_content" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "idx_portal_content_type_status_published" ON "portal_content" USING btree ("type","status","published_at");--> statement-breakpoint
CREATE INDEX "idx_problem_evidence_problem" ON "problem_evidence" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "idx_problem_updates_problem" ON "problem_updates" USING btree ("problem_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_problems_status_visibility" ON "problems" USING btree ("problem_status","visibility");--> statement-breakpoint
CREATE INDEX "idx_program_applications_program_status" ON "program_applications" USING btree ("program_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_program_applications_reference" ON "program_applications" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_program_details_content_entry" ON "program_details" USING btree ("content_entry_id");--> statement-breakpoint
CREATE INDEX "idx_proposed_solutions_problem" ON "proposed_solutions" USING btree ("problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rate_limit_events_bucket_window" ON "rate_limit_events" USING btree ("bucket_key","window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_related_content_triplet" ON "related_content" USING btree ("source_entry_id","target_entry_id","relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_permissions_pair" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_key" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_search_index_queue_status_created" ON "search_index_queue" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessions_token_hash" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settings_key" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_slug_redirects_locale_old_path" ON "slug_redirects" USING btree ("locale","old_path");--> statement-breakpoint
CREATE INDEX "idx_solution_partners_solution" ON "solution_partners" USING btree ("solution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_storage_assets_object_key" ON "storage_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "idx_submissions_kind_status_created" ON "submissions" USING btree ("kind","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_taxonomy_terms_kind_slug_locale" ON "taxonomy_terms" USING btree ("kind","slug","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_roles_pair" ON "user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");