ALTER TABLE `cycle_reviews` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
-- Every review that exists before this migration predates explicit finalization, so it stays finished.
UPDATE `cycle_reviews` SET `status` = 'complete';
