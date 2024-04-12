import squel from 'squel';

import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';
import * as UtilHelper from './util.model';

const squelPostgres = squel.useFlavour('postgres');

export interface IFollowup {
	id?: number;
	therapist_id?: number | null;
	patient_id: number;
	patient_full_name?: string;
	therapist_full_name?: string;
	description: string;
	date: Date;
	done: boolean;
}

const followupValidationObject = [
	{ key: 'id', type: 'number', required: false },
	{ key: 'therapist_id', type: 'number', required: false },
	{ key: 'patient_id', type: 'number', required: true },
	{ key: 'description', type: 'string', required: true },
	{ key: 'date', type: 'string', required: true },
	{ key: 'done', type: 'boolean', required: false },
];

export const followupValidator = (followupObject): void => {
	UtilHelper.modelValidator(followupValidationObject, followupObject, 'followupValidator');
};

export const getAll = async (): Promise<IFollowup[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.FOLLOWUP}.*`)
		.field(`${TABLE_NAME.PATIENT}.first_name`, 'patient_first_name')
		.field(`${TABLE_NAME.PATIENT}.last_name`, 'patient_last_name')
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.THERAPIST}.first_name`, 'therapist_first_name')
		.field(`${TABLE_NAME.THERAPIST}.last_name`, 'therapist_last_name')
		.from(TABLE_NAME.FOLLOWUP)
		.join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.FOLLOWUP}.patient_id = ${TABLE_NAME.PATIENT}.id`)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
		.left_join(TABLE_NAME.THERAPIST, null, `${TABLE_NAME.FOLLOWUP}.therapist_id = ${TABLE_NAME.THERAPIST}.id`)
		.where(`${TABLE_NAME.FOLLOWUP}.done = ? AND ${TABLE_NAME.USER}.active = ?`, false, true)
		.order('date', true)
		.toParam();
	const encryptedResult = await BaseModel.runQuery(query);
	return encryptedResult.rows;
};

export const updateById = (followup: IFollowup): Promise<IFollowup> => {
	const { therapist_id = null, date, description } = followup;
	return BaseModel.updateRowByField(TABLE_NAME.FOLLOWUP, { therapist_id, date, description }, 'id', followup.id, null);
};

export const remove = async (id: number, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.FOLLOWUP)
		.set('done', true)
		.where(`id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const create = (followup: IFollowup) => {
	return BaseModel.createRow(TABLE_NAME.FOLLOWUP, followup, followupValidator);
};

export const getFollowupById = async (id: number) => {
	const result = await BaseModel.itemsByField(TABLE_NAME.FOLLOWUP, 'id', id);
	return result?.[0];
};
