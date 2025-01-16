import * as BaseModel from '../services/BaseModel.service';
import * as UtilModel from './util.model';
import * as EncryptHelper from '../services/encrypt.helper';
import { TABLE_NAME } from '../const';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');

const therapistValidationObject = [
	{ key: 'first_name', type: 'string', required: true },
	{ key: 'last_name', type: 'string', required: false },
	// { key: 'identity_number', type: 'string', required: true },
	// { key: 'phone', type: 'string', required: true },
	{ key: 'user_id', type: 'number', required: true },
];

export const therapistValidator = (therapistObject) => {
	return UtilModel.modelValidator(therapistValidationObject, therapistObject, 'therapistValidator');
};

export const create = async (therapist, client = null) => {
	return BaseModel.createRow(TABLE_NAME.THERAPIST, EncryptHelper.encryptJson(therapist), therapistValidator, client);
};

export const edit = async (id, therapist, client = null) => {
	return BaseModel.updateRowByField(TABLE_NAME.THERAPIST, EncryptHelper.encryptJson(therapist), 'id', id, client);
};

export const addTherapistDepartments = async (therapistData, departments, client = null) => {
	let rows = [];
	departments.map((department) => {
		rows.push({ therapist_id: therapistData.id, department_id: department });
	});

	await BaseModel.insertBulk(TABLE_NAME.THERAPIST_DEPARTMENTS, rows, client);
};

export const editTherapistDepartments = async (therapistData, departments, client = null) => {
	let rows = [];
	departments.map((department) => {
		rows.push({ therapist_id: therapistData.id, department_id: department });
	});
	await BaseModel.insertBulk(TABLE_NAME.THERAPIST_DEPARTMENTS, rows, client);
};

export const deleteTherapistDepartments = async (id, client = null) => {
	await removeDepartmentsOfTherapist(id, client);
};

export const removeDepartmentsOfTherapist = async (id, client = null) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.THERAPIST_DEPARTMENTS)
		.where(`therapist_id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const remove = async (arrayOfIds, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.THERAPIST)
		.set('active', false)
		.where(`id in ?`, arrayOfIds)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const getAllActive = async () => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.THERAPIST}.first_name`)
		.field(`${TABLE_NAME.THERAPIST}.last_name`)
		.field(`${TABLE_NAME.THERAPIST}.id`)
		.field(`${TABLE_NAME.THERAPIST}.identity_number`)
		.field(`${TABLE_NAME.THERAPIST}.phone`)
		.field(`${TABLE_NAME.THERAPIST}.therapist_type`)
		.field(`${TABLE_NAME.THERAPIST}.updated_at`)
		.field(`${TABLE_NAME.THERAPIST}.created_at`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field(`${TABLE_NAME.USER}.id`, 'user_id')
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.logged_in_at`)
		.field(`${TABLE_NAME.DEPARTMENT}.name`, 'department_name')
		.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
		.field(`${TABLE_NAME.INSTITUTE}.name`, 'institute_name')
		.field(`${TABLE_NAME.INSTITUTE}.id`, 'institute_id')
		.field(`${TABLE_NAME.EXPERTISE}.name`, 'expertise_name')
		.field(`${TABLE_NAME.EXPERTISE}.id`, 'expertise_id')
		.field(`${TABLE_NAME.PROFESSION}.name`, 'profession_name')
		.field(`${TABLE_NAME.PROFESSION}.id`, 'profession_id')
		.from(TABLE_NAME.THERAPIST)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.THERAPIST}.user_id = ${TABLE_NAME.USER}.id`)
		.left_join(
			TABLE_NAME.THERAPIST_DEPARTMENTS,
			null,
			`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_DEPARTMENTS}.therapist_id`
		)
		.left_join(
			TABLE_NAME.DEPARTMENT,
			null,
			`${TABLE_NAME.DEPARTMENT}.id = ${TABLE_NAME.THERAPIST_DEPARTMENTS}.department_id`
		)
		.left_join(TABLE_NAME.INSTITUTE, null, `${TABLE_NAME.DEPARTMENT}.institute_id = ${TABLE_NAME.INSTITUTE}.id`)
		.left_join(
			TABLE_NAME.THERAPIST_EXPERTISE,
			null,
			`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_EXPERTISE}.therapist_id`
		)
		.left_join(
			TABLE_NAME.EXPERTISE,
			null,
			`${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.THERAPIST_EXPERTISE}.expertise_id`
		)
		.left_join(TABLE_NAME.PROFESSION, null, `${TABLE_NAME.EXPERTISE}.profession_id = ${TABLE_NAME.PROFESSION}.id`)
		.where(`${TABLE_NAME.USER}.active = ?`, true)
		.order(`${TABLE_NAME.THERAPIST}.updated_at`, false)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getTherapistsSessions = async () => {
	const query = `select (ts.start_time) AS date, TO_CHAR(ts.start_time, 'HH24:MI') AS start_time,(p.first_name) as patient_first_name,(p.last_name) as patient_last_name, ts.patient_id,(t.first_name) as therapist_first_name,(t.last_name) as therapist_last_name, ts.therapist_id, STRING_AGG(department.name, ', ') AS department_names,   patient_user.user_name AS patient_user_name,
    therapist_user.user_name AS therapist_user_name,   TO_CHAR(ts.end_time - ts.start_time, 'HH24:MI:SS') AS session_duration, p.referral
from therapist_session as ts
left join patient as p on p.id = ts.patient_id
left join therapist as t on t.id = ts.therapist_id
left join patient_departments as pd on pd.patient_id = ts.patient_id
LEFT JOIN users AS patient_user ON patient_user.id = p.user_id
LEFT JOIN users AS therapist_user ON therapist_user.id = t.user_id
left join department on department.id = pd.department_id
 WHERE start_time >= CURRENT_DATE - INTERVAL '10 days' 
 GROUP BY ts.start_time, p.first_name, p.last_name, ts.patient_id, t.first_name, t.last_name, ts.therapist_id,patient_user.user_name, therapist_user.user_name,ts.end_time,p.referral;`;
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const isTherapistUserCanUpdatePatient = async (userId, patientId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.id`, 'patient_id')
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
		.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.USER}.id = ${TABLE_NAME.PATIENT}.user_id`)
		.where(`${TABLE_NAME.THERAPIST}.user_id = ?`, userId)
		.where(`${TABLE_NAME.PATIENT}.id = ?`, patientId)
		.toString();
	const booleanQuery = `SELECT CASE WHEN EXISTS (${query}) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END`;
	const res = await BaseModel.runQuery(booleanQuery);
	return res.rows[0].case === '1';
};

export const addTherapistExpertises = (therapistData, expertises, client = null) => {
	const rows = expertises.map((expertise) => {
		return { therapist_id: therapistData.id, expertise_id: expertise };
	});

	BaseModel.insertBulk(TABLE_NAME.THERAPIST_EXPERTISE, rows, client);
};

export const editTherapistExpertises = (therapistData, expertises, client = null) => {
	const rows = expertises?.map((expertise) => {
		return { therapist_id: therapistData.id, expertise_id: expertise };
	});
	BaseModel.insertBulk(TABLE_NAME.THERAPIST_EXPERTISE, rows, client);
};

export const deleteTherapistExpertises = async (id, client = null) => {
	await removeExpertisesOfTherapist(id, client);
};

export const removeExpertisesOfTherapist = async (id, client = null) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.THERAPIST_EXPERTISE)
		.where(`therapist_id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const getTherapistsByExpertise = async (expertiseIds: number[]) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.THERAPIST}.id`, 'therapist_id')
		.field(`${TABLE_NAME.THERAPIST}.first_name`, 'therapist_first_name')
		.field(`${TABLE_NAME.THERAPIST}.last_name`, 'therapist_last_name')
		.field(`NULL`, 'availability')
		.field(`${TABLE_NAME.THERAPIST_EXPERTISE}.max_patients`, 'therapist_max_patients')
		.field(`${TABLE_NAME.EXPERTISE}.max_patients`, 'expertise_max_patients')
		.field(`true`, 'is_default_availability')
		.from(TABLE_NAME.THERAPIST)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.THERAPIST}.user_id = ${TABLE_NAME.USER}.id`)
		.join(
			TABLE_NAME.THERAPIST_EXPERTISE,
			null,
			`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_EXPERTISE}.therapist_id`
		)
		.join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.THERAPIST_EXPERTISE}.expertise_id`)
		.where(
			`${TABLE_NAME.THERAPIST_EXPERTISE}.expertise_id IN (${expertiseIds.join(',')}) AND ${
				TABLE_NAME.THERAPIST
			}.active = true`
		)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getTherapistById = async (id: number) => {
	const result = await BaseModel.itemsByField(TABLE_NAME.THERAPIST, 'id', id);
	return result?.[0];
};
