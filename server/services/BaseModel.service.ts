import { keys } from 'lodash';
import squel from 'squel';

import DbService from './db.service';
import { getOldValuesFromDb } from '../helpers/activity-log.helper';

const squelPostgres = squel.useFlavour('postgres');

export const getAllTable = async (tableName, client = null) => {
	const query = squelPostgres.select().from(tableName).toParam();
	const result = await runQuery(query, client);
	return result.rows;
};

export const itemsByField = async (tableName, fieldName, value, client = null) => {
	const query = squelPostgres.select().from(tableName).where(`${fieldName} = ?`, value).toParam();
	const result = await runQuery(query, client);
	return result.rows;
};

export const itemsBySeveralFields = async (tableName, fields: {}, client = null) => {
	if (!Object.keys(fields).length) {
		return [];
	}
	const query = squelPostgres.select().from(tableName);
	for (const field in fields) {
		if (fields.hasOwnProperty(field)) {
			query.where(`${field} = ?`, fields[field]);
		}
	}
	const result = await runQuery(query.toParam(), client);
	return result.rows;
};

export const itemsInArray = async (tableName, fieldName, array, client = null) => {
	const query = squelPostgres.select().from(tableName).where(`${fieldName} in ?`, array).toParam();
	const result = await runQuery(query, client);
	return result.rows;
};

export const itemsInArrayDistinct = async (
	tableName: string,
	fieldName: string,
	array: string,
	distinctFieldName: string,
	client = null
) => {
	const query = squelPostgres
		.select()
		.field(distinctFieldName)
		.from(tableName)
		.where(`${fieldName} in (${array})`)
		.distinct(distinctFieldName)
		.toParam();

	const result = await runQuery(query, client);
	return result.rows;
};

export const findByIds = async (tableName: string, fieldName: string, ids: number[], client = null) => {
	const idsStr = ids.join(',');
	const query = squelPostgres.select().from(tableName).where(`${fieldName} in (${idsStr})`).toParam();
	const result = await runQuery(query, client);
	return result.rows;
};

export const insertRow = async (tableName, objectToInsert, client = null) => {
	const query = squelPostgres.insert().into(tableName).setFields(objectToInsert).returning('*').toParam();
	const result = await runQuery(query, client);
	return result.rows[0];
};

export const upsertRow = async (tableName, objectToInsert, conflictFieldName, objectToUpdate, client = null) => {
	const query = squelPostgres
		.insert()
		.into(tableName)
		.setFields(objectToInsert)
		.onConflict(conflictFieldName, objectToUpdate)
		.returning('*')
		.toParam();
	const result = await runQuery(query, client);
	return result.rows[0];
};

export const insertBulk = async (tableName, arrayOfNewRows, client = null) => {
	if (!arrayOfNewRows || arrayOfNewRows.length === 0) {
		return [];
	}

	const query = squelPostgres.insert().into(tableName).setFieldsRows(arrayOfNewRows).returning('*').toParam();
	const result = await runQuery(query, client);
	return result.rows;
};

export const insertBulkWithoutDuplicates = async (
	tableName,
	arrayOfNewRows,
	uniqueConstraintName,
	client = null
): Promise<any[]> => {
	if (!arrayOfNewRows || arrayOfNewRows.length === 0) {
		return [];
	}

	const query = squelPostgres.insert().into(tableName).setFieldsRows(arrayOfNewRows).returning('*').toParam();
	query.text = query.text.replace(
		'RETURNING *',
		`ON CONFLICT ON CONSTRAINT ${uniqueConstraintName} DO NOTHING RETURNING *`
	);
	const result = await runQuery(query, client);
	return result.rows;
};

export const runQuery = (query, client = null) => {
	const db = DbService.getDataBase();
	return client ? client.query(query) : db.query(query);
};

export const runAsTransaction = async (fun) => {
	const db = DbService.getDataBase();
	const client = await db.connect();
	let result;
	try {
		await client.query('BEGIN');
		result = await fun(client);
		await client.query('COMMIT');
		client.release();
		return result;
	} catch (e) {
		await client.query('ROLLBACK');
		client.release();
		throw e;
	}
};

export const updateRowByField = async (
	tableName,
	objectToUpdate,
	whereField,
	valueWhereField,
	client = null,
	addOldValue = false
) => {
	if (!whereField || !valueWhereField) {
		throw new Error(`whereField ${whereField}, or valueWhereField ${valueWhereField} missing`);
	}
	let query;

	if (addOldValue) {
		const objectKeys = keys(objectToUpdate);
		const oldValueFieldNames = getOldValuesFromDb(objectKeys, 'ov');
		const selectOldValue = `(${squelPostgres
			.select()
			.fields(objectKeys)
			.from(tableName)
			.toString()} WHERE ${whereField} = ${valueWhereField} FOR UPDATE)`;

		query = squelPostgres
			.update()
			.table(tableName, 'v')
			.setFields(objectToUpdate)
			.from(selectOldValue, 'ov')
			.where(`v.${whereField} = ? `, valueWhereField)
			.returning(`*, ${oldValueFieldNames}`)
			.toParam();
	} else {
		query = squelPostgres
			.update()
			.table(tableName)
			.setFields(objectToUpdate)
			.where(`${whereField} = ? `, valueWhereField)
			.returning('*')
			.toParam();
	}
	const result = await runQuery(query, client);
	return result.rows[0];
};

export const deleteRow = async (tableName, whereField, valueWhereField, client = null) => {
	const query = squelPostgres
		.delete()
		.from(tableName)
		.where(`${whereField} = ?`, valueWhereField)
		.returning('*')
		.toParam();
	const result = await runQuery(query, client);
	return result.rows;
};

export const createRow = async (tableName, objectToInsert, validatorFunc, client = null) => {
	validatorFunc(objectToInsert);
	const result = await insertRow(tableName, objectToInsert, client);
	return result;
};

export const deleteRowById = async (tableName, id, client = null) => {
	return deleteRow(tableName, 'id', id, client);
};

// this function for test use only
export const clearTables = async () => {
	const db = DbService.getDataBase();
	const query = `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type= 'BASE TABLE' AND table_name <> 'pgmigrations'`;
	const result = await db.query(query);
	let tablesName = result.rows;
	while (tablesName.length > 0) {
		const selected_table = tablesName[0];
		tablesName = tablesName.slice(1);
		try {
			await db.query(`DELETE FROM ${selected_table.table_name}`);
		} catch (err) {
			tablesName.push(selected_table);
		}
	}
};

// this function for seed use only
export const setSequence = (sequenceName, nextVal) => {
	const query = `SELECT (setval('${sequenceName}', ${nextVal}))`;
	return runQuery(query);
};
