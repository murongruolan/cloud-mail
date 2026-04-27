import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';
import accountService from '../service/account-service';
import adminScopeService from '../service/admin-scope-service';
import adminActionLogService from '../service/admin-action-log-service';

app.delete('/user/delete', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.physicsDelete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'user.delete');
	return c.json(result.ok());
});

app.put('/user/setPwd', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.setPwd(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.setPwd');
	return c.json(result.ok());
});

app.put('/user/setStatus', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.setStatus(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.setStatus');
	return c.json(result.ok());
});

app.put('/user/setType', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.setType(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.setType');
	return c.json(result.ok());
});

app.put('/user/setRemark', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.setRemark(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.setRemark');
	return c.json(result.ok());
});

app.get('/user/list', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const data = await userService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/user/add', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.add(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.add');
	return c.json(result.ok());
});

app.put('/user/resetSendCount', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.resetSendCount(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.resetSendCount');
	return c.json(result.ok());
});

app.put('/user/restore', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await userService.restore(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'user.restore');
	return c.json(result.ok());
});

app.get('/user/allAccount', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const data = await accountService.allAccount(c, c.req.query());
	return c.json(result.ok(data));
});

app.delete('/user/deleteAccount', async (c) => {
	const actor = await adminScopeService.assertManageAccess(c);
	await accountService.physicsDelete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'user.deleteAccount');
	return c.json(result.ok());
});


