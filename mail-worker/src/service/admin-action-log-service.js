import orm from '../entity/orm';
import adminActionLog from '../entity/admin-action-log';
import { count, desc, sql } from 'drizzle-orm';

const adminActionLogService = {

	log(c, actor, action) {
		if (!actor) {
			return;
		}

		return orm(c).insert(adminActionLog).values({
			userId: actor.userId,
			email: actor.email,
			adminType: actor.adminType,
			action
		}).run();
	},

	async list(c, params) {
		let { num, size, adminType, email } = params;
		size = Math.min(Number(size || 20), 100);
		num = Math.max(Number(num || 1), 1);
		const offset = (num - 1) * size;
		const conditions = [];

		if (adminType && adminType !== 'all') {
			conditions.push(sql`${adminActionLog.adminType} = ${adminType}`);
		}

		if (email) {
			conditions.push(sql`${adminActionLog.email} COLLATE NOCASE LIKE ${'%' + email + '%'}`);
		}

		const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : null;

		const query = orm(c)
			.select()
			.from(adminActionLog)
			.orderBy(desc(adminActionLog.logId));

		if (whereClause) {
			query.where(whereClause);
		}

		const list = await query.limit(size).offset(offset);

		const countQuery = orm(c).select({ total: count() }).from(adminActionLog);
		if (whereClause) {
			countQuery.where(whereClause);
		}
		const { total } = await countQuery.get();

		return { list, total };
	}
};
export default adminActionLogService;
