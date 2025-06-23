import squel from 'squel';
import { map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';

const squelPostgres = squel.useFlavour('postgres');

export const createGameMetaData = async (gameData: any) => {
	return BaseModel.insertRow(TABLE_NAME.GAME_METADATA, {
		...gameData,
		settings: JSON.stringify(gameData.settings),
		landmarks: JSON.stringify(gameData.landmarks),
		landmarks_pointer: JSON.stringify(gameData.landmarks_pointer),
		landmarks_line_pointer: JSON.stringify(gameData.landmarks_line_pointer),
	});
};

export const editGameMetaData = (gameDataId, gameData, client = null) =>
	UtilModel.convertKeysToCamelCase(
		BaseModel.updateRowByField(
			TABLE_NAME.GAME_METADATA,
			UtilModel.convertKeysToSnakeCase(gameData),
			'id',
			gameDataId,
			client
		)
	);

export const deleteGameMetaData = async (gameDataIds: number[]) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.GAME_METADATA)
		.where(`${TABLE_NAME.GAME_METADATA}.id IN (${gameDataIds.join(',')})`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getGameMetaDataByIds = async (gameDataIds: number[]): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.GAME_METADATA)
		.where(`${TABLE_NAME.GAME_METADATA}.id IN (${gameDataIds.join(',')})`)
		.order(`${TABLE_NAME.GAME_METADATA}.created_at`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getShortGameMetaData = async (videoName: string): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.GAME_METADATA)
		.where(`${TABLE_NAME.GAME_METADATA}.video_name = ?`, videoName)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const clearGameMetaData = async () => {
	const query = squelPostgres.delete().from(TABLE_NAME.GAME_METADATA).toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
