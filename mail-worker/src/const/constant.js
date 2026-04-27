const constant = {
	TOKEN_HEADER: 'Authorization',
	JWT_UID: 'user_id:',
	JWT_TOKEN: 'token:',
	TOKEN_EXPIRE: 60 * 60 * 24 * 30,
	ATTACHMENT_PREFIX: 'attachments/',
	BACKGROUND_PREFIX: 'static/background/',
	DB_BACKUP_PREFIX: 'db-backups/',
	SUB_ADMIN_PERMS: [
		'analysis:query',
		'user:query',
		'user:add',
		'user:set-pwd',
		'user:set-status',
		'user:set-type',
		'user:delete',
		'user:reset-send',
		'all-email:query',
		'all-email:delete',
		'reg-key:query',
		'reg-key:add',
		'reg-key:delete'
	],
	ADMIN_ROLE: {
		name: 'admin',
		sendCount: 0,
		sendType: 'count',
		accountCount: 0
	}
}

export default constant
