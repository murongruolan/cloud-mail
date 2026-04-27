import app from '../hono/hono';
import result from '../model/result';
import regKeyService from '../service/reg-key-service';
import userContext from '../security/user-context';
import adminScopeService from '../service/admin-scope-service';
import adminActionLogService from '../service/admin-action-log-service';

app.post('/regKey/add', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await regKeyService.add(c, await c.req.json(), await userContext.getUserId(c));
	await adminActionLogService.log(c, actor, 'regKey.add');
	return c.json(result.ok());
})

app.get('/regKey/list', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const list = await regKeyService.list(c, c.req.query());
	 return c.json(result.ok(list));
})

app.delete('/regKey/delete', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await regKeyService.delete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'regKey.delete');
	return c.json(result.ok());
})

app.delete('/regKey/clearNotUse', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await regKeyService.clearNotUse(c);
	await adminActionLogService.log(c, actor, 'regKey.clearNotUse');
	return c.json(result.ok());
})

app.get('/regKey/history', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const list = await regKeyService.history(c, c.req.query());
	return c.json(result.ok(list));
})
