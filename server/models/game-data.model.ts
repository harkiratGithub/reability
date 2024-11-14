import squel from 'squel';
import { map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';

const squelPostgres = squel.useFlavour('postgres');

export const createGameData = async (gameData: any[], client = null) => {
	const data = map(gameData, (item) => UtilModel.convertKeysToSnakeCase(item));
	const createdGameData = await BaseModel.insertBulk(TABLE_NAME.GAME_DATA, data, client);
	return map(createdGameData, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const editGameData = (gameDataId, gameData, client = null) =>
	UtilModel.convertKeysToCamelCase(
		BaseModel.updateRowByField(
			TABLE_NAME.GAME_DATA,
			UtilModel.convertKeysToSnakeCase(gameData),
			'id',
			gameDataId,
			client
		)
	);

export const deleteGameData = async (gameDataIds: number[]) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.GAME_DATA)
		.where(`${TABLE_NAME.GAME_DATA}.id IN (${gameDataIds.join(',')})`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const updateGameDataStatus = async (gameDataIds: number[], active: boolean, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.GAME_DATA)
		.set('active', active)
		.where(`id IN (${gameDataIds.join(',')})`)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getGameDataByIds = async (gameDataIds: number[]): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.GAME_DATA)
		.where(`${TABLE_NAME.GAME_DATA}.id IN (${gameDataIds.join(',')})`)
		.order(`${TABLE_NAME.GAME_DATA}.created_at`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getShortGameData = async (gameId: number): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.GAME_DATA}.id`)
		.field(`${TABLE_NAME.GAME_DATA}.worksheet`)
		.field(`${TABLE_NAME.GAME_DATA}.tags`)
		.from(TABLE_NAME.GAME_DATA)
		.where(`${TABLE_NAME.GAME_DATA}.game_id = ? AND  active = true`, gameId)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getAllGames = async () => {
	const query = squelPostgres.select().from(TABLE_NAME.GAME).toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getAllEndGames = async () => {
	const query = squelPostgres.select().from(TABLE_NAME.GAME).toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const clearGameData = async () => {
	const query = squelPostgres.delete().from(TABLE_NAME.GAME_DATA).toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
