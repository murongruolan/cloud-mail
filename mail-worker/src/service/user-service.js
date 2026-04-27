import BizError from '../error/biz-error';
import accountService from './account-service';
import orm from '../entity/orm';
import user from '../entity/user';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { emailConst, isDel, roleConst, userConst } from '../const/entity-const';
import kvConst from '../const/kv-const';
import KvConst from '../const/kv-const';
import cryptoUtils from '../utils/crypto-utils';
import emailService from './email-service';
import dayjs from 'dayjs';
import permService from './perm-service';
import roleService from './role-service';
import emailUtils from '../utils/email-utils';
import saltHashUtils from '../utils/crypto-utils';
import constant from '../const/constant';
import { t } from '../i18n/i18n'
import reqUtils from '../utils/req-utils';
import verifyUtils from '../utils/verify-utils';
import {oauth} from "../entity/oauth";
import oauthService from "./oauth-service";
import subAdminService from './sub-admin-service';

const userService = {

	async effectivePermKeys(c, userId, userEmail = null) {

		let email = userEmail;

		if (!email) {
			const userRow = await userService.selectById(c, userId);
			if (!userRow) {
				return [];
			}
			email = userRow.email;
		}

		const permKeys = email === c.env.admin ? ['*'] : await permService.userPermKeys(c, userId);
		const subAdminRow = email === c.env.admin ? null : await subAdminService.selectByUserId(c, userId);
		let mergedPermKeys = [...permKeys];

		if (subAdminRow) {
			const blockedPerms = new Set([
				'role:query',
				'role:add',
				'role:set',
				'role:delete',
				'setting:query',
				'setting:set',
				'sub-admin:query',
				'sub-admin:set',
				'admin-log:query'
			]);

			mergedPermKeys = mergedPermKeys.filter(key => !blockedPerms.has(key));
		}

		if (subAdminRow && subAdminRow.status === 0) {
			mergedPermKeys = [...new Set([...mergedPermKeys, ...constant.SUB_ADMIN_PERMS])];
		}

		return mergedPermKeys;
	},

	async loginUserInfo(c, userId) {

		const userRow = await userService.selectById(c, userId);

		if (!userRow) {
			throw new BizError(t('authExpired'), 401);
		}

		const [account, roleRow, mergedPermKeys] = await Promise.all([
			accountService.selectByEmailIncludeDel(c, userRow.email),
			roleService.selectById(c, userRow.type),
			userService.effectivePermKeys(c, userId, userRow.email)
		]);

		const subAdminRow = userRow.email === c.env.admin ? null : await subAdminService.selectByUserId(c, userId);

		const user = {};
		user.userId = userRow.userId;
		user.sendCount = userRow.sendCount;
		user.email = userRow.email;
		user.account = account;
		user.name = account.name;
		user.permKeys = mergedPermKeys;
		user.role = roleRow;
		user.type = userRow.type;
		user.isSubAdmin = !!subAdminRow;
		user.subAdminStatus = subAdminRow?.status ?? null;

		if (c.env.admin === userRow.email) {
			user.role = constant.ADMIN_ROLE
			user.type = 0;
		}

		return user;
	},


	async resetPassword(c, params, userId) {

		const { password } = params;

		if (password < 6) {
			throw new BizError(t('pwdMinLength'));
		}
		const { salt, hash } = await cryptoUtils.hashPassword(password);
		await orm(c).update(user).set({ password: hash, salt: salt }).where(eq(user.userId, userId)).run();
	},

	selectByEmail(c, email) {
		return orm(c).select().from(user).where(
			and(
				eq(user.email, email),
				eq(user.isDel, isDel.NORMAL)))
			.get();
	},

	async insert(c, params) {
		const { userId } = await orm(c).insert(user).values({ ...params }).returning().get();
		return userId;
	},

	selectByEmailIncludeDel(c, email) {
		return orm(c).select().from(user).where(sql`${user.email} COLLATE NOCASE = ${email}`).get();
	},

	selectByIdIncludeDel(c, userId) {
		return orm(c).select().from(user).where(eq(user.userId, userId)).get();
	},

	selectById(c, userId) {
		return orm(c).select().from(user).where(
			and(
				eq(user.userId, userId),
				eq(user.isDel, isDel.NORMAL)))
			.get();
	},

	async delete(c, userId) {
		await orm(c).update(user).set({ isDel: isDel.DELETE }).where(eq(user.userId, userId)).run();
		await c.env.kv.delete(kvConst.AUTH_INFO + userId)
	},

	async physicsDelete(c, params) {
		let { userIds } = params;
		userIds = userIds.split(',').map(Number);
		await accountService.physicsDeleteByUserIds(c, userIds);
		await oauthService.deleteByUserIds(c, userIds);
		await subAdminService.deleteByUserIds(c, userIds);
		await orm(c).delete(user).where(inArray(user.userId, userIds)).run();
	},

	async list(c, params) {

		let { num, size, email, timeSort, status } = params;

		size = Number(size);
		num = Number(num);
		timeSort = Number(timeSort);
		params.isDel = Number(params.isDel);
		if (size > 50) {
			size = 50;
		}

		num = (num - 1) * size;

		const conditions = [];

		if (status > -1) {
			conditions.push(eq(user.status, status));
			conditions.push(eq(user.isDel, isDel.NORMAL));
		}


		if (email) {
			conditions.push(sql`${user.email} COLLATE NOCASE LIKE ${'%'+ email + '%'}`);
		}


		if (params.isDel) {
			conditions.push(eq(user.isDel, params.isDel));
		}


		const query = orm(c).select({
			...user,
			username: oauth.username,
			trustLevel: oauth.trustLevel,
			avatar: oauth.avatar,
			name: oauth.name
		}).from(user).leftJoin(oauth, eq(oauth.userId, user.userId))
			.where(and(...conditions));


		if (timeSort) {
			query.orderBy(asc(user.userId));
		} else {
			query.orderBy(desc(user.userId));
		}

		const list = await query.limit(size).offset(num);

		const { total } = await orm(c)
			.select({ total: count() })
			.from(user)
			.where(and(...conditions)).get();
		const userIds = list.map(user => user.userId);

		const types = [...new Set(list.map(user => user.type))];

		const [emailCounts, delEmailCounts, sendCounts, delSendCounts, accountCounts, delAccountCounts, roleList] = await Promise.all([
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.RECEIVE),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.RECEIVE, isDel.DELETE),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.SEND),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.SEND, isDel.DELETE),
			accountService.selectUserAccountCountList(c, userIds),
			accountService.selectUserAccountCountList(c, userIds, isDel.DELETE),
			roleService.selectByIdsHasPermKey(c, types,'email:send')
		]);

		const receiveMap = Object.fromEntries(emailCounts.map(item => [item.userId, item.count]));
		const sendMap = Object.fromEntries(sendCounts.map(item => [item.userId, item.count]));
		const accountMap = Object.fromEntries(accountCounts.map(item => [item.userId, item.count]));

		const delReceiveMap = Object.fromEntries(delEmailCounts.map(item => [item.userId, item.count]));
		const delSendMap = Object.fromEntries(delSendCounts.map(item => [item.userId, item.count]));
		const delAccountMap = Object.fromEntries(delAccountCounts.map(item => [item.userId, item.count]));

		for (const user of list) {

			const userId = user.userId;

			user.receiveEmailCount = receiveMap[userId] || 0;
			user.sendEmailCount = sendMap[userId] || 0;
			user.accountCount = accountMap[userId] || 0;

			user.delReceiveEmailCount = delReceiveMap[userId] || 0;
			user.delSendEmailCount = delSendMap[userId] || 0;
			user.delAccountCount = delAccountMap[userId] || 0;

			const roleIndex = roleList.findIndex(roleRow => user.type === roleRow.roleId);
			let sendAction = {};

			if (roleIndex > -1) {
				sendAction.sendType = roleList[roleIndex].sendType;
				sendAction.sendCount = roleList[roleIndex].sendCount;
				sendAction.hasPerm = true;
			} else {
				sendAction.hasPerm = false;
			}

			if (user.email === c.env.admin) {
				sendAction.sendType = constant.ADMIN_ROLE.sendType;
				sendAction.sendCount = constant.ADMIN_ROLE.sendCount;
				sendAction.hasPerm = true;
				user.type = 0
			}

			user.sendAction = sendAction;
		}

		return { list, total };
	},

	async updateUserInfo(c, userId, recordCreateIp = false) {



		const activeIp = reqUtils.getIp(c);

		const {os, browser, device} = reqUtils.getUserAgent(c);

		const params = {
			os,
			browser,
			device,
			activeIp,
			activeTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
		};

		if (recordCreateIp) {
			params.createIp = activeIp;
		}

		await orm(c)
			.update(user)
			.set(params)
			.where(eq(user.userId, userId))
			.run();
	},

	async setPwd(c, params) {

		const { password, userId } = params;
		await this.resetPassword(c, { password }, userId);
		await c.env.kv.delete(KvConst.AUTH_INFO + userId);
	},

	async setStatus(c, params) {

		const { status, userId } = params;

		await orm(c)
			.update(user)
			.set({ status })
			.where(eq(user.userId, userId))
			.run();

		if (status === userConst.status.BAN) {
			await c.env.kv.delete(KvConst.AUTH_INFO + userId);
		}
	},

	async setType(c, params) {

		const { type, userId } = params;

		const roleRow = await roleService.selectById(c, type);

		if (!roleRow) {
			throw new BizError(t('roleNotExist'));
		}

		await orm(c)
			.update(user)
			.set({ type })
			.where(eq(user.userId, userId))
			.run();

	},

	async setRemark(c, params) {

		const { userId, remark } = params;
		const userRemark = typeof remark === 'string' ? remark.trim() : '';

		await orm(c)
			.update(user)
			.set({ remark: userRemark })
			.where(eq(user.userId, userId))
			.run();

	},

	async incrUserSendCount(c, quantity, userId) {
		await orm(c).update(user).set({
			sendCount: sql`${user.sendCount}
	  +
	  ${quantity}`
		}).where(eq(user.userId, userId)).run();
	},

	async updateAllUserType(c, type, curType) {
		await orm(c)
			.update(user)
			.set({ type })
			.where(eq(user.type, curType))
			.run();
	},

	async add(c, params) {

		const { email, type, password, remark } = params;
		const userRemark = typeof remark === 'string' ? remark.trim() : '';

		if (!c.env.domain.includes(emailUtils.getDomain(email))) {
			throw new BizError(t('notEmailDomain'));
		}

		if (password.length < 6) {
			throw new BizError(t('pwdMinLength'));
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}

		const role = await roleService.selectById(c, type);

		if (!role) {
			throw new BizError(t('roleNotExist'));
		}

		const { salt, hash } = await saltHashUtils.hashPassword(password);

		const userId = await userService.insert(c, { email, password: hash, salt, type, remark: userRemark });

		await userService.updateUserInfo(c, userId, true);

		await accountService.insert(c, { userId: userId, email, type, name: emailUtils.getName(email) });
	},

	async batchAdd(c, params) {

		const { content } = params;
		const rows = this.parseBatchAddContent(content);

		if (rows.length > 100) {
			throw new BizError(t('batchAddTooMany'));
		}

		const roleRows = await roleService.roleSelectUse(c);
		const roleMap = new Map(roleRows.map(roleRow => [roleRow.name, roleRow.roleId]));
		const existingAccounts = await accountService.selectByEmailsIncludeDel(c, rows.map(row => row.email));
		const existingAccountMap = new Map(existingAccounts.map(row => [row.email.toLowerCase(), row]));
		const seenEmails = new Set();
		const activeIp = reqUtils.getIp(c);
		const { os, browser, device } = reqUtils.getUserAgent(c);
		const activeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

		const result = {
			totalCount: rows.length,
			successCount: 0,
			failCount: 0,
			failedItems: []
		};

		for (const row of rows) {
			let insertedUserId = 0;
			try {
				const normalizedEmail = row.email.toLowerCase();

				if (seenEmails.has(normalizedEmail)) {
					throw new BizError(t('batchDuplicateEmail'));
				}
				seenEmails.add(normalizedEmail);

				if (!verifyUtils.isEmail(row.email)) {
					throw new BizError(t('notEmail'));
				}

				if (!c.env.domain.includes(emailUtils.getDomain(row.email))) {
					throw new BizError(t('notEmailDomain'));
				}

				if (row.password.length < 6) {
					throw new BizError(t('pwdMinLength'));
				}

				const accountRow = existingAccountMap.get(normalizedEmail);

				if (accountRow && accountRow.is_del === isDel.DELETE) {
					throw new BizError(t('isDelUser'));
				}

				if (accountRow) {
					throw new BizError(t('isRegAccount'));
				}

				const roleId = roleMap.get(row.roleName);

				if (!roleId) {
					throw new BizError(t('roleNotExist'));
				}

				const { salt, hash } = await saltHashUtils.hashPassword(row.password);
				insertedUserId = await userService.insert(c, {
					email: row.email,
					password: hash,
					salt,
					type: roleId,
					remark: row.remark,
					createIp: activeIp,
					activeIp,
					os,
					browser,
					device,
					activeTime
				});

				await accountService.insert(c, {
					userId: insertedUserId,
					email: row.email,
					type: roleId,
					name: emailUtils.getName(row.email)
				});

				existingAccountMap.set(normalizedEmail, { email: row.email, is_del: isDel.NORMAL });
				result.successCount++;
			} catch (error) {
				if (insertedUserId) {
					await orm(c).delete(user).where(eq(user.userId, insertedUserId)).run().catch(() => {});
				}
				result.failCount++;
				result.failedItems.push({
					line: row.line,
					email: row.email,
					reason: error?.message || 'Unknown error'
				});
			}
		}

		return result;
	},

	parseBatchAddContent(content) {
		if (!content || !content.trim()) {
			throw new BizError(t('batchAddEmptyContent'));
		}

		const rows = [];
		const lines = content.split(/\r?\n/);

		for (let index = 0; index < lines.length; index++) {
			const rawLine = lines[index].trim();

			if (!rawLine) {
				continue;
			}

			const parts = rawLine.split('|');

			if (parts.length !== 6 || parts[0] !== '' || parts[5] !== '') {
				throw new BizError(t('batchAddLineFormatInvalid', { line: index + 1 }));
			}

			const email = parts[1].trim();
			const password = parts[2].trim();
			const remark = parts[3].trim();
			const roleName = parts[4].trim();

			if (!email || !password || !roleName) {
				throw new BizError(t('batchAddLineFormatInvalid', { line: index + 1 }));
			}

			rows.push({
				line: index + 1,
				email,
				password,
				remark,
				roleName
			});
		}

		if (!rows.length) {
			throw new BizError(t('batchAddEmptyContent'));
		}

		return rows;
	},

	async resetDaySendCount(c) {
		const roleList = await roleService.selectByIdsAndSendType(c, 'email:send', roleConst.sendType.DAY);
		const roleIds = roleList.map(action => action.roleId);
		await orm(c).update(user).set({ sendCount: 0 }).where(inArray(user.type, roleIds)).run();
	},

	async resetSendCount(c, params) {
		await orm(c).update(user).set({ sendCount: 0 }).where(eq(user.userId, params.userId)).run();
	},

	async restore(c, params) {
		const { userId, type } = params
		await orm(c)
			.update(user)
			.set({ isDel: isDel.NORMAL })
			.where(eq(user.userId, userId))
			.run();
		const userRow = await this.selectById(c, userId);
		await accountService.restoreByEmail(c, userRow.email);

		if (type) {
			await emailService.restoreByUserId(c, userId);
			await accountService.restoreByUserId(c, userId);
		}

	},

	listByRegKeyId(c, regKeyId) {
		return orm(c)
			.select({email: user.email,createTime: user.createTime})
			.from(user)
			.where(eq(user.regKeyId, regKeyId))
			.orderBy(desc(user.userId))
			.all();
	}
};

export default userService;
