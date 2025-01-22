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

// export const getUserDetails = async (userId) => {
// 	const query = squelPostgres
// 		.select()
// 		.field(`${TABLE_NAME.PATIENT}.id`, 'id')
// 		.field('first_name')
// 		.field('last_name')
// 		.field(`${TABLE_NAME.USER}.email`)
// 		.field(`${TABLE_NAME.USER}.is_two_factor_enabled`)
// 		.field(`${TABLE_NAME.USER}.fast_login_link`)
// 		.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
// 		.from(TABLE_NAME.PATIENT)
// 		.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
// 		.left_join(
// 			TABLE_NAME.PATIENT_DEPARTMENTS,
// 			null,
// 			`${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.PATIENT_DEPARTMENTS}.patient_id`
// 		)
// 		.left_join(
// 			TABLE_NAME.DEPARTMENT,
// 			null,
// 			`${TABLE_NAME.PATIENT_DEPARTMENTS}.department_id = ${TABLE_NAME.DEPARTMENT}.id`
// 		)
// 		.where(`user_id = ?`, userId)
// 		.union(
// 			squelPostgres
// 				.select()
// 				.field(`${TABLE_NAME.THERAPIST}.id`, 'id')
// 				.field('first_name')
// 				.field('last_name')
// 				.field(`${TABLE_NAME.USER}.email`)
// 				.field(`${TABLE_NAME.USER}.is_two_factor_enabled`)
// 				.field(`${TABLE_NAME.USER}.fast_login_link`)
// 				.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
// 				.from(TABLE_NAME.THERAPIST)
// 				.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.THERAPIST}.user_id = ${TABLE_NAME.USER}.id`)
// 				.left_join(
// 					TABLE_NAME.THERAPIST_DEPARTMENTS,
// 					null,
// 					`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_DEPARTMENTS}.therapist_id`
// 				)
// 				.left_join(
// 					TABLE_NAME.DEPARTMENT,
// 					null,
// 					`${TABLE_NAME.THERAPIST_DEPARTMENTS}.department_id = ${TABLE_NAME.DEPARTMENT}.id`
// 				)
// 				.where(`user_id = ?`, userId)
// 		)
// 		.toParam();
// 	const result = await BaseModel.runQuery(query);
// 	return result.rows;
// };

export const isPatientEntryForToday = async (
	patientId: number
): Promise<{ hasEntries: boolean; painLevel?: number }> => {
	try {
		const query = squelPostgres
			.select()
			.field(`${TABLE_NAME.RTM}.timestamp`, 'timestamp')
			.field(`${TABLE_NAME.RTM}.data->'patient'->>'pain_level'`, 'pain_level')
			.from(TABLE_NAME.RTM)
			.where('patient_id = ?', patientId)
			.where('DATE(timestamp) = CURRENT_DATE')
			.toParam();

		const result = await BaseModel.runQuery(query);
		const hasEntries = result.rows.length > 0;
		const painLevel = hasEntries ? result.rows[0]?.pain_level : undefined;
		return { hasEntries, painLevel };
	} catch (error) {
		return { hasEntries: false };
	}
};
export const getUserDetails = async (userId, therapistId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.id`, 'id')
		.field('first_name')
		.field('last_name')
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.is_two_factor_enabled`)
		.field(`${TABLE_NAME.USER}.fast_login_link`)
		.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
		.field(`${TABLE_NAME.DEPARTMENT}.name`, 'department_name')
		.field(`${TABLE_NAME.RTM}.data->'patient'->>'pain_level'`, 'pain_level')
		.field(`${TABLE_NAME.RTM}.timestamp`, 'timestamp')
		.field(`${TABLE_NAME.USER}.date_agreed_terms`)
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
		.left_join(TABLE_NAME.RTM, null, `${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.RTM}.patient_id`)
		.where(`user_id = ?`, userId)
		.union(
			squelPostgres
				.select()
				.field(`${TABLE_NAME.THERAPIST}.id`, 'id')
				.field('first_name')
				.field('last_name')
				.field(`${TABLE_NAME.USER}.email`)
				.field(`${TABLE_NAME.USER}.is_two_factor_enabled`)
				.field(`${TABLE_NAME.USER}.fast_login_link`)
				.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
				.field(`${TABLE_NAME.DEPARTMENT}.name`, 'department_name')
				.field(`NULL`, 'pain_level')
				.field(`NULL`, 'timestamp')
				.field(`NULL::timestamp with time zone`, 'date_agreed_terms')
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
	if (result.rows.some((row) => row.department_name)) {
		const departments = await getTherapistDepartments(therapistId);
		return result.rows.map((row) => ({ ...row, departments }));
	}
	return result.rows;
};


export const getTherapistDepartments = async (therapistId) => {
	const query = squelPostgres
	  .select()
	  .field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
	  .field(`${TABLE_NAME.DEPARTMENT}.name`, 'department_name')
	  .field(`${TABLE_NAME.DEPARTMENT}.institute_id`, 'institute_id') 
	  .field(`${TABLE_NAME.INSTITUTE}.name`, 'institute_name')
	  .from(TABLE_NAME.THERAPIST_DEPARTMENTS)
	  .left_join(
		TABLE_NAME.DEPARTMENT,
		null,
		`${TABLE_NAME.THERAPIST_DEPARTMENTS}.department_id = ${TABLE_NAME.DEPARTMENT}.id`
	  )
	  .left_join(
		TABLE_NAME.INSTITUTE,
		null,
		`${TABLE_NAME.DEPARTMENT}.institute_id = ${TABLE_NAME.INSTITUTE}.id`
	  )
	  .where(`${TABLE_NAME.THERAPIST_DEPARTMENTS}.therapist_id = ?`, therapistId)
	  .toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows.map(department => ({
	  department_id: department.department_id,
	  department_name: department.department_name,
	  institute_id: department.institute_id,
	  institute_name: department.institute_name
	}));
  };

export const getAdminDetails = async (userId: number) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.USER}.email`, 'email')
		.from(TABLE_NAME.USER)
		.where(`id = ?`, userId)
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
export const updateUserTermsConditions = (id, dateAgreedTerms) => {
	return BaseModel.updateRowByField(TABLE_NAME.USER, { date_agreed_terms: dateAgreedTerms }, 'id', id);
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
