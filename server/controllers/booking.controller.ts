import { find, map } from 'lodash';
import moment from 'moment';
import { BOOKING_DELETE_OPTIONS, TABLE_NAME } from '../const';

import * as ActivityLogHelper from '../helpers/activity-log.helper';
import * as BookingHelper from '../helpers/booking.helper';
import * as PatientHelper from '../helpers/patient.helper';
import { LogAction } from '../models/activity-log.model';
import * as EncryptHelper from '../services/encrypt.helper';

export const assignPatientTreatment = (req, res, next) => {
	const { patientTreatmentId, therapistId, date, time, timesToRepeat } = req.body;
	if (!patientTreatmentId || !therapistId || !date || !time || !timesToRepeat) {
		return next(`assignedPatientTreatment: not valid`);
	}
	const user = req.user;
	BookingHelper.assignPatientTreatment(patientTreatmentId, therapistId, date, time, timesToRepeat)
		.then(async (createdObject) => {
			const { weekDay, time, date, therapistName, expertiseName, timesToRepeat } = createdObject;
			const logData = {
				from_date: date,
				week_day: weekDay,
				time,
				total_weeks: timesToRepeat,
				treatment: expertiseName,
				therapist_name: therapistName,
			};

			const logDataEncrypted = EncryptHelper.encryptJson(logData);

			await ActivityLogHelper.createLog(
				user.id,
				createdObject?.userId,
				TABLE_NAME.BOOKING,
				LogAction.Create,
				createdObject?.id,
				null,
				logDataEncrypted
			);
			res.json({ status: 'ok' });
		})
		.catch((err) => next(err));
};

//TODO not in use. can edit only day and time, one OR series
export const editBookedTreatment = (req, res, next) => {
	const { patientTreatmentId, editSpecificTreatment, year, week, oldDay, oldTime, newDay, newTime } = req.body;
	if (!patientTreatmentId || !year || !week || !oldDay || !oldTime || !newDay || !newTime) {
		return next(`editBookedTreatment: not valid`);
	}

	BookingHelper.editPatientTreatment(
		patientTreatmentId,
		year,
		week,
		oldDay,
		oldTime,
		newDay,
		newTime,
		editSpecificTreatment
	)
		.then(() => res.sendStatus(200))
		.catch((err) => next(err));
};

export const deletePatientBooking = (req, res, next) => {
	if (!Array.isArray(req.body)) {
		next('data should be array');
		return;
	}
	const treatments = req.body;
	const user = req.user;
	const firstTreatment = treatments[0];
	Promise.all(
		map(treatments, (treatment) => {
			const { deleteOption, patientTreatmentId, year, week, day, time } = treatment;
			if (!patientTreatmentId || deleteOption > 2 || deleteOption < 0) {
				return Promise.reject(`deleteBookedTreatment: not valid`);
			}
			return BookingHelper.deletePatientBooking(deleteOption, patientTreatmentId, year, week, day, time);
		})
	)
		.then(async (result: any[]) => {
			const patientExpertise = find(result, (e: any) => {
				return e?.patientId;
			});

			const logData = {
				expertise: result[0].expertiseName,
				day: moment.weekdays(firstTreatment.day),
				delete_option: BOOKING_DELETE_OPTIONS[firstTreatment.deleteOption].toLowerCase().split('_').join(' '),
			};

			const patientUserId = await PatientHelper.getPatientUserId(patientExpertise.patientId);

			await ActivityLogHelper.createLog(
				user.id,
				patientUserId,
				TABLE_NAME.BOOKING,
				LogAction.Delete,
				null,
				logData,
				null
			);
			res.json({ status: 'OK' });
		})
		.catch((err) => next(err));
};

export const getPatientSchedule = async (req, res, next) => {
	const { patientId, week, year } = req.body;
	try {
		const data = await BookingHelper.getPatientSchedule(patientId, week, year);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

export const deletePatientBookingById = async (req, res, next) => {
	const { id } = req.params;
	try {
		const data = await BookingHelper.deletePatientBookingById(id);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

export const editPatientBookingById = async (req, res, next) => {
	const { bookingId, time, day } = req.body;

	try {
		const data = await BookingHelper.editPatientBookingById(bookingId, time, day);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

export const getFuturePatientBookingStatistics = async (req, res, next) => {
	const { patientId } = req.body;
	try {
		const data = await BookingHelper.getFuturePatientBookingStatistics(patientId);
		res.json(data);
	} catch (error) {
		next(error);
	}
};
