import { chain, map, reduce } from 'lodash';

import { TABLE_NAME } from '../const';
import { IActivityLog, LogAction, logToDb } from '../models/activity-log.model';
import { IReminder } from '../models/lead.model';
import { convertKeysToSnakeCase } from '../models/util.model';
import * as BaseModel from '../services/BaseModel.service';

export const createLog = (
	performedByUserId: number,
	userId: number,
	tableName: string,
	action: LogAction,
	rowId: number,
	oldValues: Record<string, any>,
	newValues: Record<string, any>,
	remarks: string = '',
	createdAt?: any
) => {
	const log = transformToLog(
		performedByUserId,
		userId,
		tableName,
		action,
		rowId,
		oldValues,
		newValues,
		remarks,
		createdAt
	);
	logToDb(log);
};
const transformToLog = (
	performedByUserId: number,
	userId: number,
	tableName: string,
	action: LogAction,
	rowId: number,
	oldValues: Record<string, any>,
	newValues: Record<string, any>,
	remarks: string = '',
	createdAt?: any
): IActivityLog => ({
	userId,
	action,
	tableName,
	rowId,
	performedByUserId,
	oldValues,
	newValues,
	remarks,
	...(createdAt && { createdAt }),
});

export const createLogsFromReminders = (allLeadReminders: IReminder[], patientUserId: number, client = null) => {
	const logsArray = map(allLeadReminders, (leadReminder) =>
		convertKeysToSnakeCase(
			transformToLog(
				leadReminder.performed_by_user_id,
				patientUserId,
				TABLE_NAME.ACTIVITY_LOG,
				LogAction.Create,
				0,
				null,
				null,
				leadReminder.reminder,
				leadReminder.created_at
			)
		)
	);
	return BaseModel.insertBulk(TABLE_NAME.ACTIVITY_LOG, logsArray, client);
};

export const isCreateOrUpdateByDate = (created, updated): LogAction => {
	if (created === updated) {
		return LogAction.Create;
	}
	return LogAction.Update;
};

export const getOnlyOldKeys = (obj: Record<string, any>): Record<string, any> =>
	chain(obj)
		.keys()
		.filter((key) => {
			return key.substring(0, 4) === 'old_';
		})
		.reduce((cur, key) => {
			const keyWithoutOld = key.substring(4);
			return Object.assign(cur, { [keyWithoutOld]: obj[key] });
		}, {})
		.value();

export const getOldValuesFromDb = (keys: string[], tableName: string) =>
	reduce(
		keys,
		(prev, curr, indx) => {
			if (indx === keys.length - 1) {
				return (prev += `${tableName}.${curr} AS old_${curr}`);
			}
			return (prev += `${tableName}.${curr} AS old_${curr}, `);
		},
		''
	);
