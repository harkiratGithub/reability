import moment, { Moment } from 'moment';
import { isNil } from 'lodash';

import * as AvailabilityModel from '../models/availability.model';
import { NO_AVAILABILITY } from '../const';
import { convertKeysToSnakeCase } from '../models/util.model';
import { weekNumberFromDate } from '../services/week-number.helper';

export const setAvailability = async (
	availabilityToSet: Omit<AvailabilityModel.IAvailabilityClient, 'id'>,
	fromDate: Moment
) => {
	if (!isAvailabilityScheduleFormatOk(Object.values(availabilityToSet.availability))) {
		throw new Error('availability schedule not in correct format');
	}
	const { userId, week, year } = availabilityToSet;

	if (week === 0 && year === 0 && fromDate) {
		const momentFromDate = moment(fromDate);
		copyOldDefaultAvailabilityToPreviousWeeks(userId, momentFromDate);
	}

	const availability = JSON.stringify(availabilityToSet.availability);
	const currentUserAvailability = await AvailabilityModel.getUserAvailability(userId, week, year);
	if (!currentUserAvailability) {
		return await AvailabilityModel.create(convertKeysToSnakeCase({ ...availabilityToSet, availability }));
	}
	return await AvailabilityModel.update(userId, week, year, availability);
};

export const getUserAvailability = async (
	userId: number,
	week: number,
	year: number
): Promise<{ isUniqueWeek: boolean; availability: AvailabilityModel.IAvailabilitySchedule }> => {
	let userAvailability = await AvailabilityModel.getUserAvailability(userId, week, year);
	const isUniqueWeek = !isNil(userAvailability);
	if (!userAvailability) {
		userAvailability = await AvailabilityModel.getUserAvailability(userId, 0, 0);
	}
	return { isUniqueWeek, availability: userAvailability?.availability ?? NO_AVAILABILITY };
};

export const deleteUserAvailability = async (userId: number, week: number, year: number) => {
	if (!(userId && week && year)) {
		throw new Error('Wrong parameters on delete availability');
	}
	return await AvailabilityModel.deleteAvailability(userId, week, year);
};

const isAvailabilityScheduleFormatOk = (availabilityScheduleArrays: number[][]): boolean => {
	return availabilityScheduleArrays.every((times: number[]) => {
		return times.length % 2 === 0 && times.every((time, i) => i === 0 || time > times[i - 1]);
	});
};

const copyOldDefaultAvailabilityToPreviousWeeks = async (userId: number, fromDate: Moment) => {
	if (!fromDate || !userId) {
		return;
	}

	fromDate = fromDate.weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
	const currentDate = moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
	const currentWeek = weekNumberFromDate(
		currentDate.format('YYYY'),
		currentDate.format('MM'),
		currentDate.format('DD')
	);
	const fromWeek = weekNumberFromDate(fromDate.format('YYYY'), fromDate.format('MM'), fromDate.format('DD'));

	if (fromWeek.weekNumber <= currentWeek.weekNumber && fromWeek.year <= currentWeek.year) {
		return;
	}

	const userDefaultAvailability = (await AvailabilityModel.getUserAvailability(userId, 0, 0)) ?? {
		availability: NO_AVAILABILITY,
	};
	const jsonAvailability = JSON.stringify(userDefaultAvailability.availability);

	for (
		let currentDateForUpdate = fromDate.subtract(1, 'weeks');
		currentDateForUpdate >= currentDate;
		currentDateForUpdate = currentDateForUpdate.subtract(1, 'weeks')
	) {
		const weekToSet = weekNumberFromDate(
			currentDateForUpdate.format('YYYY'),
			currentDateForUpdate.format('MM'),
			currentDateForUpdate.format('DD')
		);
		const weekAvailability = await AvailabilityModel.getUserAvailability(userId, weekToSet.weekNumber, weekToSet.year);
		if (!weekAvailability) {
			const availabilityToCreate: Omit<AvailabilityModel.IAvailabilityDb, 'id'> = {
				availability: jsonAvailability,
				userId,
				week: weekToSet.weekNumber,
				year: weekToSet.year,
			};
			await AvailabilityModel.create(convertKeysToSnakeCase(availabilityToCreate));
		}
	}
};
