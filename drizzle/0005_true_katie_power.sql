CREATE TABLE `document_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`storage_asset_id` integer NOT NULL,
	`title` text NOT NULL,
	`file_category` text DEFAULT 'report' NOT NULL,
	`language` text DEFAULT 'ar' NOT NULL,
	`publication_date` text,
	`download_visibility` text DEFAULT 'public' NOT NULL,
	`scan_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_document_assets_storage` ON `document_assets` (`storage_asset_id`);--> statement-breakpoint
CREATE TABLE `storage_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`checksum` text,
	`width` integer,
	`height` integer,
	`duration_seconds` integer,
	`alt_text` text,
	`caption` text,
	`rights_note` text,
	`processing_status` text DEFAULT 'pending' NOT NULL,
	`created_by` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_storage_assets_object_key` ON `storage_assets` (`object_key`);