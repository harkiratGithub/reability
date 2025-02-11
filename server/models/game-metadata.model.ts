import squel from 'squel';
import { map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';

const squelPostgres = squel.useFlavour('postgres');

export const createGameMetaData = async (gameData: any[], client = null) => {
	const data = map(gameData, (item) => UtilModel.convertKeysToSnakeCase(item));
	const createdGameMetaData = await BaseModel.insertBulk(TABLE_NAME.GAME_METADATA, data, client);
	return map(createdGameMetaData, (item) => UtilModel.convertKeysToCamelCase(item));
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

export const updateGameMetaDataStatus = async (gameDataIds: number[], active: boolean, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.GAME_METADATA)
		.set('active', active)
		.where(`id IN (${gameDataIds.join(',')})`)
		.returning('*')
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

export const getShortGameMetaData = async (gameId: number): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.GAME_METADATA}.id`)
		.field(`${TABLE_NAME.GAME_METADATA}.worksheet`)
		.field(`${TABLE_NAME.GAME_METADATA}.tags`)
		.from(TABLE_NAME.GAME_METADATA)
		.where(`${TABLE_NAME.GAME_METADATA}.game_id = ? AND  active = true`, gameId)
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

export const clearGameMetaData = async () => {
	const query = squelPostgres.delete().from(TABLE_NAME.GAME_METADATA).toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
