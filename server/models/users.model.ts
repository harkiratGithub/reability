import * as UserHelper from './util.model';
import * as BaseModel from '../services/BaseModel.service';
import * as Helper from '../services/util.helper';
import * as EncryptHelper from '../services/encrypt.helper';
import { TABLE_NAME } from '../const';

import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const usersValidationObject = [
	{ key: 'user_name', type: 'string', required: true },
	{ key: 'email', type: 'string', required: true },
	{ key: 'role', type: 'string', required: true },
	{ key: 'active', type: 'boolean', required: false },
];

export const usersValidator = (usersObject) => {
	if (!Helper.validateEmail(EncryptHelper.decryptPersonalData(usersObject.email))) {
		throw new Error('email not valid');
	}
	return UserHelper.modelValidator(usersValidationObject, usersObject, 'usersValidator');
};

export const getUserDetails = async (userId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.id`, 'id')
		.field('first_name')
		.field('last_name')
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.fast_login_link`)
		.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
		.from(TABLE_NAME.PATIENT)
		.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
		.left_join(
			TABLE_NAME.PATIENT_DEPARTMENTS,
			null,
			`${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.PATIENT_DEPARTMENTS}.patient_id`
		)
		.left_join(
			TABLE_NAME.DEPARTMENT,
			null,
			`${TABLE_NAME.PATIENT_DEPARTMENTS}.department_id = ${TABLE_NAME.DEPARTMENT}.id`
		)
		.where(`user_id = ?`, userId)
		.union(
			squelPostgres
				.select()
				.field(`${TABLE_NAME.THERAPIST}.id`, 'id')
				.field('first_name')
				.field('last_name')
				.field(`${TABLE_NAME.USER}.email`)
				.field(`${TABLE_NAME.USER}.fast_login_link`)
				.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
				.from(TABLE_NAME.THERAPIST)
				.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.THERAPIST}.user_id = ${TABLE_NAME.USER}.id`)
				.left_join(
					TABLE_NAME.THERAPIST_DEPARTMENTS,
					null,
					`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_DEPARTMENTS}.therapist_id`
				)
				.left_join(
					TABLE_NAME.DEPARTMENT,
					null,
					`${TABLE_NAME.THERAPIST_DEPARTMENTS}.department_id = ${TABLE_NAME.DEPARTMENT}.id`
				)
				.where(`user_id = ?`, userId)
		)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getPatientsByTherapistId = async (therapistId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.id`, 'patient_id')
		.field(`${TABLE_NAME.PATIENT}.first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name`)
		.field(`${TABLE_NAME.PATIENT}.user_id as peer_id`)
		.field(`${TABLE_NAME.PATIENT}.disabled_skeleton`)
		.field(`${TABLE_NAME.PATIENT}.has_camera`)
		.field(`${TABLE_NAME.PATIENT}.notification_email`)
		.field(`${TABLE_NAME.USER}.role`)
		.field(`${TABLE_NAME.USER}.id as peer_id`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.from(TABLE_NAME.THERAPIST)
		.left_join(
			TABLE_NAME.THERAPIST_DEPARTMENTS,
			null,
			`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_DEPARTMENTS}.therapist_id`
		)
		.left_join(
			TABLE_NAME.PATIENT_DEPARTMENTS,
			null,
			`${TABLE_NAME.THERAPIST_DEPARTMENTS}.department_id = ${TABLE_NAME.PATIENT_DEPARTMENTS}.department_id`
		)
		.left_join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.PATIENT_DEPARTMENTS}.patient_id = ${TABLE_NAME.PATIENT}.id`)
		.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
		.where(`${TABLE_NAME.THERAPIST}.id = ?`, therapistId)
		.distinct('patient_id')
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const updateById = async (user_id, object, client = null) => {
	// we not allow to update user_name
	if (object.hasOwnProperty('user_name')) {
		delete object['user_name'];
	}
	return BaseModel.updateRowByField(TABLE_NAME.USER, EncryptHelper.encryptJson(object), 'id', user_id, client);
};

export const create = (user, client = null) => {
	return BaseModel.createRow(TABLE_NAME.USER, EncryptHelper.encryptJson(user), usersValidator, client);
};

export const remove = async (arrayOfIds, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.USER)
		.set('active', false)
		.where(`id in ?`, arrayOfIds)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

// check options toParam before use(not work with dontQuote)
export const removeUserGDPR = async (arrayOfIds, isTherapist) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.USER)
		.set(
			'email',
			isTherapist
				? `email || '${Helper.getDateForArchiveString()}'`
				: `id || '_${Helper.generateRandomString()}' || '${Helper.getDateForArchiveString()}'`,
			{
				dontQuote: true,
			}
		)
		.set('active', false)
		.where(`id in ?`, arrayOfIds)
		.returning('*')
		.toString();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const updateUserUsage = (id) => {
	return BaseModel.updateRowByField(TABLE_NAME.USER, { logged_out_at: Helper.createTimeForDb() }, 'id', id);
};

export const getPeersByTherapistId = async (therapistId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.USER}.id`, 'user_id')
		.field(`${TABLE_NAME.USER}.logged_out_at`)
		.field(`${TABLE_NAME.USER}.active`)
		.field(`${TABLE_NAME.PATIENT}.id`, 'patient_id')
		.field(`${TABLE_NAME.PATIENT}.has_camera`)
		.from(TABLE_NAME.THERAPIST)
		.left_join(
			TABLE_NAME.THERAPIST_DEPARTMENTS,
			null,
			`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_DEPARTMENTS}.therapist_id`
		)
		.left_join(
			TABLE_NAME.PATIENT_DEPARTMENTS,
			null,
			`${TABLE_NAME.THERAPIST_DEPARTMENTS}.department_id = ${TABLE_NAME.PATIENT_DEPARTMENTS}.department_id`
		)
		.left_join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.PATIENT_DEPARTMENTS}.patient_id = ${TABLE_NAME.PATIENT}.id`)
		.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
		.where(`${TABLE_NAME.THERAPIST}.id = ?`, therapistId)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const findByToken = (token) => {
	return BaseModel.itemsByField(TABLE_NAME.USER, 'token', token);
};

export const findByUsername = (username) => {
	return BaseModel.itemsByField(TABLE_NAME.USER, 'user_name', username);
};

export const findById = (userId) => {
	return BaseModel.itemsByField(TABLE_NAME.USER, 'id', userId);
};

export const findByFastLoginToken = (fastLoginToken) => {
	return BaseModel.itemsByField(TABLE_NAME.USER, 'fast_login_token', fastLoginToken);
};
