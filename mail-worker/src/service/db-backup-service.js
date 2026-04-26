import constant from '../const/constant';
import KvConst from '../const/kv-const';
import { settingConst } from '../const/entity-const';
import { toUtc } from '../utils/date-uitil';
import backupStorageService from './backup-storage-service';
import settingService from './setting-service';

const BACKUP_TIME_ZONE = 'Asia/Shanghai';
const MAX_BACKUP_FILES = 5;

const dbBackupService = {

	async runScheduledBackup(c, scheduledTime) {
		const setting = await settingService.query(c);

		if (setting.backupDb !== settingConst.backupDb.OPEN) {
			return;
		}

		if (!backupStorageService.isConfigured(setting)) {
			console.warn('Database backup skipped: backup storage is not configured.');
			return;
		}

		const backupTime = toUtc(scheduledTime).tz(BACKUP_TIME_ZONE).second(0).millisecond(0);

		if (backupTime.hour() !== Number(setting.backupHour)) {
			return;
		}

		const today = backupTime.format('YYYY-MM-DD');
		const lastRunDate = await c.env.kv.get(KvConst.DB_BACKUP_RUN_AT);
		const intervalDays = Number(setting.backupIntervalDays) || 1;

		if (lastRunDate && diffDays(lastRunDate, today) < intervalDays) {
			return;
		}

		const data = await this.exportAllTables(c, backupTime);
		const fileName = `cloud-mail-backup-${backupTime.format('YYYYMMDD-HHmm')}.json`;
		const key = `${constant.DB_BACKUP_PREFIX}${fileName}`;

		await backupStorageService.putObj(c, key, JSON.stringify(data, null, 2));
		await this.cleanupOldBackups(c);
		await c.env.kv.put(KvConst.DB_BACKUP_RUN_AT, today);
	},

	async exportAllTables(c, backupTime) {
		const { results } = await c.env.db.prepare(
			`SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
		).all();

		const tables = {};

		for (const table of results) {
			if (!/^[A-Za-z0-9_-]+$/.test(table.name)) {
				continue;
			}

			const tableResult = await c.env.db.prepare(`SELECT * FROM "${table.name}"`).all();

			tables[table.name] = {
				schema: table.sql,
				rows: tableResult.results || []
			};
		}

		return {
			generatedAt: backupTime.toISOString(),
			timeZone: BACKUP_TIME_ZONE,
			type: 'cloud-mail-db-backup',
			version: 1,
			tables
		};
	},

	async cleanupOldBackups(c) {
		const files = await backupStorageService.listObjs(c, constant.DB_BACKUP_PREFIX);

		if (files.length <= MAX_BACKUP_FILES) {
			return;
		}

		const sortedFiles = files
			.filter(file => file.Key)
			.sort((a, b) => new Date(b.LastModified || 0) - new Date(a.LastModified || 0));

		const deleteKeys = sortedFiles.slice(MAX_BACKUP_FILES).map(file => file.Key);
		await backupStorageService.deleteObjs(c, deleteKeys);
	}
};

function diffDays(fromDate, toDate) {
	const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
	const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
	const fromTime = Date.UTC(fromYear, fromMonth - 1, fromDay);
	const toTime = Date.UTC(toYear, toMonth - 1, toDay);
	return Math.floor((toTime - fromTime) / 86400000);
}

export default dbBackupService;
