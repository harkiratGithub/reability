import * as UserHelper from './util.model';
import * as BaseModel from '../services/BaseModel.service';
import * as Helper from '../services/util.helper';
import * as EncryptHelper from '../services/encrypt.helper';
import { TABLE_NAME } from '../const';
import moment from 'moment';

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
/*
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
*/
/*
export const isPatientEntryForToday = async (
	patientId: number, 
	timezone: string
  ): Promise<{ hasEntries: boolean; painLevel?: number }> => {
	try {
	 //const query = squelPostgres
		//.select()
		//.field(`${TABLE_NAME.RTM}.timestamp`, 'timestamp')
		//.field(`${TABLE_NAME.RTM}.data->'patient'->>'pain_level'`, 'pain_level')
		//.field(`${TABLE_NAME.RTM}.timezone`, 'timezone')
		//.from(TABLE_NAME.RTM)
		//.where('patient_id = ?', patientId)
		//.where(`DATE(${TABLE_NAME.RTM}.timestamp AT TIME ZONE ?) = CURRENT_DATE`, timezone) 
		//.toParam();	  
	  //const result = await BaseModel.runQuery(query);
	  
	  const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.RTM}.timestamp`, 'timestamp')
		.field(`${TABLE_NAME.RTM}.data->'patient'->>'pain_level'`, 'pain_level')
		.field(`${TABLE_NAME.RTM}.timezone`, 'timezone')
		.field(
			`${TABLE_NAME.RTM}.timestamp + INTERVAL '1 minute' * ${TABLE_NAME.RTM}.timezone`,
			'date'
		)
		.field(`CURRENT_DATE`, 'current_date_system')
		.field(`DATE(${TABLE_NAME.RTM}.timestamp + INTERVAL '1 minute' * ${TABLE_NAME.RTM}.timezone)`, 'current_date_table')
		.from(TABLE_NAME.RTM)
		.where('patient_id = ?', patientId)
		.where(
			`DATE(${TABLE_NAME.RTM}.timestamp + INTERVAL '1 minute' * ${TABLE_NAME.RTM}.timezone) = CURRENT_DATE`
		)
		.toParam();
	  const result = await BaseModel.runQuery(query);
	  console.log("=========result====",result);
	  console.log("======tiemstamp========",result.rows[0]?.timestamp);
	  console.log("=======timezone==========",timezone);
	  const timezoneinMinutes = Helper.convertTimezoneToMinutes(timezone);
	  console.log("=====timezoneinMinutes===",timezoneinMinutes);
	  const now = Helper.currentTimeofTimezone(timezone);
	  console.log("=now==",now);
	  const convertedTime = Helper.convertUtcToTimezone(result.rows[0]?.timestamp, timezone);
	  console.log(`Converted Time=========: ${convertedTime}`);
	  const hoursPassed = now.diff(convertedTime, 'hours');
	  console.log(`Hours Passed: ${hoursPassed}`)
	  const hasEntries = result.rows.length > 0;
	  const painLevel = hasEntries ? result.rows[0]?.pain_level : undefined;
	  return { hasEntries, painLevel };
	} catch (error) {
	  return { hasEntries: false };
	}
};*/

export const isPatientEntryForToday = async (
	patientId: number
  ): Promise<{ hasEntries: boolean; painLevel?: number }> => {
	try {
	  let hasEntries= true;
	  const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.RTM}.timestamp`, 'timestamp')
		.field(`${TABLE_NAME.RTM}.data->'patient'->>'pain_level'`, 'pain_level')
		.field(`${TABLE_NAME.RTM}.timezone`, 'timezone')
		.from(TABLE_NAME.RTM)
		.where('patient_id = ?', patientId)
		.where("data->'patient' IS NOT NULL")
		.order(`${TABLE_NAME.RTM}.timestamp`,false) 
		.limit(1)
		.toParam();		
		const result = await BaseModel.runQuery(query); 
		console.log("======result=======",result);	   
	  // Convert the timestamp to the patient's timezone
	  const timestamp = result.rows[0]?.timestamp;
	  const timezoneinMinutes = result.rows[0]?.timezone;	  
	  console.log("=======timezoneinMinutes=======", timezoneinMinutes);
	  const timezone = Helper.convertMinutesToTimezonestring(timezoneinMinutes);
	  console.log("=======timezone=======", timezone);
	  const convertedTime = Helper.convertUtcToTimezone(timestamp, timezone);
	  console.log("=======convertedTime=======", convertedTime);	  
	  const now = Helper.currentTimeofTimezone(timezone);	  
	  const convertedDate = moment(convertedTime).format('YYYY-MM-DD');
	  console.log("=======convertedDate=======", convertedDate);
	  const currentDate = moment(now).format('YYYY-MM-DD');	  
	  console.log("=======currentDate=======", currentDate);
	  // If the dates are different, show the pain scale popup
	  const isNewDay = convertedDate !== currentDate;	  
	  if (isNewDay || (result.rows.length == 0)) {
		console.log('Show Pain Scale Popup');
		hasEntries = false;
	  }  
	  const painLevel = hasEntries ? result.rows[0]?.pain_level : undefined;	  
	  console.log("===hasEntries===",hasEntries);
	  console.log("===painLevel===",painLevel);
	  return { hasEntries, painLevel };
	} catch (error) {
	  console.error('Error in isPatientEntryForToday:', error);
	  return { hasEntries: false };
	}
  };

export const getUserDetails = async (userId, therapistId = undefined) => {
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
		.field(`${TABLE_NAME.USER}.user_last_login`)
		.field(`${TABLE_NAME.USER}.timezone`)
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
				.field(`${TABLE_NAME.USER}.user_last_login`)
				.field(`${TABLE_NAME.USER}.timezone`)
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

/*
export const updateById = async (user_id, object, client = null) => {
	// we not allow to update user_name
	if (object.hasOwnProperty('user_name')) {
		delete object['user_name'];
	}
	return BaseModel.updateRowByField(TABLE_NAME.USER, EncryptHelper.encryptJson(object), 'id', user_id, client);
};
*/

export const updateById = async (user_id, object, client = null) => {
    if (object.hasOwnProperty('user_name')) {
        delete object['user_name'];
    }
    try {
        const encryptedObject = EncryptHelper.encryptJson(object);
        console.log('Encrypted Object:', encryptedObject);
        // Sanitize the encrypted object
        const sanitizedObject = {};
        for (const key in encryptedObject) {
            const value = encryptedObject[key];
            if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                sanitizedObject[key] = value;
            } else {
                console.warn(`Invalid value type for field "${key}":`, value);
            }
        }
        console.log('Sanitized Object:', sanitizedObject);
        const result = await BaseModel.updateRowByField(
            TABLE_NAME.USER,
            sanitizedObject,
            'id',
            user_id,
            client
        );
        console.log('Update Result:', result);
        return result;
    } catch (error) {
        console.error('Error in updateById:', error);
        throw error; // Rethrow the error for further handling
    }
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
