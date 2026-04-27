import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const adminActionLog = sqliteTable('admin_action_log', {
	logId: integer('log_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	email: text('email').notNull(),
	adminType: text('admin_type').notNull(),
	action: text('action').notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export default adminActionLog;
