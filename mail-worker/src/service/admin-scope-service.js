import BizError from '../error/biz-error';
import { subAdminConst } from '../const/entity-const';
import { t } from '../i18n/i18n';
import userContext from '../security/user-context';
import subAdminService from './sub-admin-service';

const adminScopeService = {

	async resolveActor(c) {
		const currentUser = userContext.getUser(c);

		if (currentUser.email === c.env.admin) {
			return {
				adminType: subAdminConst.type.MAIN,
				userId: currentUser.userId,
				email: currentUser.email
			};
		}

		const subAdminRow = await subAdminService.selectByUserId(c, currentUser.userId);

		if (!subAdminRow) {
			return null;
		}

		return {
			adminType: subAdminConst.type.SUB,
			userId: currentUser.userId,
			email: currentUser.email,
			subAdminId: subAdminRow.subAdminId,
			status: subAdminRow.status
		};
	},

	async assertMainAdmin(c) {
		const actor = await this.resolveActor(c);

		if (!actor || actor.adminType !== subAdminConst.type.MAIN) {
			throw new BizError(t('unauthorized'), 403);
		}

		return actor;
	},

	async assertManageAccess(c) {
		const actor = await this.resolveActor(c);

		if (!actor) {
			return null;
		}

		if (actor.adminType === subAdminConst.type.SUB && actor.status === subAdminConst.status.DISABLED) {
			throw new BizError(t('subAdminDisabled'), 403);
		}

		return actor;
	}
};

export default adminScopeService;
