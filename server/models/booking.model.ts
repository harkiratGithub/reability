import moment from 'moment';
import squel from 'squel';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import { weekNumberFromDate } from '../services/week-number.helper';

const squelPostgres = squel.useFlavour('postgres');

export const createMultipleAssignments = (assignments): Promise<any[]> => {
	return BaseModel.insertBulkWithoutDuplicates(TABLE_NAME.BOOKING, assignments, 'patient_booking_constraint');
};

export const getAll = () => {
	return BaseModel.getAllTable(TABLE_NAME.BOOKING);
};
export const deletePatientBookingById = (id: number) => {
	return BaseModel.deleteRowById(TABLE_NAME.BOOKING, id);
};
export const editSpecificTreatment = async (patientTreatmentId, year, weekNumber, oldDay, oldTime, newDay, newTime) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.BOOKING)
		.set('week_day', newDay)
		.set('time', newTime)
		.where(`${TABLE_NAME.BOOKING}.patient_treatment_id = ?`, patientTreatmentId)
		.where(`${TABLE_NAME.BOOKING}.year = ?`, year)
		.where(`${TABLE_NAME.BOOKING}.week_number = ?`, weekNumber)
		.where(`${TABLE_NAME.BOOKING}.week_day = ?`, oldDay)
		.where(`${TABLE_NAME.BOOKING}.time = ?`, oldTime)
		.toParam();
	return BaseModel.runQuery(query);
};

export const editSeriesOfTreatment = async (patientTreatmentId, year, weekNumber, oldDay, oldTime, newDay, newTime) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.BOOKING)
		.set('week_day', newDay)
		.set('time', newTime)
		.where(`${TABLE_NAME.BOOKING}.patient_treatment_id = ?`, patientTreatmentId)
		.where(`${TABLE_NAME.BOOKING}.week_day = ?`, oldDay)
		.where(`${TABLE_NAME.BOOKING}.time = ?`, oldTime)
		.where(
			`(${TABLE_NAME.BOOKING}.year = ? and ${TABLE_NAME.BOOKING}.week_number >= ?) or (${TABLE_NAME.BOOKING}.year > ?)`,
			year,
			weekNumber,
			year
		)
		.toParam();
	return BaseModel.runQuery(query);
};

export const deleteSpecificBooking = async (patientTreatmentId, year, weekNumber, day, time) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.BOOKING)
		.where(`${TABLE_NAME.BOOKING}.patient_treatment_id = ?`, patientTreatmentId)
		.where(`${TABLE_NAME.BOOKING}.year = ?`, year)
		.where(`${TABLE_NAME.BOOKING}.week_number = ?`, weekNumber)
		.where(`${TABLE_NAME.BOOKING}.week_day = ?`, day)
		.where(`${TABLE_NAME.BOOKING}.time = ?`, time)
		.toParam();
	return BaseModel.runQuery(query);
};

export const deleteSameDayAndTimeBooking = async (patientTreatmentId, year, weekNumber, day, time) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.BOOKING)
		.where(`${TABLE_NAME.BOOKING}.patient_treatment_id = ?`, patientTreatmentId)
		.where(`${TABLE_NAME.BOOKING}.week_day = ?`, day)
		.where(`${TABLE_NAME.BOOKING}.time = ?`, time)
		.where(
			`(${TABLE_NAME.BOOKING}.year = ? and ${TABLE_NAME.BOOKING}.week_number >= ?) or (${TABLE_NAME.BOOKING}.year > ?)`,
			year,
			weekNumber,
			year
		)
		.toParam();
	return BaseModel.runQuery(query);
};

export const deleteAllBookingOnSamePrescription = async (patientTreatmentId: number, week: number, year: number) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.BOOKING)
		.where(`${TABLE_NAME.BOOKING}.patient_treatment_id = ?`, patientTreatmentId)
		.where(
			`${TABLE_NAME.BOOKING}.year > ? OR (${TABLE_NAME.BOOKING}.year = ? AND ${TABLE_NAME.BOOKING}.week_number >= ?)`,
			year,
			year,
			week
		)
		.toParam();

	return BaseModel.runQuery(query);
};

export const getPatientBooking = async (patientId: number, week: number, year: number): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.EXPERTISE}.id as expertise_id`)
		.field(`${TABLE_NAME.EXPERTISE}.name`)
		.field(`${TABLE_NAME.EXPERTISE}.duration`)
		.field(`${TABLE_NAME.EXPERTISE}.max_patients as expertise_max_patients`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.id as treatment_id`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.times_per_week`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.max_patients as patient_treatment_max_patients`)
		.field(`${TABLE_NAME.THERAPIST}.first_name as therapist_first_name`)
		.field(`${TABLE_NAME.THERAPIST}.last_name as therapist_last_name`)
		.field(`${TABLE_NAME.BOOKING}.week_day`)
		.field(`${TABLE_NAME.BOOKING}.time`)
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.PATIENT_TREATMENT}.expertise_id`)
		.left_join(
			TABLE_NAME.BOOKING,
			null,
			`${TABLE_NAME.BOOKING}.patient_treatment_id = ${TABLE_NAME.PATIENT_TREATMENT}.id`
		)
		.left_join(TABLE_NAME.THERAPIST, null, `${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.BOOKING}.therapist_id`)
		.where(`${TABLE_NAME.PATIENT_TREATMENT}.patient_id = ?`, patientId)
		.where(`${TABLE_NAME.BOOKING}.week_number = ?`, week)
		.where(`${TABLE_NAME.BOOKING}.year = ?`, year)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getAllBookedByExpertise = async (expertiseIds: number[], weekNumber: number, year: number) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.THERAPIST}.id`, 'therapist_id')
		.field(`${TABLE_NAME.BOOKING}.patient_treatment_id`)
		.field(`${TABLE_NAME.BOOKING}.year`)
		.field(`${TABLE_NAME.BOOKING}.week_number`)
		.field(`${TABLE_NAME.BOOKING}.week_day`)
		.field(`${TABLE_NAME.BOOKING}.time`)
		.field(`${TABLE_NAME.PATIENT}.id`, 'patient_id')
		.field(`${TABLE_NAME.PATIENT}.first_name`, 'patient_first_name')
		.field(`${TABLE_NAME.PATIENT}.last_name`, 'patient_last_name')
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.max_patients`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.expertise_id`)
		.from(TABLE_NAME.BOOKING)
		.left_join(
			TABLE_NAME.PATIENT_TREATMENT,
			null,
			`${TABLE_NAME.PATIENT_TREATMENT}.id = ${TABLE_NAME.BOOKING}.patient_treatment_id`
		)
		.left_join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.PATIENT_TREATMENT}.patient_id`)
		.left_join(TABLE_NAME.THERAPIST, null, `${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.BOOKING}.therapist_id`)
		.where(
			`${TABLE_NAME.THERAPIST}.id in ?`,
			squelPostgres
				.select()
				.field(`${TABLE_NAME.THERAPIST_EXPERTISE}.therapist_id`)
				.from(TABLE_NAME.THERAPIST_EXPERTISE)
				.where(`expertise_id IN (${expertiseIds.join(',')})`)
		)
		.where(`(${TABLE_NAME.BOOKING}.year = ? and ${TABLE_NAME.BOOKING}.week_number = ?)`, year, weekNumber)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getTherapistBooking = async (therapistId: number, week: number, year: number): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.EXPERTISE}.id as expertise_id`)
		.field(`${TABLE_NAME.EXPERTISE}.name`)
		.field(`${TABLE_NAME.EXPERTISE}.duration`)
		.field(`${TABLE_NAME.EXPERTISE}.max_patients as expertise_max_patients`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.id as treatment_id`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.times_per_week`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.max_patients as patient_treatment_max_patients`)
		.field(`${TABLE_NAME.PATIENT}.id as patient_id`)
		.field(`${TABLE_NAME.PATIENT}.first_name as patient_first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name as patient_last_name`)
		.field(`${TABLE_NAME.PATIENT}.tech_issue`)
		.field(`${TABLE_NAME.PATIENT}.tech_reason`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.BOOKING}.week_day`)
		.field(`${TABLE_NAME.BOOKING}.time`)
		.field(`${TABLE_NAME.BOOKING}.patient_treatment_id`)
		.field(`${TABLE_NAME.BOOKING}.id as booking_id`)
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.PATIENT_TREATMENT}.expertise_id`)
		.left_join(
			TABLE_NAME.BOOKING,
			null,
			`${TABLE_NAME.BOOKING}.patient_treatment_id = ${TABLE_NAME.PATIENT_TREATMENT}.id`
		)
		.left_join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.PATIENT_TREATMENT}.patient_id`)
		.where(`${TABLE_NAME.BOOKING}.therapist_id = ?`, therapistId)
		.where(`${TABLE_NAME.BOOKING}.week_number = ?`, week)
		.where(`${TABLE_NAME.BOOKING}.year = ?`, year)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getTherapistsBooking = async (therapistIds: number[], week: number, year: number): Promise<any[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.EXPERTISE}.id as expertise_id`)
		.field(`${TABLE_NAME.EXPERTISE}.name`)
		.field(`${TABLE_NAME.EXPERTISE}.duration`)
		.field(`${TABLE_NAME.EXPERTISE}.max_patients as expertise_max_patients`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.id as treatment_id`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.times_per_week`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.max_patients as patient_treatment_max_patients`)
		.field(`${TABLE_NAME.PATIENT}.id as patient_id`)
		.field(`${TABLE_NAME.PATIENT}.first_name as patient_first_name`)
		.field(`${TABLE_NAME.PATIENT}.last_name as patient_last_name`)
		.field(`${TABLE_NAME.PATIENT}.tech_issue`)
		.field(`${TABLE_NAME.PATIENT}.phone`)
		.field(`${TABLE_NAME.BOOKING}.week_day`)
		.field(`${TABLE_NAME.BOOKING}.time`)
		.field(`${TABLE_NAME.BOOKING}.patient_treatment_id`)
		.field(`${TABLE_NAME.BOOKING}.id as booking_id`)
		.field(`${TABLE_NAME.THERAPIST}.id as therapist_id`)
		.field(`${TABLE_NAME.THERAPIST}.first_name as therapist_first_name`)
		.field(`${TABLE_NAME.THERAPIST}.last_name as therapist_last_name`)
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.PATIENT_TREATMENT}.expertise_id`)
		.left_join(
			TABLE_NAME.BOOKING,
			null,
			`${TABLE_NAME.BOOKING}.patient_treatment_id = ${TABLE_NAME.PATIENT_TREATMENT}.id`
		)
		.left_join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.PATIENT_TREATMENT}.patient_id`)
		.left_join(TABLE_NAME.THERAPIST, null, `${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.BOOKING}.therapist_id`)
		.where(`${TABLE_NAME.BOOKING}.therapist_id IN ?`, therapistIds)
		.where(`${TABLE_NAME.BOOKING}.week_number = ?`, week)
		.where(`${TABLE_NAME.BOOKING}.year = ?`, year)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getPatientExpertise = async (patientTreatmentId) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.patient_id`)
		.field(`${TABLE_NAME.EXPERTISE}.name AS expertise_name `)
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.PATIENT_TREATMENT}.expertise_id`)
		.where(`${TABLE_NAME.PATIENT_TREATMENT}.id = ?`, patientTreatmentId)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows[0];
};

export const updatePatientBookingById = (bookingId: number, time: number, day: string) => {
	return BaseModel.updateRowByField(TABLE_NAME.BOOKING, { time, week_day: day }, 'id', bookingId);
};

export const getNumberOfFuturePatientTreatmentBookings = async (
	patientTreatmentId: number,
	fromWeek: number,
	fromYear: number
): Promise<number> => {
	const query = squelPostgres
		.select()
		.field(`COUNT(*) as bookings`)
		.from(TABLE_NAME.BOOKING)
		.where(`${TABLE_NAME.BOOKING}.patient_treatment_id = ?`, patientTreatmentId)
		.where(
			`(${TABLE_NAME.BOOKING}.week_number >= ? and ${TABLE_NAME.BOOKING}.year = ? ) OR ${TABLE_NAME.BOOKING}.year > ?`,
			fromWeek,
			fromYear,
			fromYear
		)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return +result.rows[0].bookings;
};

export const getFuturePatientBookingStatistics = async (patientId: number): Promise<any> => {
	const currentWeekDate = moment(new Date(), 'DD-MM-YYYY');
	const { weekNumber: currentWeekNumber, year: currentYear } = weekNumberFromDate(
		currentWeekDate.format('YYYY'),
		currentWeekDate.format('MM'),
		currentWeekDate.format('DD')
	);

	const bookingQuery = squelPostgres
		.select()
		.field(`COUNT(*) as bookings`)
		.from(TABLE_NAME.BOOKING)
		.join(
			TABLE_NAME.PATIENT_TREATMENT,
			null,
			`${TABLE_NAME.BOOKING}.patient_treatment_id = ${TABLE_NAME.PATIENT_TREATMENT}.id`
		)
		.join(TABLE_NAME.PATIENT, null, `${TABLE_NAME.PATIENT}.id = ${TABLE_NAME.PATIENT_TREATMENT}.patient_id`)
		.where(`${TABLE_NAME.PATIENT}.id = ?`, patientId)
		.where(
			`(${TABLE_NAME.BOOKING}.week_number >= ${currentWeekNumber} AND ${TABLE_NAME.BOOKING}.year = ${currentYear}) OR ${TABLE_NAME.BOOKING}.year > ${currentYear}`
		)
		.toParam();

	const patientTreatmentQuery = squelPostgres
		.select()
		.field(`COUNT(*) as patient_treatments`)
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.where(`${TABLE_NAME.PATIENT_TREATMENT}.patient_id = ?`, patientId)
		.where(`${TABLE_NAME.PATIENT_TREATMENT}.active = ?`, true)
		.toParam();

	const bookingResult = await BaseModel.runQuery(bookingQuery);
	const patientTreatmentResult = await BaseModel.runQuery(patientTreatmentQuery);
	const numberOfBookings = +bookingResult.rows[0].bookings;
	const numberOfPatientTreatments = +patientTreatmentResult.rows[0].patient_treatments;

	return { numberOfBookings, numberOfPatientTreatments };
};
