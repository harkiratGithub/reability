import squel from 'squel';

import { ARRAY_TO_POSTGRES_ARRAY_COLUMNS, TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';

const squelPostgres = squel.useFlavour('postgres');

export interface IUserFilters {
	id?: number;
	user_id: number;
	department_ids: number[];
	institute_ids: number[];
}

const filterNamesToColumns = {
	departments: 'department_ids',
	institutes: 'institute_ids',
};

export const getUserFilters = async (userId: number): Promise<IUserFilters> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.USER_FILTERS}.user_id`)
		.field(`${TABLE_NAME.USER_FILTERS}.department_ids`)
		.field(`${TABLE_NAME.USER_FILTERS}.institute_ids`)
		.from(TABLE_NAME.USER_FILTERS)
		.where(`${TABLE_NAME.USER_FILTERS}.user_id = ?`, userId)
		.toParam();
	const result = await BaseModel.runQuery(query);
	console.log("getUserFilters result: ", result.rows?.[0])
	return result.rows?.[0];
};

export const setFilter = (userId: number, filterName: string, value: any): Promise<any> => {
	const columnName = filterNamesToColumns[filterName];
	if (!columnName) {
		throw new Error('filter name not valid');
	}
	let objectValue = value;
	if (ARRAY_TO_POSTGRES_ARRAY_COLUMNS.includes(filterName)) {
		const jsonObject = JSON.stringify(value);
		objectValue = jsonObject.replace('[', '{').replace(']', '}');
	}
	const setObject = {};
	setObject[columnName] = objectValue;
	return BaseModel.upsertRow(TABLE_NAME.USER_FILTERS, { user_id: userId, ...setObject }, 'user_id', setObject);
};
