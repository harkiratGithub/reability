import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

export const getLastGameSettings = async (patient_id, game_id) => {
	const query = squelPostgres
		.select()
		.field('id')
		.field('settings')
		.from(TABLE_NAME.GAME_SETTINGS)
		.where(`${TABLE_NAME.GAME_SETTINGS}.patient_id = ?`, patient_id)
		.where(`${TABLE_NAME.GAME_SETTINGS}.game_id = ?`, game_id)
		.order('id', false)
		.limit(1)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows.length > 0 ? result.rows[0] : { settings: {}, id: null };
};

export const createNewSettings = (patient_id, game_id, settings) => {
	return BaseModel.insertRow(TABLE_NAME.GAME_SETTINGS, {
		patient_id,
		game_id,
		settings,
	});
};
