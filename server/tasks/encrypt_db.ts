import dotenv from 'dotenv';
dotenv.config();

import * as BaseModel from '../services/BaseModel.service';
import * as EncryptHelper from '../services/encrypt.helper';
import { TABLE_NAME } from '../const';
import { map } from 'lodash';

const cypherTable = async (tableName, client = null) => {
	const all = await BaseModel.getAllTable(tableName);
	const fixed = map(all, (row) => {
		return EncryptHelper.encryptJson(row);
	});
	const fixedPromise = map(fixed, (row: any) => {
		BaseModel.updateRowByField(tableName, row, 'id', row.id, client);
	});
	await Promise.all(fixedPromise);
};

const cypherDb = async () => {
	const updateDb = async (client) => {
		await cypherTable(TABLE_NAME.USER, client);
		await cypherTable(TABLE_NAME.ADMIN, client);
		await cypherTable(TABLE_NAME.PATIENT, client);
		await cypherTable(TABLE_NAME.THERAPIST, client);
	};
	return BaseModel.runAsTransaction(updateDb);
};

cypherDb()
	.then(() => console.log('success cypherDb'))
	.catch((err) => console.warn('something went wrong ?', err));
