import * as BaseModel from '../services/BaseModel.service';
import * as Helper from '../services/util.helper';
import * as UtilModel from './util.model';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const professionValidationObject = [
	{ key: 'name', type: 'string', required: true },
	{ key: 'image_id', type: 'number', required: false },
];

export const professionValidator = (professionObject) => {
	return UtilModel.modelValidator(professionValidationObject, professionObject, 'professionValidator');
};

export const create = (profession, client = null) => {
	return BaseModel.createRow(TABLE_NAME.PROFESSION, profession, professionValidator, client);
};

export const edit = (id, data, client = null) => {
	return BaseModel.updateRowByField(TABLE_NAME.PROFESSION, data, 'id', id, client);
};

export const getAll = async () => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PROFESSION}.id`)
		.field(`${TABLE_NAME.PROFESSION}.name`, 'profession_name')
		.field(`${TABLE_NAME.PROFESSION}.image_id`)
		.field(`${TABLE_NAME.IMAGE}.url`, 'logo_url')
		.field(`${TABLE_NAME.PROFESSION}.created_at`)
		.field(`${TABLE_NAME.EXPERTISE}.name`, 'expertise_name')
		.field(`${TABLE_NAME.EXPERTISE}.id`, 'expertise_id')
		.field(`${TABLE_NAME.EXPERTISE}.max_patients`)
		.field(`${TABLE_NAME.EXPERTISE}.duration`)
		.from(TABLE_NAME.PROFESSION)
		.left_join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.PROFESSION}.id = ${TABLE_NAME.EXPERTISE}.profession_id`)
		.left_join(TABLE_NAME.IMAGE, null, `${TABLE_NAME.PROFESSION}.image_id = ${TABLE_NAME.IMAGE}.id`)
		.where(`${TABLE_NAME.PROFESSION}.active = ?`, true)
		.where(`${TABLE_NAME.EXPERTISE}.active = ?`, true)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getExpertiseByProfession = async (professionId, client = null) => {
	return BaseModel.itemsByField(TABLE_NAME.EXPERTISE, 'profession_id', professionId, client);
};
