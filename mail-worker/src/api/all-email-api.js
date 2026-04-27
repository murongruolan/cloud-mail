import app from '../hono/hono';
import emailService from '../service/email-service';
import result from '../model/result';
import adminScopeService from '../service/admin-scope-service';
import adminActionLogService from '../service/admin-action-log-service';

app.get('/allEmail/list', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const data = await emailService.allList(c, c.req.query());
	return c.json(result.ok(data));
})

app.delete('/allEmail/delete', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	const list = await emailService.physicsDelete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'allEmail.delete');
	return c.json(result.ok(list));
})

app.delete('/allEmail/batchDelete', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await emailService.batchDelete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'allEmail.batchDelete');
	return c.json(result.ok());
})

app.get('/allEmail/latest', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const list = await emailService.allEmailLatest(c, c.req.query());
	return c.json(result.ok(list));
})
