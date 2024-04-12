import faker from 'faker';
import { sample, sampleSize, forEach } from 'lodash';

import { TABLE_NAME, NO_AVAILABILITY } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';
import { createUser } from './user.factory';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const createAvailability = async (week: number = null, year: number = null, userId: number = null) => {
	if (week === null) {
		week = faker.datatype.number({ min: 1, max: 52 });
	}
	if (year === null) {
		year = faker.datatype.number({ min: 2021, max: 2025 });
	}

	if (!userId) {
		const user = await createUser('therapist');
		userId = user.userId;
	}
	const availabilityId = faker.datatype.number();
	const availability = getAvailabilityObject();
	const availabilityParams = {
		id: availabilityId,
		week,
		year,
		user_id: userId,
		availability,
	};
	await BaseModel.insertRow(TABLE_NAME.AVAILABILITY, availabilityParams);
	delete availabilityParams['id'];
	return { ...availabilityParams, availability_id: availabilityId };
};

const getAvailabilityObject = (): any => {
	const numberOfDays = faker.datatype.number({ min: 1, max: 5 });
	const days = sampleSize(DAYS, numberOfDays);
	const availability = NO_AVAILABILITY;
	forEach(days, (day) => {
		const numberOfShifts = faker.datatype.number({ min: 1, max: 3 });
		let minHour = 8;
		let shifts: number[] = [];
		for (let i = 0; i < numberOfShifts; i++) {
			shifts = [...shifts, ...getRandomTimes(minHour)];
			minHour = shifts[shifts.length - 1] + 0.5;
		}
		availability[day] = shifts;
	});
	return JSON.stringify(availability);
};

const getRandomTimes = (minHour): [start: number, end: number] => {
	const minutes = [0, 0.25, 0.5, 0.75];
	const duration = faker.datatype.number({ min: 1, max: 5 });
	const start = minHour + 1.5 + sample(minutes);
	const end = start + duration + sample(minutes);
	return [start, end];
};
