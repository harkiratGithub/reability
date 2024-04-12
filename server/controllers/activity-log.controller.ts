import * as ActivityLogHelper from '../helpers/activity-log.helper';

export const createActivityLogEntry = async (req, res, next) => {
	const { userId, action, tableName, rowId, performedByUserId, oldValues, newValues, remarks } = req.body;

	try {
		await ActivityLogHelper.createLog(
			performedByUserId,
			userId,
			tableName,
			action,
			rowId,
			oldValues,
			newValues,
			remarks
		);
		res.json({ status: 'ok' });
	} catch (err) {
		next(err);
	}
};
