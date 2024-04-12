import * as BaseModel from '../services/BaseModel.service';
import * as Helper from '../services/util.helper';
import * as UtilModel from './util.model';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const instituteValidationObject = [
	{ key: 'name', type: 'string', required: true },
	{ key: 'image_id', type: 'number', required: false },
];

export const instituteValidator = (instituteObject) => {
	return UtilModel.modelValidator(
		instituteValidationObject,
		instituteObject,
		'instituteValidator'
	);
};

export const create = async (institute, client = null) => {
	return BaseModel.createRow(
		TABLE_NAME.INSTITUTE,
		institute,
		instituteValidator,
		client
	);
};

export const edit = async (id, data, client = null) => {
	return BaseModel.updateRowByField(
		TABLE_NAME.INSTITUTE,
		data,
		'id',
		id,
		client
	);
};

export const getAll = async () => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.INSTITUTE}.id`)
		.field(`${TABLE_NAME.INSTITUTE}.name`, 'institute_name')
		.field(`${TABLE_NAME.INSTITUTE}.image_id`)
		.field(`${TABLE_NAME.IMAGE}.url`, 'logo_url')
		.field(`${TABLE_NAME.INSTITUTE}.created_at`)
		.field(`${TABLE_NAME.DEPARTMENT}.name`, 'department_name')
		.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
		.from(TABLE_NAME.INSTITUTE)
		.left_join(
			TABLE_NAME.DEPARTMENT,
			null,
			`${TABLE_NAME.INSTITUTE}.id = ${TABLE_NAME.DEPARTMENT}.institute_id`
		)
		.left_join(
			TABLE_NAME.IMAGE,
			null,
			`${TABLE_NAME.INSTITUTE}.image_id = ${TABLE_NAME.IMAGE}.id`
		)
		.where(`${TABLE_NAME.INSTITUTE}.active = ?`, true)
		.where(`${TABLE_NAME.DEPARTMENT}.active = ?`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getDepartmentByInstitute = async (instituteId, client = null) => {
	return BaseModel.itemsByField(
		TABLE_NAME.DEPARTMENT,
		'institute_id',
		instituteId,
		client
	);
};

export const updateInstituteNotActive = async (id, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.INSTITUTE)
		.set('name', `name || '${Helper.getDateForArchiveString()}'`, {
			dontQuote: true,
		})
		.set('active', false)
		.where('id = ?', id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows[0];
};
