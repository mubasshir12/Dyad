import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm'; // For CURRENT_TIMESTAMP

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Assuming userId is provided and unique
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const buildRequests = sqliteTable('build_requests', {
  id: text('id').primaryKey(), // buildId
  userId: text('user_id').references(() => users.id), // As per prompt, nullable
  requirement: text('requirement').notNull(),
  status: text('status', { enum: ['pending', 'in-progress', 'completed', 'error'] }).default('pending').notNull(),
  websiteUrl: text('website_url'), 
  devServerPid: integer('dev_server_pid'), // Nullable by default
  buildError: text('build_error'), // Nullable by default
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`), 
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  buildId: text('build_id').references(() => buildRequests.id), // As per prompt, nullable
  userId: text('user_id').references(() => users.id), // As per prompt, nullable. For easier querying of all user messages
  sender: text('sender', { enum: ['user', 'ai'] }).notNull(),
  content: text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});
