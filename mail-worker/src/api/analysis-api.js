import app from '../hono/hono';
import analysisService from '../service/analysis-service';
import result from '../model/result';
import adminScopeService from '../service/admin-scope-service';

app.get('/analysis/echarts', async (c) => {
	await adminScopeService.assertManageAccess(c);
	const data = await analysisService.echarts(c, c.req.query());
	return c.json(result.ok(data));
})
