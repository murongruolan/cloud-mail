import app from '../hono/hono';
import result from '../model/result';
import settingService from '../service/setting-service';
import dbBackupService from '../service/db-backup-service';
import adminScopeService from '../service/admin-scope-service';
import adminActionLogService from '../service/admin-action-log-service';

app.put('/setting/set', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await settingService.set(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'setting.set');
	return c.json(result.ok());
});

app.get('/setting/query', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const setting = await settingService.get(c);
	return c.json(result.ok(setting));
});

app.get('/setting/websiteConfig', async (c) => {
	const setting = await settingService.websiteConfig(c);
	return c.json(result.ok(setting));
})

app.put('/setting/setBackground', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	const key = await settingService.setBackground(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'setting.setBackground');
	return c.json(result.ok(key));
});

app.delete('/setting/deleteBackground', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await settingService.deleteBackground(c);
	await adminActionLogService.log(c, actor, 'setting.deleteBackground');
	return c.json(result.ok());
});

app.post('/setting/runBackup', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	const data = await dbBackupService.triggerManualBackup(c);
	await adminActionLogService.log(c, actor, 'setting.runBackup');
	return c.json(result.ok(data));
});

app.get('/setting/backupStatus', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const data = await dbBackupService.getStatus(c);
	return c.json(result.ok(data));
});

