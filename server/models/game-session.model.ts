import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

export const createGameSession = (gameSessionObject) => {
	return BaseModel.insertRow(TABLE_NAME.GAME_SESSION, gameSessionObject);
};

export const updateSessionGame = (gameSessionId, gameSessionObject) => {
	return BaseModel.updateRowByField(
		TABLE_NAME.GAME_SESSION,
		gameSessionObject,
		'id',
		gameSessionId
	);
};

export const getLastGameSession = async (userId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.GAME_SESSION}.id as id`)
		.field(`${TABLE_NAME.GAME_SESSION}.patient_id`)
		.field(`${TABLE_NAME.GAME_SESSION}.game_id`)
		.field(`${TABLE_NAME.GAME_SESSION}.game_settings_id`)
		.field(`${TABLE_NAME.GAME_SESSION}.game_summary`)
		.field(`${TABLE_NAME.GAME_SESSION}.session_feedback`)
		.field(`${TABLE_NAME.GAME_SESSION}.end_time`)
		.from(TABLE_NAME.GAME_SESSION)
		.left_join(
			TABLE_NAME.PATIENT,
			null,
			`${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.GAME_SESSION}.patient_id`
		)
		.where(`${TABLE_NAME.PATIENT}.user_id = ?`, userId)
		.order(`${TABLE_NAME.GAME_SESSION}.id`, false)
		.limit(1)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows[0];
};
