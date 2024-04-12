import * as BaseModel from '../services/BaseModel.service';
import * as UtilModel from './util.model';
import * as EncryptHelper from '../services/encrypt.helper';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const adminValidationObject = [
	{ key: 'first_name', type: 'string', required: true },
	{ key: 'last_name', type: 'string', required: true },
	{ key: 'user_id', type: 'number', required: true },
];

export const adminValidator = (adminObject) => {
	return UtilModel.modelValidator(adminValidationObject, adminObject, 'adminValidator');
};

export const create = async (admin, client = null) => {
	return BaseModel.createRow(TABLE_NAME.ADMIN, EncryptHelper.encryptJson(admin), adminValidator, client);
};

export const edit = async (id, admin, client = null) => {
	return BaseModel.updateRowByField(TABLE_NAME.ADMIN, EncryptHelper.encryptJson(admin), 'id', id, client);
};

export const remove = async (id, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.ADMIN)
		.set('active', false)
		.where(`id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows[0];
};

export const getAllActive = async () => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.ADMIN}.first_name`)
		.field(`${TABLE_NAME.ADMIN}.last_name`)
		.field(`${TABLE_NAME.ADMIN}.id`)
		.field(`${TABLE_NAME.ADMIN}.phone`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field(`${TABLE_NAME.USER}.id`, 'user_id')
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.logged_in_at`)
		.from(TABLE_NAME.ADMIN)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.ADMIN}.user_id = ${TABLE_NAME.USER}.id`)
		.where(`${TABLE_NAME.USER}.active = ?`, true)
		.order('admin.updated_at', false)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
