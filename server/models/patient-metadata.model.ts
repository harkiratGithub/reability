import squel from 'squel';
import { map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';
import * as Patient from '../models/patient.model';
import * as GameSettingsModel from '../models/game-settings.model';

const squelPostgres = squel.useFlavour('postgres');

export const createPatientMetaData = async (userId, patientData: any) => {
	const patient = await Patient.findPatientByUserId(userId);
	const { id } = await GameSettingsModel.getLastGameSettings(
		patient.id,
		patientData.game_id
	);
	patientData.game_settings_id = id;
	patientData.patient_id = patient.id;
	return BaseModel.insertRow(TABLE_NAME.PATIENT_METADATA, {
		...patientData,
		settings: JSON.stringify(patientData.settings),
	});
};

export const editPatientMetaData = (gameDataId, gameData, client = null) =>
	UtilModel.convertKeysToCamelCase(
		BaseModel.updateRowByField(
			TABLE_NAME.PATIENT_METADATA,
			UtilModel.convertKeysToSnakeCase(gameData),
			'id',
			gameDataId,
			client
		)
	);

export const deletePatientMetaData = async (gameDataIds: number[]) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.PATIENT_METADATA)
		.where(`${TABLE_NAME.PATIENT_METADATA}.id IN (${gameDataIds.join(',')})`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getPatientMetaDataByIds = async (gameDataIds: number[]): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.PATIENT_METADATA)
		.where(`${TABLE_NAME.PATIENT_METADATA}.id IN (${gameDataIds.join(',')})`)
		.order(`${TABLE_NAME.PATIENT_METADATA}.created_at`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getShortPatientMetaData = async (videoName: string): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.PATIENT_METADATA)
		.where(`${TABLE_NAME.PATIENT_METADATA}.video_name = ?`, videoName)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const clearPatientMetaData = async () => {
	const query = squelPostgres.delete().from(TABLE_NAME.PATIENT_METADATA).toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
