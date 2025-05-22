CREATE TABLE `build_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`requirement` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`website_url` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`build_id` text,
	`user_id` text,
	`sender` text NOT NULL,
	`content` text NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`build_id`) REFERENCES `build_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
