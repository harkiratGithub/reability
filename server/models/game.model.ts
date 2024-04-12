import * as UtilModel from './util.model';
import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const gameValidationObject = [
	{ key: 'gameName', type: 'string', required: true },
	{ key: 'url', type: 'string', required: true },
];

export const gameValidator = (gameObject) => {
	return UtilModel.modelValidator(gameValidationObject, gameObject, 'gameValidator');
};

export const getValidGameForPatient = async (patientId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.GAME}.id`)
		.field(`${TABLE_NAME.GAME}.name`)
		.field(`${TABLE_NAME.GAME}.url`)
		.field(`${TABLE_NAME.GAME}.body_track_required`)
		.field(`${TABLE_NAME.GAME}.position`)
		.field(`${TABLE_NAME.GAME}.description`)
		.field(`${TABLE_NAME.PATIENT_GAME}.active as is_enable`)
		.from(TABLE_NAME.PATIENT_GAME)
		.right_join(TABLE_NAME.GAME, null, `${TABLE_NAME.GAME}.id = ${TABLE_NAME.PATIENT_GAME}.game_id`)
		.where(`${TABLE_NAME.PATIENT_GAME}.patient_id = ?`, patientId)
		.order(`${TABLE_NAME.GAME}.position`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const addGameToPatient = async (patientId: number, gameId: number) => {
	const dataToInsert = {
		patient_id: patientId,
		game_id: gameId,
		active: true,
	};
	return await BaseModel.insertRow(TABLE_NAME.PATIENT_GAME, dataToInsert);
};

export const removeGameFromPatient = async (patientId: number, gameId: number) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.PATIENT_GAME)
		.where(`patient_id = ?`, patientId)
		.where(`game_id = ?`, gameId)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows?.[0];
};
