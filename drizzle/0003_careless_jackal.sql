ALTER TABLE `submissions` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `governorate` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `profession` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `participation_type` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `linkedin` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `metadata` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_submissions_kind_status_created` ON `submissions` (`kind`,`status`,`created_at`);