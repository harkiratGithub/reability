import squel from 'squel';
import { map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';

const squelPostgres = squel.useFlavour('postgres');

export const createUserGameData = async (userGameData: any[], client = null) => {
	const dataToInsert = map(userGameData, (item) => UtilModel.convertKeysToSnakeCase(item));
	const result = await BaseModel.insertBulk(TABLE_NAME.USER_GAME_DATA, dataToInsert, client);
	return map(result, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const editUserGameData = async (userGameDataId, userGameData, client = null) =>
	UtilModel.convertKeysToCamelCase(
		await BaseModel.updateRowByField(
			TABLE_NAME.USER_GAME_DATA,
			UtilModel.convertKeysToSnakeCase(userGameData),
			'id',
			userGameDataId,
			client
		)
	);

export const deleteUserGameData = async (userGameDataIds: number[]) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.USER_GAME_DATA)
		.where(`${TABLE_NAME.USER_GAME_DATA}.id IN (${userGameDataIds.join(',')})`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const getUserGameData = async (gameId, userId: number): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.USER_GAME_DATA)
		.where(`${TABLE_NAME.USER_GAME_DATA}.game_id = ? AND  ${TABLE_NAME.USER_GAME_DATA}.user_id = ?`, gameId, userId)
		.order(`${TABLE_NAME.USER_GAME_DATA}.created_at`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const updateUserGameDataStatus = async (userGameDataIds: number[], active: boolean, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.USER_GAME_DATA)
		.set('active', active)
		.where(`id IN (${userGameDataIds.join(',')})`)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};

export const changeUserGameDataDrawer = async (userGameDataIds: number[], drawer: string, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.USER_GAME_DATA)
		.set('drawer', drawer)
		.where(`id IN (${userGameDataIds.join(',')})`)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query);
	return map(result.rows, (item) => UtilModel.convertKeysToCamelCase(item));
};
