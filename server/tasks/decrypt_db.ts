import dotenv from 'dotenv';
dotenv.config();

import * as BaseModel from '../services/BaseModel.service';
import * as EncryptHelper from '../services/encrypt.helper';
import { TABLE_NAME } from '../const';
import { map } from 'lodash';

const decypherTable = async (tableName, client = null) => {
	const all = await BaseModel.getAllTable(tableName);
	const fixed = map(all, (row) => {
		return EncryptHelper.decryptJson(row);
	});
	const fixedPromise = map(fixed, (row: any) => {
		BaseModel.updateRowByField(tableName, row, 'id', row.id, client);
	});
	await Promise.all(fixedPromise);
};

const decypherDb = async () => {
	const updateDb = async (client) => {
		await decypherTable(TABLE_NAME.USER, client);
		await decypherTable(TABLE_NAME.PATIENT, client);
		await decypherTable(TABLE_NAME.THERAPIST, client);
	};
	return BaseModel.runAsTransaction(updateDb);
};

decypherDb()
	.then(() => console.log('success cypherDb'))
	.catch((err) => console.warn('something went wrong ?', err));
