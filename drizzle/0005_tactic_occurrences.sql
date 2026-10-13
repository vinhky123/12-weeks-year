ALTER TABLE `completions` ADD `week_plan_item_id` integer REFERENCES week_plan_items(id) ON DELETE RESTRICT;
