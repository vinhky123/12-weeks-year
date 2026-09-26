CREATE TABLE `lag_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`week_number` integer NOT NULL,
	`value` real NOT NULL,
	`logged_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lag_logs_goal_week_idx` ON `lag_logs` (`goal_id`,`week_number`);