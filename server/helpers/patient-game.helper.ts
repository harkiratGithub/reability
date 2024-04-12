import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import { map } from 'lodash';

export const createAllGamesToPatient = async (patientId, client = null) => {
	const allGames = await BaseModel.getAllTable(TABLE_NAME.GAME, client);
	const gamePatientConnection = map(allGames, (game) => {
		return {
			game_id: game.id,
			patient_id: patientId,
		};
	});
	await BaseModel.insertBulk(
		TABLE_NAME.PATIENT_GAME,
		gamePatientConnection,
		client
	);
};
