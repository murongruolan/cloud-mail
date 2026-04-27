import constant from '../const/constant';
import KvConst from '../const/kv-const';
import BizError from '../error/biz-error';
import { settingConst } from '../const/entity-const';
import { toUtc } from '../utils/date-uitil';
import backupStorageService from './backup-storage-service';
import settingService from './setting-service';
import { t } from '../i18n/i18n';

const BACKUP_TIME_ZONE = 'Asia/Shanghai';
const MAX_BACKUP_FILES = 5;
const STATUS = {
	IDLE: 'idle',
	RUNNING: 'running',
	SUCCESS: 'success',
	FAILED: 'failed',
};

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

		await this.executeBackup(c, backupTime, {
			updateLastRunDate: today,
			source: 'scheduled'
		});
	},

	async triggerManualBackup(c) {
		const currentStatus = await this.getStatus(c);

		if (currentStatus.status === STATUS.RUNNING) {
			return { started: false, status: currentStatus };
		}

		const startTime = toUtc().tz(BACKUP_TIME_ZONE);
		await this.setStatus(c, {
			status: STATUS.RUNNING,
			stage: 'queued',
			message: 'Backup queued',
			details: '',
			startedAt: startTime.toISOString(),
			finishedAt: null,
			source: 'manual'
		});

		const task = this.executeBackup(c, startTime, { source: 'manual' });

		if (c.executionCtx?.waitUntil) {
			c.executionCtx.waitUntil(task);
		} else {
			await task;
		}

		return { started: true, status: await this.getStatus(c) };
	},

	async getStatus(c) {
		const status = await c.env.kv.get(KvConst.DB_BACKUP_STATUS, { type: 'json' });
		return status || {
			status: STATUS.IDLE,
			stage: 'idle',
			message: '',
			details: '',
			startedAt: null,
			finishedAt: null,
			source: ''
		};
	},

	async setStatus(c, data) {
		await c.env.kv.put(KvConst.DB_BACKUP_STATUS, JSON.stringify(data));
	},

	async executeBackup(c, backupTime, options = {}) {
		try {
			const setting = await settingService.query(c);
			settingService.validateBackupConfig(setting);

			if (!backupStorageService.isConfigured(setting)) {
				throw new BizError(t('backupStorageNotConfig'), 400);
			}

			await this.setStatus(c, {
				status: STATUS.RUNNING,
				stage: 'validating',
				message: 'Validating backup configuration',
				details: '',
				startedAt: options.startedAt || backupTime.toISOString(),
				finishedAt: null,
				source: options.source || 'scheduled'
			});

			await this.setStatus(c, {
				status: STATUS.RUNNING,
				stage: 'exporting',
				message: 'Exporting database tables',
				details: '',
				startedAt: options.startedAt || backupTime.toISOString(),
				finishedAt: null,
				source: options.source || 'scheduled'
			});

			const data = await this.exportAllTables(c, backupTime);
			const fileName = `cloud-mail-backup-${backupTime.format('YYYYMMDD-HHmm')}.json`;
			const key = `${constant.DB_BACKUP_PREFIX}${fileName}`;

			await this.setStatus(c, {
				status: STATUS.RUNNING,
				stage: 'uploading',
				message: 'Uploading backup file',
				details: key,
				startedAt: options.startedAt || backupTime.toISOString(),
				finishedAt: null,
				source: options.source || 'scheduled'
			});

			await backupStorageService.putObj(c, key, JSON.stringify(data, null, 2));

			await this.setStatus(c, {
				status: STATUS.RUNNING,
				stage: 'cleaning',
				message: 'Cleaning old backups',
				details: '',
				startedAt: options.startedAt || backupTime.toISOString(),
				finishedAt: null,
				source: options.source || 'scheduled'
			});

			await this.cleanupOldBackups(c);

			if (options.updateLastRunDate) {
				await c.env.kv.put(KvConst.DB_BACKUP_RUN_AT, options.updateLastRunDate);
			}

			await this.setStatus(c, {
				status: STATUS.SUCCESS,
				stage: 'completed',
				message: 'Backup completed',
				details: key,
				startedAt: options.startedAt || backupTime.toISOString(),
				finishedAt: toUtc().toISOString(),
				source: options.source || 'scheduled'
			});
		} catch (error) {
			await this.setStatus(c, {
				status: STATUS.FAILED,
				stage: 'failed',
				message: error?.message || 'Backup failed',
				details: this.errorDetails(error),
				startedAt: options.startedAt || backupTime.toISOString(),
				finishedAt: toUtc().toISOString(),
				source: options.source || 'scheduled'
			});
			throw error;
		}
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
	},

	errorDetails(error) {
		const details = {
			name: error?.name || '',
			message: error?.message || '',
		};

		if (error?.stack) {
			details.stack = String(error.stack).split('\n').slice(0, 8).join('\n');
		}

		if (error?.cause) {
			details.cause = typeof error.cause === 'string' ? error.cause : JSON.stringify(error.cause);
		}

		return JSON.stringify(details, null, 2);
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
