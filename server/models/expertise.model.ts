import * as BaseModel from '../services/BaseModel.service';
import * as UtilModel from './util.model';
import { TABLE_NAME } from '../const';
import squel from 'squel';
const squelPostgres = squel.useFlavour('postgres');

const expertiseValidationObject = [
	{ key: 'name', type: 'string', required: true },
	{ key: 'profession_id', type: 'number', required: true },
];

export const expertiseValidator = (expertiseObject) => {
	return UtilModel.modelValidator(expertiseValidationObject, expertiseObject, 'expertiseValidator');
};

export const create = (expertise) => {
	return BaseModel.createRow(TABLE_NAME.EXPERTISE, expertise, expertiseValidator);
};

export const getAllActive = async () => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.EXPERTISE}.id`)
		.field(`${TABLE_NAME.EXPERTISE}.name`)
		.field(`${TABLE_NAME.EXPERTISE}.profession_id`)
		.field(`${TABLE_NAME.EXPERTISE}.max_patients`)
		.field(`${TABLE_NAME.EXPERTISE}.duration`)
		.field(`${TABLE_NAME.PROFESSION}.name`, 'profession_name')
		.from(TABLE_NAME.EXPERTISE)
		.join(TABLE_NAME.PROFESSION, null, `${TABLE_NAME.EXPERTISE}.profession_id = ${TABLE_NAME.PROFESSION}.id`)
		.where(`${TABLE_NAME.EXPERTISE}.active = ?`, true)
		.order(`${TABLE_NAME.EXPERTISE}.name`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getExpertiseById = async (id: number) => {
	const result = await BaseModel.itemsByField(TABLE_NAME.EXPERTISE, 'id', id);
	return result?.[0];
};

export const updateById = (expertise): Promise<void> => {
	const { name, max_patients, duration } = expertise;
	return BaseModel.updateRowByField(TABLE_NAME.EXPERTISE, { name, max_patients, duration }, 'id', expertise.id, null);
};

export const remove = async (id: number, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.EXPERTISE)
		.set('active', false)
		.where(`id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};
