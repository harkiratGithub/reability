import { map } from 'lodash';
import squel from 'squel';
import moment from 'moment';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';
import * as EncryptHelper from '../services/encrypt.helper';
import * as Helper from '../services/util.helper';
import { weekNumberFromDate } from '../services/week-number.helper';
import { sgMail } from '../services/email.service';
import * as ExcelJS from 'exceljs';

export interface IPatientModel {
	id: number;
	firstName?: string;
	lastName?: string;
	identityNumber?: number;
	status?: boolean;
	phone?: number;
	userId?: number;
	suspend?: SuspendValues;
	techIssue?: TechIssueValues;
	techReason?: string;
	hasCamera?: boolean;
	disabledSkeleton?: boolean;
}
enum SuspendValues {
	empty = '<Empty>',
	vacation = 'Vacation',
	loa = 'LOA',
	financial = 'Financial',
	tech = 'Tech',
	concluded = 'Concluded',
}
enum TechIssueValues {
	empty = '<Empty>',
	nonBlocking = 'Non-blocking',
	blocking = 'Blocking',
}

const squelPostgres = squel.useFlavour('postgres');

const patientValidationObject = [
	{ key: 'first_name', type: 'string', required: true },
	{ key: 'last_name', type: 'string', required: false },
	{ key: 'user_id', type: 'number', required: true },
];

const rtmValidationObject = [
	{ key: 'patient_id', type: 'number', required: true },
	{ key: 'timestamp', type: 'string', required: false },
	{ key: 'event', type: 'string', required: true },
];

const patientValidator = (patientObject) => {
	return UtilModel.modelValidator(patientValidationObject, patientObject, 'patientValidator');
};

const rtmValidator = (rtmObject) => {
	return UtilModel.modelValidator(rtmValidationObject, rtmObject, 'rtmValidator');
};

export const create = (patient, client = null) => {
	return BaseModel.createRow(TABLE_NAME.PATIENT, EncryptHelper.encryptJson(patient), patientValidator, client);
};

export const edit = (id, patient, client = null) => {
	return BaseModel.updateRowByField(TABLE_NAME.PATIENT, EncryptHelper.encryptJson(patient), 'id', id, client);
};

export const remove = async (arrayOfIds, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT)
		.set('active', false)
		.where(`id in ?`, arrayOfIds)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

// check options toParam before use(not work with dontQuote)
export const removeGDPR = async (arrayOfIds) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT)
		.set('first_name', `id || '_${Helper.generateRandomString()}' || '${Helper.getDateForArchiveString()}'`, {
			dontQuote: true,
		})
		.set('last_name', null)
		.set('identity_number', null)
		.set('phone', null)
		.set('active', false)
		.where(`id in ?`, arrayOfIds)
		.returning('*')
		.toString();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

const getCurrentWeekDate = () => moment(new Date(), 'DD-MM-YYYY');

export const getAllActive = async () => {
	const currentWeekDate = getCurrentWeekDate();
	const { weekNumber: currentWeekWeekNumber, year: currentWeekYearNumber } = weekNumberFromDate(
		currentWeekDate.format('YYYY'),
		currentWeekDate.format('MM'),
		currentWeekDate.format('DD')
	);

	const twoWeeksAgoWeekDate = getCurrentWeekDate().subtract(2, 'weeks');
	const { weekNumber: twoWeeksAgoWeekNumber, year: twoWeeksAgoYearNumber } = weekNumberFromDate(
		twoWeeksAgoWeekDate.format('YYYY'),
		twoWeeksAgoWeekDate.format('MM'),
		twoWeeksAgoWeekDate.format('DD')
	);

	const nextWeekDate = getCurrentWeekDate().add(1, 'weeks');
	const { weekNumber: nextWeekWeekNumber, year: nextWeekYearNumber } = weekNumberFromDate(
		nextWeekDate.format('YYYY'),
		nextWeekDate.format('MM'),
		nextWeekDate.format('DD')
	);

	const week2FromNowDate = getCurrentWeekDate().add(2, 'weeks');
	const { weekNumber: week2FromNowWeekNumber, year: week2FromNowYearNumber } = weekNumberFromDate(
		week2FromNowDate.format('YYYY'),
		week2FromNowDate.format('MM'),
		week2FromNowDate.format('DD')
	);

	const currentDateSQLFormat = moment(new Date()).format('YYYY-MM-DD');

	const subQuery = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name`)
		.field(`${TABLE_NAME.PATIENT}.id`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.PATIENT}.suspend`)
		.field(`${TABLE_NAME.PATIENT}.tech_issue`)
		.field(`${TABLE_NAME.PATIENT}.tech_reason`)
		.field(
			`CASE WHEN (SELECT COUNT(*) FROM ${TABLE_NAME.PATIENT_TREATMENT} WHERE patient_id = ${TABLE_NAME.PATIENT}.id AND active = TRUE) > 0 THEN FALSE ELSE TRUE END`,
			'no_prescription'
		)
		.field(
			`CASE WHEN (SELECT COUNT(*) FROM ${TABLE_NAME.BOOKING} b JOIN ${TABLE_NAME.PATIENT_TREATMENT} pt ON pt.id = b.patient_treatment_id JOIN ${TABLE_NAME.PATIENT} p ON pt.patient_id = p.id WHERE p.id = ${TABLE_NAME.PATIENT}.id AND ((b.week_number = ${currentWeekWeekNumber} AND b.year = ${currentWeekYearNumber}) OR (b.week_number = ${nextWeekWeekNumber} AND b.year = ${nextWeekYearNumber}))) > 0 THEN FALSE ELSE TRUE END`,
			'no_booking'
		)
		.field(
			`CASE WHEN TRUE IN
			(
			SELECT CASE WHEN pt.times_per_week > (SELECT COUNT(*) FROM booking WHERE booking.patient_treatment_id = pt.id AND booking.week_number = ${currentWeekWeekNumber} AND booking.year = ${currentWeekYearNumber}) THEN TRUE ELSE FALSE END
			FROM patient AS p
			LEFT JOIN patient_treatment pt ON pt.patient_id = ${TABLE_NAME.PATIENT}.id AND pt.active = true
			WHERE p.id = ${TABLE_NAME.PATIENT}.id
			) THEN TRUE ELSE FALSE END`,
			'under_booked'
		)
		.field(
			`CASE WHEN TRUE IN
			(
			SELECT CASE WHEN pt.times_per_week < (SELECT COUNT(*) FROM booking WHERE booking.patient_treatment_id = pt.id AND booking.week_number = ${currentWeekWeekNumber} AND booking.year = ${currentWeekYearNumber}) THEN TRUE ELSE FALSE END
			FROM patient AS p
			LEFT JOIN patient_treatment pt ON pt.patient_id = ${TABLE_NAME.PATIENT}.id AND pt.active = true
			WHERE p.id = ${TABLE_NAME.PATIENT}.id
			) THEN TRUE ELSE FALSE END`,
			'over_booked'
		)
		.field(
			`CASE WHEN (SELECT COUNT(*) FROM ${TABLE_NAME.FOLLOWUP} WHERE patient_id = ${TABLE_NAME.PATIENT}.id AND date <= '${currentDateSQLFormat}' AND done = FALSE) > 0 THEN TRUE ELSE FALSE END`,
			'has_followup'
		)
		.field(
			`CASE WHEN (SELECT COUNT(*) FROM ${TABLE_NAME.BOOKING} b JOIN ${TABLE_NAME.PATIENT_TREATMENT} pt ON pt.id = b.patient_treatment_id JOIN ${TABLE_NAME.PATIENT} p ON pt.patient_id = p.id WHERE p.id = ${TABLE_NAME.PATIENT}.id AND ((b.week_number >= ${twoWeeksAgoWeekNumber} AND b.year = ${twoWeeksAgoYearNumber}) AND (b.week_number <= ${week2FromNowWeekNumber} AND b.year = ${week2FromNowYearNumber}))) > 0 
			AND (SELECT COUNT(*) FROM ${TABLE_NAME.BOOKING} b JOIN ${TABLE_NAME.PATIENT_TREATMENT} pt ON pt.id = b.patient_treatment_id JOIN ${TABLE_NAME.PATIENT} p ON pt.patient_id = p.id WHERE p.id = ${TABLE_NAME.PATIENT}.id AND ((b.year > ${currentWeekYearNumber}) OR (b.week_number > ${week2FromNowWeekNumber} AND b.year = ${week2FromNowYearNumber}))) = 0
			THEN TRUE ELSE FALSE END`,
			'final_sessions'
		)
		.field(`${TABLE_NAME.PATIENT}.referral`)
		.field(`${TABLE_NAME.PATIENT}.updated_at`)
		.field(`${TABLE_NAME.PATIENT}.created_at`)
		.field(`${TABLE_NAME.USER}.logged_in_at`)
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field(`${TABLE_NAME.DEPARTMENT}.name`, 'department_name')
		.field(`${TABLE_NAME.DEPARTMENT}.id`, 'department_id')
		.field(`${TABLE_NAME.INSTITUTE}.name`, 'institute_name')
		.field(`${TABLE_NAME.INSTITUTE}.id`, 'institute_id')
		.field('role')
		.from(TABLE_NAME.PATIENT)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
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
		.left_join(TABLE_NAME.INSTITUTE, null, `${TABLE_NAME.DEPARTMENT}.institute_id = ${TABLE_NAME.INSTITUTE}.id`)
		.where(`${TABLE_NAME.USER}.active = ?`, true)
		.where(`${TABLE_NAME.PATIENT}.active = ?`, true)
		.order(`${TABLE_NAME.PATIENT}.updated_at`, false)
		.toString();

	const query = squelPostgres
		.select()
		.field('result.*')
		.field(
			`ARRAY_AGG(DISTINCT ${TABLE_NAME.PROFESSION}.name) FILTER (WHERE ${TABLE_NAME.PROFESSION}.name IS NOT NULL)`,
			'profession_name'
		)
		.from(`(${subQuery})`, 'result')
		.left_join(
			TABLE_NAME.PATIENT_TREATMENT,
			null,
			`${TABLE_NAME.PATIENT_TREATMENT}.patient_id = result.id AND ${TABLE_NAME.PATIENT_TREATMENT}.active = true`
		)
		.left_join(
			TABLE_NAME.EXPERTISE,
			null,
			`${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.PATIENT_TREATMENT}.expertise_id AND ${TABLE_NAME.EXPERTISE}.active = true`
		)
		.left_join(
			TABLE_NAME.PROFESSION,
			null,
			`${TABLE_NAME.PROFESSION}.id = ${TABLE_NAME.EXPERTISE}.profession_id AND ${TABLE_NAME.PROFESSION}.active = true`
		)
		.group(
			'result.id,result.first_name,result.last_name,result.phone,result.suspend,result.tech_issue,result.tech_reason,result.referral,result.logged_in_at,result.email,result.user_name,result.department_name, result.department_id, result.institute_name, result.institute_id,result.role,result.updated_at, result.no_prescription, result.no_booking, result.under_booked, result.over_booked, result.has_followup, result.final_sessions,result.created_at'
		)
		.order(`result.updated_at`, false)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const findPatientByUserId = async (userId) => {
	const result = await BaseModel.itemsByField(TABLE_NAME.PATIENT, 'user_id', userId);
	return result[0];
};

export const addPatientDepartments = async (patientData, departments, client = null) => {
	const rows = map(departments, (department) => ({ patient_id: patientData.id, department_id: department }));
	return await BaseModel.insertBulk(TABLE_NAME.PATIENT_DEPARTMENTS, rows, client);
};

export const createPatientDepartments = (patientData, departments, client = null) => {
	const rows = map(departments, (department) => ({ patient_id: patientData.id, department_id: department }));
	return BaseModel.insertBulk(TABLE_NAME.PATIENT_DEPARTMENTS, rows, client);
};

export const removeDepartmentsOfPatient = async (id, client = null) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.PATIENT_DEPARTMENTS)
		.where(`patient_id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const deletePatientDepartments = (id, client = null) => removeDepartmentsOfPatient(id, client);

export const getPatientsActivities = async (therapistId, startTime, endTime) => {
	// hack, not recognize the last day
	const newEndTime = endTime + ' 23:59:59';
	const getPatientDetails = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.id`)
		.field(`${TABLE_NAME.USER}.id`, 'user_id')
		.field(`${TABLE_NAME.PATIENT}.first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field('logged_in_at')
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
		.where(`${TABLE_NAME.THERAPIST}.id = ?`, therapistId)
		.where(`${TABLE_NAME.USER}.active = ?`, true)
		.toParam();
	const patientDetails = await BaseModel.runQuery(getPatientDetails);
	return patientDetails.rows;
};

export const getPatientsActivitiesData = async (patientId, startTime, endTime) => {
	// hack, not recognize the last day
	const newEndTime = endTime + ' 23:59:59';
	const getPatientDetails = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.id`)
		.field(`${TABLE_NAME.USER}.id`, 'user_id')
		.field(`${TABLE_NAME.PATIENT}.first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field('logged_in_at')
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
		.where(`${TABLE_NAME.PATIENT}.id = ?`, patientId)
		.where(`${TABLE_NAME.USER}.active = ?`, true)
		.toParam();
	const patientDetails = await BaseModel.runQuery(getPatientDetails);
	return patientDetails.rows;
};

export const getPatientRelevantSessions = async (patientIds: number[], startTime: string, endTime: string) => {
	const patientIdsStr = patientIds.join(',');
	const newEndTime = endTime + ' 23:59:59';
	const getPatientSessions = squelPostgres
		.select()
		.field(`${TABLE_NAME.GAME_SESSION}.patient_id`)
		.field('start_time')
		.field(`(${TABLE_NAME.GAME_SESSION}.end_time - ${TABLE_NAME.GAME_SESSION}.start_time) as duration`)
		.field(`${TABLE_NAME.GAME_SESSION}.game_id`)
		.field(`${TABLE_NAME.GAME_SESSION}.game_summary`)
		.field(`${TABLE_NAME.GAME_SESSION}.session_feedback`)
		.field('therapist_session_id')
		.from(TABLE_NAME.GAME_SESSION)
		.where(
			`patient_id IN (${patientIdsStr}) AND (${TABLE_NAME.GAME_SESSION}.start_time >= ? AND ${TABLE_NAME.GAME_SESSION}.start_time <= ?)`,
			startTime,
			newEndTime
		)
		.toParam();
	const result = await BaseModel.runQuery(getPatientSessions);
	return result.rows;
};

export const updatePatientCameraAvailability = async (id, has_camera, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT)
		.set('has_camera', has_camera)
		.where(`id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const updatePatientTechIssue = async (id, techIssue, client = null) => {
	const selectOldValue = `(SELECT tech_issue FROM ${TABLE_NAME.PATIENT} WHERE id = ${id} FOR UPDATE)`;
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT, 'p')
		.set('tech_issue', techIssue)
		.from(selectOldValue, 'po')
		.where(`p.id = ?`, id)
		.returning('p.id, p.user_id, p.tech_issue, po.tech_issue AS old_tech_issue')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return UtilModel.convertKeysToCamelCase(result.rows?.[0]);
};

export const getPatientById = async (id: number) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name`)
		.field(`${TABLE_NAME.PATIENT}.id`)
		.field(`${TABLE_NAME.PATIENT}.identity_number`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.PATIENT}.suspend`)
		.field(`${TABLE_NAME.PATIENT}.tech_issue`)
		.field(`${TABLE_NAME.PATIENT}.tech_reason`)
		.field(`${TABLE_NAME.PATIENT}.notification_email`)
		.field(`${TABLE_NAME.PATIENT}.referral`)
		.field(`${TABLE_NAME.PATIENT}.has_camera`)
		.field(`${TABLE_NAME.USER}.logged_in_at`)
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field(`${TABLE_NAME.USER}.id`, 'user_id')
		.field(`${TABLE_NAME.INSTITUTE}.name`, 'institute_name')
		.field(`${TABLE_NAME.INSTITUTE}.id`, 'institute_id')
		.field(`ARRAY_AGG(${TABLE_NAME.DEPARTMENT}.id)`, 'departments_ids')
		.field('role')
		.from(TABLE_NAME.PATIENT)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
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
		.left_join(TABLE_NAME.INSTITUTE, null, `${TABLE_NAME.DEPARTMENT}.institute_id = ${TABLE_NAME.INSTITUTE}.id`)
		.where(`${TABLE_NAME.USER}.active = ?`, true)
		.where(`${TABLE_NAME.PATIENT}.id = ?`, id)
		.group(`${TABLE_NAME.PATIENT}.id`)
		.group(`${TABLE_NAME.USER}.id`)
		.group(`${TABLE_NAME.INSTITUTE}.id`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows?.[0];
};

export const getPatientContacts = async (patientId: number) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT_CONTACTS}.full_name`)
		.field(`${TABLE_NAME.PATIENT_CONTACTS}.phone`)
		.field(`${TABLE_NAME.PATIENT_CONTACTS}.email`)
		.from(TABLE_NAME.PATIENT_CONTACTS)
		.where(`patient_id = ?`, patientId)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const updatePatientContacts = async (patientId, patientContacts, client = null) => {
	const deleteQuery = squelPostgres
		.delete()
		.from(TABLE_NAME.PATIENT_CONTACTS)
		.where(`patient_id = ?`, patientId)
		.returning('*')
		.toParam();
	const oldContacts = await BaseModel.runQuery(deleteQuery, client);
	const newContacts = await BaseModel.insertBulk(TABLE_NAME.PATIENT_CONTACTS, patientContacts, client);
	return [newContacts, oldContacts.rows];
};

export const getAllInactive = async () => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name`)
		.field(`${TABLE_NAME.PATIENT}.id`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.PATIENT}.updated_at`)
		.field(`${TABLE_NAME.USER}.logged_in_at`)
		.field(`${TABLE_NAME.USER}.email`)
		.field(`${TABLE_NAME.USER}.user_name`)
		.field('role')
		.from(TABLE_NAME.PATIENT)
		.join(TABLE_NAME.USER, null, `${TABLE_NAME.PATIENT}.user_id = ${TABLE_NAME.USER}.id`)
		.where(`${TABLE_NAME.USER}.active = ? OR ${TABLE_NAME.PATIENT}.active = ?`, false, false)
		.order(`${TABLE_NAME.PATIENT}.updated_at`, false)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const activatePatient = async (patientId: number, client = null) => {
	const patientQuery = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT)
		.set('active', true)
		.where(`id = ?`, patientId)
		.returning('*')
		.toParam();
	const patientResult = await BaseModel.runQuery(patientQuery, client);

	const userQuery = squelPostgres
		.update()
		.table(TABLE_NAME.USER)
		.set('active', true)
		.where(`id = ?`, patientResult.rows[0].user_id)
		.returning('*')
		.toParam();
	const userResult = await BaseModel.runQuery(userQuery, client);

	return userResult.rows[0];
};

export const getPatientUserId = async (patientId: number): Promise<number> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT}.user_id`)
		.from(TABLE_NAME.PATIENT)
		.where(`${TABLE_NAME.PATIENT}.id = ?`, patientId)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows[0].user_id;
};

export const addPatientRTM = (patient_id, painSession, client = null) => {
	return BaseModel.createRow(
		TABLE_NAME.RTM,
		{ patient_id, event: JSON.stringify({
			"note": null,
			"pain_level": painSession,
			"therapist_id": null,
			"minutes_spent": null,
			"review_activity": null,
			"reminder_to_exercise": null
		  }), timestamp: new Date().toDateString() },
		rtmValidator,
		client
	);
};

export const getAllPatientRTMDetails = async ( startDate: any, endDate: any, sendMail: boolean = false) => {
    const query = squelPostgres
        .select()
        .field(`${TABLE_NAME.PATIENT}.first_name`)
        .field(`${TABLE_NAME.PATIENT}.last_name`)
        .field(`${TABLE_NAME.PATIENT}.phone`)
        .field(`patient_user.email`, 'email')
        .field(`patient_user.user_name`, 'patient_username')
        .field(`rtm.patient_id`)
        .field(`rtm.event`)
        .field(`rtm.timestamp`, 'since')
        .field(`${TABLE_NAME.THERAPIST}.first_name`, 'therapist_first_name')
        .field(`${TABLE_NAME.THERAPIST}.last_name`, 'therapist_last_name')
        .field(`therapist_user.user_name`, 'therapist_username')
        .from(TABLE_NAME.RTM, 'rtm')
        .join(TABLE_NAME.PATIENT, null, `rtm.patient_id = ${TABLE_NAME.PATIENT}.id`)
        .join(TABLE_NAME.USER, 'patient_user', `${TABLE_NAME.PATIENT}.user_id = patient_user.id`)
        .join(TABLE_NAME.THERAPIST, null, `(rtm.event->>'therapist_id')::int = ${TABLE_NAME.THERAPIST}.id`)
        .join(TABLE_NAME.USER, 'therapist_user', `${TABLE_NAME.THERAPIST}.user_id = therapist_user.id`);

    if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
            throw new Error(`Invalid start date: ${startDate}`);
        }
        query.where(`rtm.timestamp >= ?`, parsedStartDate);
    }

    if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
            throw new Error(`Invalid end date: ${endDate}`);
        }
        query.where(`rtm.timestamp <= ?`, parsedEndDate);
    }

    const result = await BaseModel.runQuery(query.toParam());

    if (!result.rows.length) {
        throw new Error(`No data found for the specified date range.`);
    }

    const decryptedRows = result.rows.map(row => EncryptHelper.decryptJson(row));

    const aggregatedData = new Map();
    decryptedRows.forEach(row => {
        const patientId = row.patient_id;
        const daysData = parseInt(row.event.daysDataTransmittedInMonth) || 0;
        const minutes = parseInt(row.event.therapist_session_minutes) || 0;

        if (!aggregatedData.has(patientId)) {
            aggregatedData.set(patientId, {
                ...row,
                event: {
                    ...row.event,
                    daysDataTransmittedInMonth: daysData,
                    therapist_session_minutes: minutes,
                }
            });
        } else {
            const existing = aggregatedData.get(patientId);
            existing.event.daysDataTransmittedInMonth += daysData;
            existing.event.therapist_session_minutes += minutes;
        }
    });

    const finalData = Array.from(aggregatedData.values()).map(row => {
        const daysDataTransmittedInMonth = row.event.daysDataTransmittedInMonth;

        row['98977'] = daysDataTransmittedInMonth >= 16 ? 1 : 0;
        row['98980'] = daysDataTransmittedInMonth >= 20 ? 1 : 0;
        row['98981'] = daysDataTransmittedInMonth >= 40 ? 1 : 0;

        // Only set `98975` to 1 for the first eligible entry
        if (!row['98975'] && daysDataTransmittedInMonth >= 16) {
            row['98975'] = 1;
        } else {
            row['98975'] = 0;
        }

        return row;
    });

	if (!sendMail) {
        return { data: finalData };
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Patients RTM Data');

    worksheet.columns = [
        // { header: 'Patient ID', key: 'patient_id' },
        { header: 'Patient\'s Unique ID', key: 'username' },
        { header: 'First Name', key: 'first_name' },
        { header: 'Last Name', key: 'last_name' },
        // { header: 'Phone', key: 'phone' },
        // { header: 'Email', key: 'email' },
        { header: 'Since', key: 'since' },
        // { header: 'Pain Level', key: 'pain_level' },
        // { header: 'Review Activity', key: 'review_activity' },
        // { header: 'Reminder to Exercise', key: 'reminder_to_exercise' },
        { header: 'No. of Minutes of Remote Monitoring', key: 'therapist_session_minutes' },
        { header: 'No. of Days of Data Transmitted', key: 'days_of_data_transmitted' },
		{ header: '98975 (1,0)', key: '98975' },
    	{ header: '98977 (1,0)', key: '98977' },
    	{ header: '98980 (1,0)', key: '98980' },
    	{ header: '98981 (1,0)', key: '98981' },
        // { header: 'Therapist ID', key: 'therapist_id' },
        // { header: 'Therapist Username', key: 'therapist_username' },
		// { header: 'Therapist First Name', key: 'therapist_first_name' },
        // { header: 'Therapist Last Name', key: 'therapist_last_name' },
        // { header: 'Therapist Note', key: 'event_note' },
        // { header: 'Therapist Manual Minutes', key: 'minutes_spent' },
        // { header: 'Therapist Session Minutes', key: 'therapist_session_minutes' }, // below
    ];

    finalData.forEach(entry => {
        worksheet.addRow({
            username: entry.patient_username,
            first_name: entry.first_name,
            last_name: entry.last_name,
            // phone: entry.phone,
            // email: entry.email,
		since: entry.since,
            // pain_level: entry.event.pain_level,
            // review_activity: entry.event.review_activity,
            // reminder_to_exercise: entry.event.reminder_to_exercise,
            days_of_data_transmitted: entry.event.daysDataTransmittedInMonth,
			'98975': entry['98975'],
        	'98977': entry['98977'],
        	'98980': entry['98980'],
        	'98981': entry['98981'],
            // therapist_username: entry.therapist_username,
            // therapist_first_name: entry.therapist_first_name,
            // therapist_last_name: entry.therapist_last_name,
            // event_note: entry.event.note,
            // minutes_spent: entry.event.minutes_spent,
            therapist_session_minutes: entry.event.therapist_session_minutes,
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const msg = {
        to: 'yoramfeld@gmail.com', // yoramfeld@gmail.com
        from: process.env.SENGRID_FROM_EMAIL ? process.env.SENGRID_FROM_EMAIL : 'yoramfeld@gmail.com',
        subject: `Patient RTM Data Export - ${finalData.length} Records Found`,
        text: 'Please find the attached Excel file with the patients RTM data.',
        attachments: [
            {
                content: Buffer.from(buffer).toString('base64'),
                filename: `PatientData_${new Date().toISOString().split('T')[0]}.xlsx`,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                disposition: 'attachment',
            },
        ],
    };

    try {
        await sgMail.send(msg);
        return { message: 'Patient data successfully sent via email.' };
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Could not send email. Please try again later.");
    }
};

