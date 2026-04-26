import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import kvObjService from './service/kv-obj-service';
import oauthService from "./service/oauth-service";
import dbBackupService from './service/db-backup-service';
const DAILY_TASK_CRON = '0 16 * * *';
const BACKUP_TASK_CRON = '0 * * * *';
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (['/static/','/attachments/'].some(p => url.pathname.startsWith(p))) {
			 return await kvObjService.toObjResp( { env }, url.pathname.substring(1));
		 }

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(controller, env, ctx) {
		const c = { env };
		if (controller.cron === BACKUP_TASK_CRON) {
			await dbBackupService.runScheduledBackup(c, controller.scheduledTime);
			return;
		}

		if (controller.cron === DAILY_TASK_CRON) {
			await runDailyTasks(c);
		}
	},
};

async function runDailyTasks(c) {
	await verifyRecordService.clearRecord(c);
	await userService.resetDaySendCount(c);
	await emailService.completeReceiveAll(c);
	await oauthService.clearNoBindOathUser(c);
}
