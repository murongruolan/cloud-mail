import BizError from '../error/biz-error';
import orm from '../entity/orm';
import email from '../entity/email';
import account from '../entity/account';
import { and, desc, eq } from 'drizzle-orm';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import settingService from './setting-service';
import userService from './user-service';
import verifyUtils from '../utils/verify-utils';
import cryptoUtils from '../utils/crypto-utils';

const APP_KEY_HEADER = 'c-app-key';

const appApiService = {
	async verifyAccess(c) {
		const apiConfig = await settingService.getApiConfig(c);

		if (apiConfig.apiStatus !== settingConst.appApi.OPEN) {
			return false;
		}

		const appKey = c.req.header(APP_KEY_HEADER);
		return !!apiConfig.apiKey && appKey === apiConfig.apiKey;
	},

	async createUser(c, params) {
		const { domain, localPart, permission, remark } = params;
		const normalizedDomain = String(domain || '').trim().replace(/^@+/, '').toLowerCase();
		const normalizedLocalPart = String(localPart || '').trim();
		const address = `${normalizedLocalPart}@${normalizedDomain}`;
		const roleId = Number(permission);

		if (!verifyUtils.isEmail(address)) {
			throw new BizError('Invalid email address', 400);
		}

		if (!Number.isInteger(roleId) || roleId <= 0) {
			throw new BizError('Invalid permission', 400);
		}

		const userId = await userService.add(c, {
			email: address,
			type: roleId,
			password: cryptoUtils.genRandomPwd(16),
			remark
		});

		return { userId, address };
	},

	async unreadMessages(c, params) {
		const userId = Number(params.userId);

		if (!Number.isInteger(userId) || userId <= 0) {
			throw new BizError('Invalid userId', 400);
		}

		const rows = await orm(c)
			.select({
				emailId: email.emailId,
				sendEmail: email.sendEmail,
				toEmail: email.toEmail,
				createTime: email.createTime
			})
			.from(email)
			.leftJoin(account, eq(account.accountId, email.accountId))
			.where(and(
				eq(email.userId, userId),
				eq(email.type, emailConst.type.RECEIVE),
				eq(email.status, emailConst.status.RECEIVE),
				eq(email.unread, emailConst.unread.UNREAD),
				eq(email.isDel, isDel.NORMAL),
				eq(account.isDel, isDel.NORMAL)
			))
			.orderBy(desc(email.createTime), desc(email.emailId))
			.all();

		return {
			messages: rows.map(row => ({
				id: row.emailId,
				from: row.sendEmail || '',
				to: row.toEmail || '',
				createdAt: toUnixSeconds(row.createTime)
			}))
		};
	},

	async messageDetail(c, params) {
		const id = Number(params.messageID || params.messageId || params.id);

		if (!Number.isInteger(id) || id <= 0) {
			throw new BizError('Invalid messageID', 400);
		}

		const row = await orm(c)
			.select()
			.from(email)
			.where(and(
				eq(email.emailId, id),
				eq(email.isDel, isDel.NORMAL)
			))
			.get();

		if (!row) {
			throw new BizError('Message not found', 404);
		}

		return {
			id: row.emailId,
			from: row.sendEmail || '',
			to: row.toEmail || '',
			content: row.content || row.text || '',
			createdAt: toUnixSeconds(row.createTime)
		};
	},

	async markRead(c, params) {
		const id = Number(params.id);

		if (!Number.isInteger(id) || id <= 0) {
			throw new BizError('Invalid id', 400);
		}

		await orm(c)
			.update(email)
			.set({ unread: emailConst.unread.READ })
			.where(and(
				eq(email.emailId, id),
				eq(email.isDel, isDel.NORMAL)
			))
			.run();
	}
};

function toUnixSeconds(value) {
	if (!value) {
		return 0;
	}

	const normalized = typeof value === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
		? `${value.replace(' ', 'T')}Z`
		: value;
	const time = new Date(normalized).getTime();

	return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
}

export default appApiService;
