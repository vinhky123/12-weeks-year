CREATE TABLE `completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tactic_id` integer NOT NULL,
	`cycle_week` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tactic_id`) REFERENCES `tactics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`status` text DEFAULT 'planning' NOT NULL,
	`created_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`title` text NOT NULL,
	`why` text NOT NULL,
	`lag_metric_name` text NOT NULL,
	`lag_unit` text NOT NULL,
	`lag_start` real NOT NULL,
	`lag_target` real NOT NULL,
	`deadline_week` integer DEFAULT 12 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`current_cycle_id` integer,
	`week_starts_on` integer DEFAULT 1 NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`locale` text DEFAULT 'vi' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tactics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`text` text NOT NULL,
	`due_pattern` text NOT NULL,
	`keystone` integer DEFAULT 0 NOT NULL,
	`active_from_week` integer DEFAULT 1 NOT NULL,
	`deactivated_at_week` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `week_plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_plan_id` integer NOT NULL,
	`tactic_id` integer,
	`label` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`planned_count` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`week_plan_id`) REFERENCES `week_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `week_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`week_number` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`closed_at` text,
	`reflection` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `week_plans_cycle_week_idx` ON `week_plans` (`cycle_id`,`week_number`);