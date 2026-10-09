CREATE TABLE `discussion_topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`linked_monitoring_item_id` integer,
	`public_status` text DEFAULT 'draft' NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`moderation_policy` text DEFAULT 'form_only' NOT NULL,
	`outcome_content_entry_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_discussion_topics_status` ON `discussion_topics` (`public_status`);--> statement-breakpoint
CREATE TABLE `membership_action_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`requested_fields_json` text DEFAULT '[]' NOT NULL,
	`public_instructions` text NOT NULL,
	`due_date` text,
	`resolved_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_action_requests_application` ON `membership_action_requests` (`application_id`);--> statement-breakpoint
CREATE TABLE `membership_application_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`storage_asset_id` integer NOT NULL,
	`file_type` text NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_application_files_application` ON `membership_application_files` (`application_id`);--> statement-breakpoint
CREATE TABLE `membership_application_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`legal_name` text,
	`date_of_birth` text,
	`occupation` text,
	`education` text,
	`address_json` text DEFAULT '{}' NOT NULL,
	`legal_id_number` text,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_application_profile_application` ON `membership_application_profile` (`application_id`);--> statement-breakpoint
CREATE TABLE `membership_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_reference` text NOT NULL,
	`contact_id` integer NOT NULL,
	`application_status` text DEFAULT 'draft' NOT NULL,
	`requested_governorate` text,
	`recommended_branch_id` integer,
	`review_owner_id` integer,
	`submitted_at` text,
	`reviewed_at` text,
	`decision_at` text,
	`payment_status` text DEFAULT 'not_applicable' NOT NULL,
	`completion_status` text DEFAULT 'not_started' NOT NULL,
	`consent_version` text,
	`verification_token_hash` text,
	`verification_expires_at` text,
	`idempotency_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_applications_reference` ON `membership_applications` (`public_reference`);--> statement-breakpoint
CREATE INDEX `idx_membership_applications_status` ON `membership_applications` (`application_status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_applications_idempotency` ON `membership_applications` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `membership_card_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`layout_config_json` text DEFAULT '{}' NOT NULL,
	`allowed_public_fields_json` text DEFAULT '[]' NOT NULL,
	`locale` text DEFAULT 'ar' NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_card_templates_name_version` ON `membership_card_templates` (`name`,`version`);--> statement-breakpoint
CREATE TABLE `membership_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`membership_id` integer NOT NULL,
	`template_version` integer NOT NULL,
	`render_asset_id` integer,
	`public_share_token_hash` text,
	`share_enabled` integer DEFAULT 0 NOT NULL,
	`issued_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_cards_membership` ON `membership_cards` (`membership_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_cards_share_token_hash` ON `membership_cards` (`public_share_token_hash`);--> statement-breakpoint
CREATE TABLE `membership_completion_appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`branch_id` integer NOT NULL,
	`scheduled_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attendance` text,
	`staff_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_completion_appointments_application` ON `membership_completion_appointments` (`application_id`);--> statement-breakpoint
CREATE TABLE `membership_fee_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'EGP' NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`waiver_rules_json` text DEFAULT '{}' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`set_by` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_fee_rules_active_from` ON `membership_fee_rules` (`active`,`effective_from`);--> statement-breakpoint
CREATE TABLE `membership_share_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`membership_card_id` integer NOT NULL,
	`channel` text DEFAULT 'link' NOT NULL,
	`anonymized_attribution` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_share_events_card` ON `membership_share_events` (`membership_card_id`);--> statement-breakpoint
CREATE TABLE `membership_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`status` text NOT NULL,
	`public_message` text,
	`internal_note` text,
	`actor_user_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_status_history_application` ON `membership_status_history` (`application_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`membership_number` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text,
	`branch_id` integer NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memberships_number` ON `memberships` (`membership_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memberships_application` ON `memberships` (`application_id`);--> statement-breakpoint
CREATE TABLE `monitoring_ingestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`external_url` text,
	`external_id` text,
	`headline` text NOT NULL,
	`permitted_excerpt` text,
	`publication_date` text,
	`raw_metadata_hash` text,
	`ingestion_status` text DEFAULT 'candidate' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_monitoring_ingestions_source_status` ON `monitoring_ingestions` (`source_id`,`ingestion_status`);--> statement-breakpoint
CREATE TABLE `monitoring_item_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitoring_item_id` integer NOT NULL,
	`linked_type` text NOT NULL,
	`linked_id` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_monitoring_item_links_item` ON `monitoring_item_links` (`monitoring_item_id`);--> statement-breakpoint
CREATE TABLE `monitoring_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ingestion_id` integer NOT NULL,
	`item_type` text DEFAULT 'news' NOT NULL,
	`relevance_score` integer DEFAULT 0 NOT NULL,
	`sector` text,
	`governorate` text,
	`verification_state` text DEFAULT 'unverified' NOT NULL,
	`analyst_owner_id` integer,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_monitoring_items_visibility_state` ON `monitoring_items` (`visibility`,`verification_state`);--> statement-breakpoint
CREATE TABLE `monitoring_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`config_secret_ref` text,
	`topic_scope` text,
	`language` text DEFAULT 'ar' NOT NULL,
	`legal_review_status` text DEFAULT 'pending' NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `party_branches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`governorate` text NOT NULL,
	`slug` text NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text,
	`address_ar` text,
	`address_en` text,
	`lat` real,
	`lng` real,
	`contacts_json` text DEFAULT '{}' NOT NULL,
	`office_hours_json` text DEFAULT '{}' NOT NULL,
	`completion_services_json` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_party_branches_slug` ON `party_branches` (`slug`);