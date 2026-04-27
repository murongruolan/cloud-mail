import app from '../hono/hono';
import result from '../model/result';
import subAdminService from '../service/sub-admin-service';
import adminScopeService from '../service/admin-scope-service';
import userContext from '../security/user-context';
import adminActionLogService from '../service/admin-action-log-service';

app.get('/subAdmin/list', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const data = await subAdminService.list(c, c.req.query());
	return c.json(result.ok(data));
});

app.get('/subAdmin/candidateList', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const data = await subAdminService.candidateList(c, c.req.query());
	return c.json(result.ok(data));
});

app.post('/subAdmin/add', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await subAdminService.add(c, await c.req.json(), userContext.getUserId(c));
	await adminActionLogService.log(c, actor, 'subAdmin.add');
	return c.json(result.ok());
});

app.put('/subAdmin/setStatus', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await subAdminService.setStatus(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'subAdmin.setStatus');
	return c.json(result.ok());
});

app.put('/subAdmin/setRemark', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await subAdminService.setRemark(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'subAdmin.setRemark');
	return c.json(result.ok());
});

app.delete('/subAdmin/delete', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await subAdminService.delete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'subAdmin.delete');
	return c.json(result.ok());
});
