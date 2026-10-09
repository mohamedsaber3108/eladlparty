CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`content_entry_id` integer,
	`page_path` text,
	`session_hash` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_events_name_created` ON `analytics_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE TABLE `assistant_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_ref` text NOT NULL,
	`user_id` integer,
	`locale` text DEFAULT 'ar' NOT NULL,
	`context_route` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_conversations_session` ON `assistant_conversations` (`session_ref`);--> statement-breakpoint
CREATE TABLE `assistant_knowledge_chunks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`chunk_text` text NOT NULL,
	`chunk_hash` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_knowledge_chunks_source` ON `assistant_knowledge_chunks` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_knowledge_chunks_hash` ON `assistant_knowledge_chunks` (`chunk_hash`);--> statement-breakpoint
CREATE TABLE `assistant_knowledge_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text DEFAULT 'content' NOT NULL,
	`entry_id` integer,
	`document_asset_id` integer,
	`locale` text DEFAULT 'ar' NOT NULL,
	`approved` integer DEFAULT 0 NOT NULL,
	`checksum` text,
	`ingestion_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_knowledge_sources_approved` ON `assistant_knowledge_sources` (`approved`,`ingestion_status`);--> statement-breakpoint
CREATE TABLE `assistant_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations_json` text DEFAULT '[]' NOT NULL,
	`feedback` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_messages_conversation` ON `assistant_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_json` text,
	`after_json` text,
	`request_id` text,
	`ip_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor_created` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `case_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`assigned_by` integer,
	`assigned_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_case_assignments_case` ON `case_assignments` (`case_id`);--> statement-breakpoint
CREATE TABLE `case_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`author_user_id` integer,
	`body` text NOT NULL,
	`internal` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_case_comments_case` ON `case_comments` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `case_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`actor_user_id` integer,
	`visibility` text DEFAULT 'internal' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_case_status_history_case` ON `case_status_history` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `consent_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer,
	`consent_type` text NOT NULL,
	`consent_version` text NOT NULL,
	`accepted_at` text NOT NULL,
	`ip_hash` text,
	`withdrawal_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_consent_records_contact` ON `consent_records` (`contact_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`governorate` text,
	`profession` text,
	`organization` text,
	`linkedin` text,
	`consent_accepted_at` text,
	`consent_version` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);--> statement-breakpoint
CREATE TABLE `content_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_type` text NOT NULL,
	`canonical_slug` text NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`body_richtext` text NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`scheduled_at` text,
	`featured` integer DEFAULT 0 NOT NULL,
	`cover_asset_id` integer,
	`author_id` integer,
	`reviewer_id` integer,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_entries_slug_locale` ON `content_entries` (`canonical_slug`,`locale`);--> statement-breakpoint
CREATE INDEX `idx_content_entries_type_status_published` ON `content_entries` (`content_type`,`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `content_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`placement` text DEFAULT 'body' NOT NULL,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_media_triplet` ON `content_media` (`entry_id`,`asset_id`,`placement`);--> statement-breakpoint
CREATE TABLE `content_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`revision_number` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`change_note` text,
	`author_id` integer,
	`reviewed_by` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_content_revisions_entry` ON `content_revisions` (`entry_id`,`revision_number`);--> statement-breakpoint
CREATE TABLE `content_taxonomy_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`term_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_taxonomy_terms_pair` ON `content_taxonomy_terms` (`entry_id`,`term_id`);--> statement-breakpoint
CREATE TABLE `content_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_entry_id` integer NOT NULL,
	`target_locale` text NOT NULL,
	`target_entry_id` integer,
	`translation_status` text DEFAULT 'missing' NOT NULL,
	`translator_id` integer,
	`reviewer_id` integer,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_translations_source_locale` ON `content_translations` (`source_entry_id`,`target_locale`);--> statement-breakpoint
CREATE TABLE `event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`consent` integer DEFAULT 0 NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`reference` text NOT NULL,
	`staff_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_event_registrations_event_contact` ON `event_registrations` (`event_id`,`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_event_registrations_reference` ON `event_registrations` (`reference`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_entry_id` integer NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`timezone` text DEFAULT 'Africa/Cairo' NOT NULL,
	`format` text DEFAULT 'in_person' NOT NULL,
	`venue_name` text,
	`venue_address` text,
	`venue_lat` real,
	`venue_lng` real,
	`capacity` integer,
	`registration_mode` text DEFAULT 'internal' NOT NULL,
	`registration_open_at` text,
	`registration_close_at` text,
	`event_status` text DEFAULT 'draft' NOT NULL,
	`external_registration_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_content_entry` ON `events` (`content_entry_id`);--> statement-breakpoint
CREATE INDEX `idx_events_starts_status` ON `events` (`starts_at`,`event_status`);--> statement-breakpoint
CREATE TABLE `governorate_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`governorate` text NOT NULL,
	`overview_ar` text,
	`overview_en` text,
	`local_status` text DEFAULT 'planned' NOT NULL,
	`coordinator_contact_id` integer,
	`coverage_indicators_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_governorate_profiles_name` ON `governorate_profiles` (`governorate`);--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`response_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_idempotency_keys_scope_key` ON `idempotency_keys` (`scope`,`key`);--> statement-breakpoint
CREATE TABLE `intake_case_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`narrative_body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_intake_case_details_case` ON `intake_case_details` (`case_id`);--> statement-breakpoint
CREATE TABLE `intake_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`contact_id` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`assigned_to` integer,
	`reference` text NOT NULL,
	`source_route` text,
	`consent` integer DEFAULT 0 NOT NULL,
	`ip_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_intake_cases_kind_status_created` ON `intake_cases` (`kind`,`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_intake_cases_reference` ON `intake_cases` (`reference`);--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`purpose` text DEFAULT 'login' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`request_ip_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_magic_link_token_hash` ON `magic_link_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_magic_link_email_purpose` ON `magic_link_tokens` (`email`,`purpose`);--> statement-breakpoint
CREATE TABLE `navigation_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`href` text NOT NULL,
	`parent_id` integer,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`required_permission` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_navigation_items_locale_parent` ON `navigation_items` (`locale`,`parent_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notification_templates_code_locale` ON `notification_templates` (`code`,`locale`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_contact_id` integer,
	`recipient_user_id` integer,
	`template_code` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider_id` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_status_created` ON `notifications` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `opportunity_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_entry_id` integer NOT NULL,
	`provider` text,
	`deadline` text,
	`eligibility` text,
	`application_url` text,
	`opportunity_status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_opportunity_details_content_entry` ON `opportunity_details` (`content_entry_id`);--> statement-breakpoint
CREATE TABLE `organization_structure_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text,
	`parent_id` integer,
	`node_type` text DEFAULT 'unit' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`team_member_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_type` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`available_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_jobs_status_available` ON `outbox_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text,
	`description_ar` text,
	`description_en` text,
	`type` text DEFAULT 'other' NOT NULL,
	`website` text,
	`logo_asset_id` integer,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`relationship_owner_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partnership_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer NOT NULL,
	`organization_name` text NOT NULL,
	`proposal` text NOT NULL,
	`requested_scope` text,
	`status` text DEFAULT 'new' NOT NULL,
	`assigned_to` integer,
	`reference` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_partnership_requests_reference` ON `partnership_requests` (`reference`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_permissions_key` ON `permissions` (`key`);--> statement-breakpoint
CREATE TABLE `policy_papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_entry_id` integer NOT NULL,
	`policy_status` text DEFAULT 'draft' NOT NULL,
	`consultation_deadline` text,
	`final_document_asset_id` integer,
	`approved_by` integer,
	`approved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_policy_papers_content_entry` ON `policy_papers` (`content_entry_id`);--> statement-breakpoint
CREATE TABLE `problem_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`problem_id` integer NOT NULL,
	`source_type` text DEFAULT 'report' NOT NULL,
	`citation` text,
	`url` text,
	`file_asset_id` integer,
	`publication_date` text,
	`notes` text,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_problem_evidence_problem` ON `problem_evidence` (`problem_id`);--> statement-breakpoint
CREATE TABLE `problem_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`problem_id` integer NOT NULL,
	`status_change` text,
	`public_update_text` text,
	`private_note` text,
	`actor_user_id` integer,
	`visibility` text DEFAULT 'internal' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_problem_updates_problem` ON `problem_updates` (`problem_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_entry_id` integer,
	`sector` text,
	`governorate` text,
	`severity` text DEFAULT 'unknown' NOT NULL,
	`affected_group` text,
	`problem_status` text DEFAULT 'submitted' NOT NULL,
	`source_confidence` text DEFAULT 'unverified' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`owner_user_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_problems_status_visibility` ON `problems` (`problem_status`,`visibility`);--> statement-breakpoint
CREATE TABLE `program_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`reviewer_id` integer,
	`decision_reason` text,
	`reference` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_program_applications_program_status` ON `program_applications` (`program_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_program_applications_reference` ON `program_applications` (`reference`);--> statement-breakpoint
CREATE TABLE `program_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_entry_id` integer NOT NULL,
	`audience` text,
	`eligibility` text,
	`delivery_mode` text,
	`application_open_at` text,
	`application_close_at` text,
	`capacity` integer,
	`application_mode` text DEFAULT 'none' NOT NULL,
	`owner_user_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_program_details_content_entry` ON `program_details` (`content_entry_id`);--> statement-breakpoint
CREATE TABLE `proposed_solutions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`problem_id` integer NOT NULL,
	`content_entry_id` integer,
	`solution_type` text,
	`feasibility` text DEFAULT 'unassessed' NOT NULL,
	`estimated_timeframe` text,
	`estimated_budget_range` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_proposed_solutions_problem` ON `proposed_solutions` (`problem_id`);--> statement-breakpoint
CREATE TABLE `rate_limit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_key` text NOT NULL,
	`window_start` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rate_limit_events_bucket_window` ON `rate_limit_events` (`bucket_key`,`window_start`);--> statement-breakpoint
CREATE TABLE `related_content` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_entry_id` integer NOT NULL,
	`target_entry_id` integer NOT NULL,
	`relationship_type` text DEFAULT 'related' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_related_content_triplet` ON `related_content` (`source_entry_id`,`target_entry_id`,`relationship_type`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_role_permissions_pair` ON `role_permissions` (`role_id`,`permission_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roles_key` ON `roles` (`key`);--> statement-breakpoint
CREATE TABLE `search_index_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`operation` text DEFAULT 'upsert' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_search_index_queue_status_created` ON `search_index_queue` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`csrf_secret` text NOT NULL,
	`ip_hash` text,
	`user_agent_hash` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_token_hash` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_by` integer,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_key` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `slug_redirects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`locale` text NOT NULL,
	`old_path` text NOT NULL,
	`new_path` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_slug_redirects_locale_old_path` ON `slug_redirects` (`locale`,`old_path`);--> statement-breakpoint
CREATE TABLE `solution_partners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`solution_id` integer NOT NULL,
	`partner_id` integer,
	`candidate_name` text,
	`relationship_status` text DEFAULT 'candidate' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_solution_partners_solution` ON `solution_partners` (`solution_id`);--> statement-breakpoint
CREATE TABLE `taxonomy_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`label` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_taxonomy_terms_kind_slug_locale` ON `taxonomy_terms` (`kind`,`slug`,`locale`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_entry_id` integer,
	`name_ar` text NOT NULL,
	`name_en` text,
	`title_ar` text NOT NULL,
	`title_en` text,
	`biography_ar` text,
	`biography_en` text,
	`image_asset_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`assigned_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_roles_pair` ON `user_roles` (`user_id`,`role_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`last_login_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);