CREATE TABLE `block_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer,
	`type` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`label` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_measure_id` integer NOT NULL,
	`week_number` integer NOT NULL,
	`value` real NOT NULL,
	`logged_at` text NOT NULL,
	FOREIGN KEY (`lead_measure_id`) REFERENCES `lead_measures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_logs_measure_week_idx` ON `lead_logs` (`lead_measure_id`,`week_number`);--> statement-breakpoint
CREATE TABLE `lead_measures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`name` text NOT NULL,
	`weekly_target` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `visions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`long_term` text DEFAULT '' NOT NULL,
	`three_year` text DEFAULT '' NOT NULL,
	`cycle_connection` text DEFAULT '' NOT NULL,
	`life_domains` text DEFAULT '[]' NOT NULL,
	`cycle_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
