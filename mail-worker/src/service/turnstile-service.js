import BizError from '../error/biz-error';
import settingService from './setting-service';
import { t } from '../i18n/i18n'

const turnstileService = {

	async verify(c, token) {

		if (!token) {
			throw new BizError(t('emptyBotToken'),400);
		}

		const settingRow = await settingService.query(c)
		const remoteIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
		const body = new URLSearchParams({
			secret: settingRow.secretKey,
			response: token,
		});

		if (remoteIp) {
			body.append('remoteip', remoteIp);
		}

		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body
		});

		const result = await res.json();

		if (!result.success) {
			console.warn('Turnstile verify failed', {
				errorCodes: result['error-codes'],
				hostname: result.hostname,
				action: result.action,
				hasRemoteIp: !!remoteIp
			});
			throw new BizError(t('botVerifyFail'),400)
		}
	}
};

export default turnstileService;
