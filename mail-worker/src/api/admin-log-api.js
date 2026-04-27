import app from '../hono/hono';
import result from '../model/result';
import adminScopeService from '../service/admin-scope-service';
import adminActionLogService from '../service/admin-action-log-service';

app.get('/adminLog/list', async (c) => {
	await adminScopeService.assertMainAdmin(c);
	const data = await adminActionLogService.list(c, c.req.query());
	return c.json(result.ok(data));
});
