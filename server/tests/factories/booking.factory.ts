import faker from 'faker';
import { create } from 'lodash';
import moment from 'moment';
import { TABLE_NAME } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';
import { createExpertise } from './expertise.factory';
import { createPatientTreatment } from './patient-treatment.factory';
import { createTherapistExpertise } from './therapist-expertise.factory';
import { createTherapist } from './therapist.factory';

export const createBooking = async (
	therapist = null,
	expertise = null,
	patientTreatment = null,
	year = null,
	week_number = null,
	week_day = null,
	time = null
) => {
	if (!therapist) {
		therapist = await createTherapist();
	}
	if (!expertise) {
		expertise = await createExpertise();
		await createTherapistExpertise(therapist, expertise);
	}
	if (!patientTreatment) {
		patientTreatment = await createPatientTreatment(null, expertise);
	}
	if (week_number === null) {
		week_number = faker.datatype.number({ min: 1, max: 52 });
	}
	if (year === null) {
		year = faker.datatype.number({ min: 2021, max: 2025 });
	}
	if (week_day === null) {
		week_day = faker.datatype.number({ min: 0, max: 6 });
	}
	if (time === null) {
		time = faker.datatype.number({ min: 0, max: 23 });
	}
	const bookingId = faker.datatype.number();
	const bookingParams = {
		id: bookingId,
		therapist_id: therapist.therapist_id,
		patient_treatment_id: patientTreatment.patient_treatment_id,
		week_number,
		year,
		week_day: moment().day(week_day).format('dddd'),
		time,
	};
	await BaseModel.insertRow(TABLE_NAME.BOOKING, bookingParams);
	delete bookingParams['id'];
	return { ...bookingParams, booking_id: bookingId };
};
