import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const subAdmin = sqliteTable('sub_admin', {
	subAdminId: integer('sub_admin_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	status: integer('status').default(0).notNull(),
	remark: text('remark').default('').notNull(),
	createBy: integer('create_by').notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export default subAdmin;
