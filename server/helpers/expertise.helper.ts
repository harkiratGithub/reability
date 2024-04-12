import { map, groupBy, filter, includes, reduce } from 'lodash';

import * as TherapistModel from '../models/therapist.model';
import * as ExpertiseModel from '../models/expertise.model';
import * as AvailabilityModel from '../models/availability.model';
import * as BookingModel from '../models/booking.model';
import * as DepartmentModel from '../models/department.model';
import * as EncryptHelper from '../services/encrypt.helper';

export const createExpertise = (expertise) => {
	return ExpertiseModel.create(expertise);
};

export const editExpertise = async (expertise): Promise<void> => {
	return await ExpertiseModel.updateById(expertise);
};

export const deleteExpertise = async (expertiseId: number): Promise<void> => {
	return await ExpertiseModel.remove(expertiseId);
};

export const getAll = () => {
	return ExpertiseModel.getAllActive();
};

export const getAllExpertiseSlots = async (
	expertiseIds: number[],
	weekNumber: number,
	year: number,
	patientId: number = null
) => {
	const therapistsWithAvailabilities = await AvailabilityModel.getAvailabilityByExpertise(
		expertiseIds,
		weekNumber,
		year
	);
	const idsOfTherapistsWithAvailabilities = map(
		therapistsWithAvailabilities,
		(therapistAvailability) => therapistAvailability.therapist_id
	);
	const allExpertiseTherapists = await TherapistModel.getTherapistsByExpertise(expertiseIds);
	const therapistsWithoutAvailability = filter(
		allExpertiseTherapists,
		(therapist) => !includes(idsOfTherapistsWithAvailabilities, therapist.therapist_id)
	);
	const therapistAvailabilities = [...therapistsWithAvailabilities, ...therapistsWithoutAvailability];

	const expertiseBooking = await BookingModel.getAllBookedByExpertise(expertiseIds, weekNumber, year);
	let therapistsBooking = {};

	if (therapistAvailabilities?.length > 0) {
		const therapistIds = map(therapistAvailabilities, (therapistAvailability) => therapistAvailability.therapist_id);
		const therapistsBookingRaws = await BookingModel.getTherapistsBooking(therapistIds, weekNumber, year);
		const decryptedTherapistsBookingRaws = EncryptHelper.decryptArray(therapistsBookingRaws);
		therapistsBooking = groupBy(decryptedTherapistsBookingRaws, (item) => item.therapist_id);
	}

	if (!patientId) {
		return {
			therapistAvailabilities: EncryptHelper.decryptArray(therapistAvailabilities),
			expertiseBooking: EncryptHelper.decryptArray(expertiseBooking),
			therapistsBooking,
		};
	}

	const matchedTherapistsIds = await DepartmentModel.getTherapistsIdsByPatientDepartments(patientId);

	const therapistAvailabilitiesDepartmentMatch = filter(therapistAvailabilities, (therapistAvailability) =>
		includes(matchedTherapistsIds, therapistAvailability.therapist_id)
	);
	const expertiseBookingDepartmentMatch = filter(expertiseBooking, (booking) =>
		includes(matchedTherapistsIds, booking.therapist_id)
	);

	const therapistsBookingDepartmentMatch = reduce(
		therapistsBooking,
		(filteredTherapistsBooking, value, key) => {
			if (includes(matchedTherapistsIds, +key)) {
				filteredTherapistsBooking[key] = value;
			}
			return filteredTherapistsBooking;
		},
		{}
	);

	return {
		therapistAvailabilities: EncryptHelper.decryptArray(therapistAvailabilitiesDepartmentMatch),
		expertiseBooking: EncryptHelper.decryptArray(expertiseBookingDepartmentMatch),
		therapistsBooking: therapistsBookingDepartmentMatch,
	};
};
