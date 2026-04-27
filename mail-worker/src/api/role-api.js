import app from '../hono/hono';
import roleService from '../service/role-service';
import userContext from '../security/user-context';
import result from '../model/result';
import permService from '../service/perm-service';
import adminScopeService from '../service/admin-scope-service';
import adminActionLogService from '../service/admin-action-log-service';

app.post('/role/add', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await roleService.add(c, await c.req.json(), userContext.getUserId(c));
	await adminActionLogService.log(c, actor, 'role.add');
	return c.json(result.ok());
});

app.put('/role/setDefault', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await roleService.setDefault(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'role.setDefault');
	return c.json(result.ok());
});

app.put('/role/set', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await roleService.setRole(c, await c.req.json());
	await adminActionLogService.log(c, actor, 'role.set');
	return c.json(result.ok());
});

app.get('/role/permTree', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const tree = await permService.tree(c);
	return c.json(result.ok(tree));
});

app.delete('/role/delete', async (c) => {
	const actor = await adminScopeService.assertMainAdmin(c);
	await roleService.delete(c, c.req.query());
	await adminActionLogService.log(c, actor, 'role.delete');
	return c.json(result.ok());
});

app.get('/role/list', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const roleList = await roleService.roleList(c);
	return c.json(result.ok(roleList));
});

app.get('/role/selectUse', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const roleList = await roleService.roleSelectUse(c);
	return c.json(result.ok(roleList));
});



