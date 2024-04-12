import squel from 'squel';

import { convertKeysToSnakeCase } from './util.model';
import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';

const squelPostgres = squel.useFlavour('postgres');

export interface IActivityLog {
	userId: number;
	action: LogAction;
	tableName: string;
	rowId: number;
	performedByUserId: number;
	oldValues?: Record<string, any>;
	newValues?: Record<string, any>;
	remarks?: string;
	createdAt?: any;
}

export enum LogAction {
	Update = 'Update',
	Delete = 'Delete',
	Create = 'Create',
}

export const logToDb = (log: IActivityLog) => {
	const newValues = log.newValues ? JSON.stringify(log.newValues) : null;
	const oldValues = log.oldValues ? JSON.stringify(log.oldValues) : null;
	BaseModel.insertRow(
		TABLE_NAME.ACTIVITY_LOG,
		convertKeysToSnakeCase({
			...log,
			newValues,
			oldValues,
		})
	);
};

export const getLog = async (userId: number) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.ACTIVITY_LOG}.user_id`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.action`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.table_name`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.old_values`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.new_values`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.remarks`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.created_at`)
		.field(`${TABLE_NAME.ACTIVITY_LOG}.performed_by_user_id`)
		.field(
			`case when users.role='admin' then admin.first_name when users.role='therapist' then therapist.first_name when users.role='patient' then patient.first_name else '' end`,
			'first_name'
		)
		.field(
			`case when users.role='admin' then admin.last_name when users.role='therapist' then therapist.last_name when users.role='patient' then patient.last_name else '' end`,
			'last_name'
		)
		.field(`${TABLE_NAME.USER}.role`)
		.from(TABLE_NAME.ACTIVITY_LOG)
		.left_join(
			TABLE_NAME.THERAPIST,
			null,
			`${TABLE_NAME.THERAPIST}.user_id = ${TABLE_NAME.ACTIVITY_LOG}.performed_by_user_id`
		)
		.left_join(
			TABLE_NAME.PATIENT,
			null,
			`${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.ACTIVITY_LOG}.performed_by_user_id`
		)
		.left_join(TABLE_NAME.ADMIN, null, `${TABLE_NAME.ADMIN}.user_id = ${TABLE_NAME.ACTIVITY_LOG}.performed_by_user_id`)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.USER}.id = ${TABLE_NAME.ACTIVITY_LOG}.performed_by_user_id`)
		.where(`${TABLE_NAME.ACTIVITY_LOG}.user_id = ?`, userId)
		.order('created_at', false)
		.toParam();

	const result = await BaseModel.runQuery(query);
	return result.rows;
};
