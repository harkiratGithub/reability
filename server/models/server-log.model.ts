import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - +process.env.SERVER_LOGS_DAYS_BACK);

export const createServerLog = async (serverLog: any) => {
	await BaseModel.insertRow(TABLE_NAME.SERVER_LOG, serverLog);
};

export const getServerLogs = async () => {
	const REPORTED_BY_USER_ALIAS = 'reported_by_user_alias';
	const PATIENT_USER_ALIAS = 'patient_user_alias';
	const THERAPIST_USER_ALIAS = 'therapist_user_alias';
	const query = squelPostgres
		.select()
		.field('error_type')
		.field(`${TABLE_NAME.SERVER_LOG}.description`)
		.field('severity')
		.field(`${TABLE_NAME.GAME}.name`, 'game_name')
		.field(`${REPORTED_BY_USER_ALIAS}.user_name`, 'reported_by')
		.field(`${PATIENT_USER_ALIAS}.user_name`, 'patient_user_name')
		.field(`${THERAPIST_USER_ALIAS}.user_name`, 'therapist_user_name')
		.field(`${TABLE_NAME.SERVER_LOG}.created_at`)
		.from(TABLE_NAME.SERVER_LOG)
		.join(TABLE_NAME.GAME, null, `${TABLE_NAME.GAME}.id = ${TABLE_NAME.SERVER_LOG}.game_id`)
		.join(
			TABLE_NAME.USER,
			REPORTED_BY_USER_ALIAS,
			`${REPORTED_BY_USER_ALIAS}.id = ${TABLE_NAME.SERVER_LOG}.reported_by_user_id`
		)
		.join(TABLE_NAME.USER, PATIENT_USER_ALIAS, `${PATIENT_USER_ALIAS}.id = ${TABLE_NAME.SERVER_LOG}.patient_id`)
		.left_join(
			TABLE_NAME.USER,
			THERAPIST_USER_ALIAS,
			`${THERAPIST_USER_ALIAS}.id = ${TABLE_NAME.SERVER_LOG}.therapist_id`
		)
		.where(`${TABLE_NAME.SERVER_LOG}.created_at > ?`, fromDate)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
