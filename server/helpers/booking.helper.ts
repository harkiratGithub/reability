import moment from 'moment';
import { last } from 'lodash';

import * as BookingModel from '../models/booking.model';
import * as PatientTreatmentHelper from '../helpers/patient-treatment.helper';
import * as TherapistHelper from '../helpers/therapist.helper';
import * as PatientHelper from '../helpers/patient.helper';
import { weekNumberFromDate } from '../services/week-number.helper';
import { BOOKING_DELETE_OPTIONS } from '../const';
import * as EncryptHelper from '../services/encrypt.helper';
import { convertKeysToCamelCase } from '../models/util.model';
import { getTimeString } from '../services/util.helper';

// date format - DD-MM-YYYY
export const assignPatientTreatment = async (
	patientTreatmentId: number,
	therapistId: number,
	date: string,
	time: number,
	timesToRepeat: number
) => {
	const momentDate = moment(date, 'DD-MM-YYYY');
	const assignments = [];
	const assignmentTemplate = {
		therapist_id: therapistId,
		patient_treatment_id: patientTreatmentId,
		week_day: momentDate.format('dddd'),
		time,
	};
	for (let i = 0; i < timesToRepeat; i++) {
		// for i = 0 we not change the date
		if (i > 0) {
			momentDate.add(1, 'weeks');
		}
		const weekNumberDate = weekNumberFromDate(
			momentDate.format('YYYY'),
			momentDate.format('MM'),
			momentDate.format('DD')
		);
		assignments.push({
			...assignmentTemplate,
			week_number: weekNumberDate.weekNumber,
			year: weekNumberDate.year,
		});
	}
	const result = await BookingModel.createMultipleAssignments(assignments);
	const expertiseDetails = convertKeysToCamelCase(await BookingModel.getPatientExpertise(patientTreatmentId));
	const therapist = await TherapistHelper.getTherapistById(therapistId);
	const decryptedTherapist = EncryptHelper.decryptJson(therapist);
	const therapistName = `${decryptedTherapist.first_name} ${decryptedTherapist.last_name}`;
	const userId = await PatientHelper.getPatientUserId(expertiseDetails.patientId);
	const weeks = `${assignments[0]?.week_number} - ${last(assignments)?.week_number}`;
	return {
		...convertKeysToCamelCase(result[0]),
		weeks,
		date,
		time: getTimeString(time),
		timesToRepeat,
		therapistName,
		userId,
		...expertiseDetails,
	};
};

// day - 0: Sunday, 1: Monday ... 6: Saturday
export const editPatientTreatment = (
	patientTreatmentId: number,
	year: number,
	week: number,
	oldDay: number,
	oldTime: number,
	newDay: number,
	newTime: number,
	editSpecificTreatment: boolean
) => {
	const oldDayFormat = moment().day(oldDay).format('dddd');
	const newDayFormat = moment().day(newDay).format('dddd');
	if (editSpecificTreatment) {
		return BookingModel.editSpecificTreatment(
			patientTreatmentId,
			year,
			week,
			oldDayFormat,
			oldTime,
			newDayFormat,
			newTime
		);
	} else {
		return BookingModel.editSeriesOfTreatment(
			patientTreatmentId,
			year,
			week,
			oldDayFormat,
			oldTime,
			newDayFormat,
			newTime
		);
	}
};

export const deletePatientBooking = async (
	deleteOption: BOOKING_DELETE_OPTIONS,
	patientTreatmentId: number,
	year: number = null,
	week: number = null,
	day: number = null,
	time: number = null
) => {
	try {
		const expertiseDetails = convertKeysToCamelCase(await BookingModel.getPatientExpertise(patientTreatmentId));
		if (deleteOption === BOOKING_DELETE_OPTIONS.SPECIFIC_TREATMENT) {
			const formatDay = moment().day(day).format('dddd');
			await BookingModel.deleteSpecificBooking(patientTreatmentId, year, week, formatDay, time);
		}
		if (deleteOption === BOOKING_DELETE_OPTIONS.ALL_TREATMENTS_ON_SAME_DAY_AND_TIME) {
			const formatDay = moment().day(day).format('dddd');
			await BookingModel.deleteSameDayAndTimeBooking(patientTreatmentId, year, week, formatDay, time);
		}
		if (deleteOption === BOOKING_DELETE_OPTIONS.ALL_TREATMENTS_ON_SAME_PRESCRIPTION) {
			await BookingModel.deleteAllBookingOnSamePrescription(patientTreatmentId, week, year);
		}
		return expertiseDetails;
	} catch (err) {
		console.log('Delete Patient Treatment failed', err);
	}
};

export const getPatientSchedule = async (patientId: number, week: number, year: number): Promise<any> => {
	let patientBooking = await BookingModel.getPatientBooking(patientId, week, year);
	patientBooking = patientBooking.map((booking) => EncryptHelper.decryptJson(booking));
	const patientActiveTreatments = await PatientTreatmentHelper.getPatientActiveTreatments(patientId);
	const relatedBooking = {};
	const data = { patientBooking, patientActiveTreatments, relatedBooking };
	return data;
};

export const getTherapistSchedule = async (therapistId: number, week: number, year: number): Promise<any> => {
	let therapistBooking = await BookingModel.getTherapistBooking(therapistId, week, year);
	therapistBooking = therapistBooking.map((booking) => EncryptHelper.decryptJson(booking));
	const data = { therapistBooking };
	return data;
};

export const deletePatientBookingById = (id: number) => {
	return BookingModel.deletePatientBookingById(id);
};
export const editPatientBookingById = (bookingId: number, time: number, day: number) => {
	return BookingModel.updatePatientBookingById(bookingId, time, moment.weekdays(day));
};

export const getNumberOfFuturePatientTreatmentBookings = async (patientTreatmentId: number): Promise<number> => {
	const currentDate = moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
	const currentBookingWeek = weekNumberFromDate(
		currentDate.format('YYYY'),
		currentDate.format('MM'),
		currentDate.format('DD')
	);
	const { weekNumber: week, year } = currentBookingWeek;
	return BookingModel.getNumberOfFuturePatientTreatmentBookings(patientTreatmentId, week, year);
};

export const getFuturePatientBookingStatistics = async (patientId: number): Promise<any> => {
	return BookingModel.getFuturePatientBookingStatistics(patientId);
};
