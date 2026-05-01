import app from '../hono/hono';
import appApiService from '../service/app-api-service';

const appResult = {
	ok(data = null) {
		return { success: true, data };
	},
	fail() {
		return { success: false, data: null };
	}
};

app.post('/app/createUser', async (c) => {
	return handleAppApi(c, async () => appApiService.createUser(c, await c.req.json()));
});

app.get('/app/unreadMessages', async (c) => {
	return handleAppApi(c, async () => appApiService.unreadMessages(c, c.req.query()));
});

app.get('/app/messageDetail', async (c) => {
	return handleAppApi(c, async () => appApiService.messageDetail(c, c.req.query()));
});

app.post('/app/markRead', async (c) => {
	return handleAppApi(c, async () => {
		await appApiService.markRead(c, await c.req.json());
		return null;
	});
});

async function handleAppApi(c, handler) {
	try {
		if (!await appApiService.verifyAccess(c)) {
			return c.json(appResult.fail());
		}

		const data = await handler();
		return c.json(appResult.ok(data));
	} catch (e) {
		console.error('App API request failed:', e);
		return c.json(appResult.fail());
	}
}
