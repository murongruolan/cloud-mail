import orm from '../entity/orm';
import subAdmin from '../entity/sub-admin';
import user from '../entity/user';
import BizError from '../error/biz-error';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { isDel, subAdminConst } from '../const/entity-const';
import { t } from '../i18n/i18n';

const subAdminService = {

	selectByUserId(c, userId) {
		return orm(c).select().from(subAdmin).where(eq(subAdmin.userId, userId)).get();
	},

	selectById(c, subAdminId) {
		return orm(c).select().from(subAdmin).where(eq(subAdmin.subAdminId, subAdminId)).get();
	},

	async list(c, params) {
		let { num, size, email, status } = params;
		size = Math.min(Number(size || 15), 50);
		num = Math.max(Number(num || 1), 1);
		status = Number(status);
		const offset = (num - 1) * size;

		const conditions = [eq(user.isDel, isDel.NORMAL)];

		if (email) {
			conditions.push(sql`${user.email} COLLATE NOCASE LIKE ${'%' + email + '%'}`);
		}

		if (!Number.isNaN(status) && status > -1) {
			conditions.push(eq(subAdmin.status, status));
		}

		const query = orm(c)
			.select({
				subAdminId: subAdmin.subAdminId,
				userId: subAdmin.userId,
				email: user.email,
				status: subAdmin.status,
				remark: subAdmin.remark,
				createTime: subAdmin.createTime
			})
			.from(subAdmin)
			.leftJoin(user, eq(user.userId, subAdmin.userId))
			.where(and(...conditions))
			.orderBy(desc(subAdmin.subAdminId));

		const list = await query.limit(size).offset(offset);
		const { total } = await orm(c)
			.select({ total: count() })
			.from(subAdmin)
			.leftJoin(user, eq(user.userId, subAdmin.userId))
			.where(and(...conditions))
			.get();

		return { list, total };
	},

	async candidateList(c, params) {
		let { num, size, email, status } = params;
		size = Math.min(Number(size || 10), 50);
		num = Math.max(Number(num || 1), 1);
		status = Number(status);
		const offset = (num - 1) * size;

		const conditions = [
			eq(user.isDel, isDel.NORMAL),
			sql`${user.email} COLLATE NOCASE != ${c.env.admin}`,
			sql`NOT EXISTS (SELECT 1 FROM sub_admin sa WHERE sa.user_id = ${user.userId})`
		];

		if (email) {
			conditions.push(sql`${user.email} COLLATE NOCASE LIKE ${'%' + email + '%'}`);
		}

		if (!Number.isNaN(status) && status > -1) {
			conditions.push(eq(user.status, status));
		}

		const query = orm(c)
			.select({
				userId: user.userId,
				email: user.email,
				status: user.status,
				createTime: user.createTime
			})
			.from(user)
			.where(and(...conditions))
			.orderBy(desc(user.userId));

		const list = await query.limit(size).offset(offset);
		const { total } = await orm(c)
			.select({ total: count() })
			.from(user)
			.where(and(...conditions))
			.get();

		return { list, total };
	},

	async add(c, params, createBy) {
		const { userId, remark } = params;
		const targetUser = await orm(c).select().from(user).where(eq(user.userId, userId)).get();

		if (!targetUser || targetUser.isDel === isDel.DELETE) {
			throw new BizError(t('subAdminUserNotExist'));
		}

		if (targetUser.email === c.env.admin) {
			throw new BizError(t('subAdminCannotBeMainAdmin'));
		}

		const exists = await this.selectByUserId(c, userId);
		if (exists) {
			throw new BizError(t('subAdminAlreadyExist'));
		}

		return orm(c).insert(subAdmin).values({
			userId,
			remark: typeof remark === 'string' ? remark.trim() : '',
			createBy,
			status: subAdminConst.status.NORMAL
		}).returning().get();
	},

	async setStatus(c, params) {
		const { subAdminId, status } = params;
		const row = await this.selectById(c, subAdminId);

		if (!row) {
			throw new BizError(t('subAdminNotExist'));
		}

		await orm(c).update(subAdmin).set({ status }).where(eq(subAdmin.subAdminId, subAdminId)).run();
	},

	async setRemark(c, params) {
		const { subAdminId, remark } = params;
		const row = await this.selectById(c, subAdminId);

		if (!row) {
			throw new BizError(t('subAdminNotExist'));
		}

		await orm(c).update(subAdmin).set({
			remark: typeof remark === 'string' ? remark.trim() : ''
		}).where(eq(subAdmin.subAdminId, subAdminId)).run();
	},

	async delete(c, params) {
		const { subAdminId } = params;
		const row = await this.selectById(c, subAdminId);

		if (!row) {
			throw new BizError(t('subAdminNotExist'));
		}

		await orm(c).delete(subAdmin).where(eq(subAdmin.subAdminId, subAdminId)).run();
	},

	async deleteByUserIds(c, userIds) {
		if (!userIds.length) return;
		await c.env.db.prepare(`DELETE FROM sub_admin WHERE user_id IN (${userIds.map(() => '?').join(',')})`).bind(...userIds).run();
	}
};

export default subAdminService;
