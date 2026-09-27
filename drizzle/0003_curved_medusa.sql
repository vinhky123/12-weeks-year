CREATE TABLE `commitments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`costs` text NOT NULL,
	`statement` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commitments_cycle_idx` ON `commitments` (`cycle_id`);--> statement-breakpoint
CREATE TABLE `cycle_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`results_json` text DEFAULT '[]' NOT NULL,
	`qol_json` text DEFAULT '[]' NOT NULL,
	`disciplines_json` text DEFAULT '[]' NOT NULL,
	`breakthroughs` text,
	`next_cycle_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cycle_reviews_cycle_idx` ON `cycle_reviews` (`cycle_id`);--> statement-breakpoint
CREATE TABLE `wam_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`week_number` integer NOT NULL,
	`auto_json` text DEFAULT '{}' NOT NULL,
	`blockers` text,
	`what_worked` text,
	`encouragement` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wam_reports_cycle_week_idx` ON `wam_reports` (`cycle_id`,`week_number`);