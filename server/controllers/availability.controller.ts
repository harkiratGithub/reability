import { Request, Response, NextFunction } from 'express';
import { TABLE_NAME } from '../const';
import * as AvailabilityHelper from '../helpers/availability.helper';
import * as BookingHelper from '../helpers/booking.helper';
import * as ActivityLogHelper from '../helpers/activity-log.helper';
import { LogAction } from '../models/activity-log.model';

export const setAvailability = (req, res, next) => {
	try {
		const { fromDate, ...availability } = req.body;
		const user = req.user;
		AvailabilityHelper.setAvailability(availability, fromDate)
			.then(async (createdObject) => {
				const action = ActivityLogHelper.isCreateOrUpdateByDate(createdObject.createdAt, createdObject.updatedAt);
				ActivityLogHelper.createLog(
					user.id,
					createdObject.user_id,
					TABLE_NAME.AVAILABILITY,
					action,
					createdObject.id,
					null,
					null
				);
				res.json(createdObject);
			})
			.catch((err) => next(err));
	} catch (error) {
		next(error);
	}
};

export const deleteUserAvailability = (req, res, next) => {
	try {
		const { userId, week, year } = req.body;
		const user = req.user;

		AvailabilityHelper.deleteUserAvailability(userId, week, year)
			.then(async (deletedObject) => {
				ActivityLogHelper.createLog(
					user.id,
					userId,
					TABLE_NAME.AVAILABILITY,
					LogAction.Delete,
					deletedObject.id,
					null,
					null
				);
				res.json(deletedObject);
			})
			.catch((err) => next(err));
	} catch (error) {
		next(error);
	}
};

export const getTherapistSchedule = async (req: Request, res: Response, next: NextFunction) => {
	const { userId, therapistId, week, year } = req.body;
	try {
		const { isUniqueWeek, availability } = await AvailabilityHelper.getUserAvailability(userId, week, year);
		const booking = await BookingHelper.getTherapistSchedule(therapistId, week, year);
		const data = { isUniqueWeek, availability, booking };
		res.json(data);
	} catch (error) {
		next(error);
	}
};
