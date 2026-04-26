import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import domainUtils from '../utils/domain-uitls';
import settingService from './setting-service';
import { settingConst } from '../const/entity-const';

const backupStorageService = {

	isConfigured(setting) {
		return !!(setting.backupBucket && setting.backupEndpoint && setting.backupS3AccessKey && setting.backupS3SecretKey);
	},

	async putObj(c, key, content) {
		const client = await this.client(c);
		const setting = await settingService.query(c);

		await client.send(new PutObjectCommand({
			Bucket: setting.backupBucket,
			Key: key,
			Body: content,
			ContentType: 'application/json',
			ContentDisposition: `attachment; filename="${key.split('/').at(-1)}"`,
			CacheControl: 'no-store'
		}));
	},

	async listObjs(c, prefix) {
		const client = await this.client(c);
		const setting = await settingService.query(c);
		const result = await client.send(new ListObjectsV2Command({
			Bucket: setting.backupBucket,
			Prefix: prefix
		}));

		return result.Contents || [];
	},

	async deleteObjs(c, keys) {
		if (!keys.length) {
			return;
		}

		const client = await this.client(c);
		const setting = await settingService.query(c);

		client.middlewareStack.add(
			(next) => async (args) => {
				const body = args.request.body;
				const encoder = new TextEncoder();
				const data = encoder.encode(body);
				const hashBuffer = await crypto.subtle.digest('MD5', data);
				const hashArray = new Uint8Array(hashBuffer);
				const contentMD5 = btoa(String.fromCharCode.apply(null, hashArray));

				args.request.headers["Content-MD5"] = contentMD5;

				return next(args);
			},
			{ step: 'build', name: 'backupDeleteMd5Middleware' }
		);

		await client.send(new DeleteObjectsCommand({
			Bucket: setting.backupBucket,
			Delete: {
				Objects: keys.map(key => ({ Key: key }))
			}
		}));
	},

	async client(c) {
		const setting = await settingService.query(c);
		return new S3Client({
			region: setting.backupRegion || 'auto',
			endpoint: domainUtils.toOssDomain(setting.backupEndpoint),
			forcePathStyle: setting.backupForcePathStyle === settingConst.forcePathStyle.OPEN,
			credentials: {
				accessKeyId: setting.backupS3AccessKey,
				secretAccessKey: setting.backupS3SecretKey,
			}
		});
	}
};

export default backupStorageService;
