import * as BaseModel from '../../services/BaseModel.service';
import * as Factory from '../factories/index';
import { TABLE_NAME } from '../../const';
import * as BookingModel from '../../models/booking.model';
import moment from 'moment';

const testBooking = async (row, therapist_id, year, week, time, day, several_booking_same_therapist) => {
	const booking = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
		therapist_id,
		year,
		week_number: week,
		time,
		week_day: moment().day(day).format('dddd'),
	});

	expect(booking).toHaveLength(several_booking_same_therapist);
	const patientTreatment = booking[0];

	const patientTreatmentDb = await BaseModel.itemsBySeveralFields(TABLE_NAME.PATIENT_TREATMENT, {
		id: patientTreatment.patient_treatment_id,
	});

	expect(patientTreatment.patient_treatment_id).toEqual(row.patient_treatment_id);
	expect(patientTreatmentDb[0].max_patients).toEqual(row.max_patients);
};

describe('TEST BOOKING MODEL', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: getAllBookedByExpertise()', () => {
		it('get all assignments by expertise(only 1 therapist)', async () => {
			const expertise1 = await Factory.createExpertise();
			const therapist1 = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist1, expertise1);

			const therapist2 = await Factory.createTherapist();
			const expertise2 = await Factory.createExpertise();
			await Factory.createTherapistExpertise(therapist2, expertise2);

			const expertise3 = await Factory.createExpertise();
			await Factory.createTherapistExpertise(therapist1, expertise3);

			// first assignment
			await Factory.createBooking(therapist1, expertise1, null, 2021, 20, 5, 10.25);
			await Factory.createBooking(therapist1, expertise3, null, 2021, 20, 5, 10.25);
			// second assignment
			await Factory.createBooking(therapist1, null, null, 2021, 20, 3, 12);
			await Factory.createBooking(therapist1, null, null, 2021, 20, 3, 12);
			await Factory.createBooking(therapist1, null, null, 2021, 20, 3, 12);
			// third assignment
			await Factory.createBooking(therapist1, null, null, 2021, 20, 4, 7);
			await Factory.createBooking(therapist1, null, null, 2021, 20, 4, 7);

			// should not returned
			// not same week
			await Factory.createBooking(therapist1, null, null, 2021, 21, 5, 11);
			await Factory.createBooking(therapist1, null, null, 2021, 21, 5, 11);
			// therapist2 not in expertise1
			await Factory.createBooking(therapist2, null, null, 2021, 20, 5, 11);
			await Factory.createBooking(therapist2, null, null, 2021, 20, 5, 11);
			await Factory.createBooking(therapist2, null, null, 2021, 20, 5, 11);

			const results = await BookingModel.getAllBookedByExpertise(expertise1.expertise_id, 20, 2021);
			expect(results).toHaveLength(7);
			await testBooking(
				results.find(
					(x) =>
						x.therapist_id === therapist1.therapist_id &&
						x.year === 2021 &&
						x.week_number === 20 &&
						x.time === 10.25 &&
						x.expertise_id === expertise1.expertise_id &&
						x.week_day === moment().day(5).format('dddd')
				),
				therapist1.therapist_id,
				2021,
				20,
				10.25,
				5,
				2
			);
			await testBooking(
				results.find(
					(x) =>
						x.therapist_id === therapist1.therapist_id &&
						x.year === 2021 &&
						x.week_number === 20 &&
						x.time === 12 &&
						x.week_day === moment().day(3).format('dddd')
				),
				therapist1.therapist_id,
				2021,
				20,
				12,
				3,
				3
			);
			await testBooking(
				results.find(
					(x) =>
						x.therapist_id === therapist1.therapist_id &&
						x.year === 2021 &&
						x.week_number === 20 &&
						x.time === 7 &&
						x.week_day === moment().day(4).format('dddd')
				),
				therapist1.therapist_id,
				2021,
				20,
				7,
				4,
				2
			);
		});
	});

	it('get all assignments by expertise(2 therapist)', async () => {
		const expertise1 = await Factory.createExpertise();
		const therapist1 = await Factory.createTherapist();
		await Factory.createTherapistExpertise(therapist1, expertise1);

		const therapist2 = await Factory.createTherapist();
		const expertise2 = await Factory.createExpertise();
		await Factory.createTherapistExpertise(therapist2, expertise2);

		const expertise3 = await Factory.createExpertise();
		await Factory.createTherapistExpertise(therapist1, expertise3);
		await Factory.createTherapistExpertise(therapist2, expertise1);

		// first assignment
		await Factory.createBooking(therapist1, expertise1, null, 2021, 20, 5, 10.25);
		await Factory.createBooking(therapist1, expertise3, null, 2021, 20, 5, 10.25);
		// second assignment
		await Factory.createBooking(therapist1, null, null, 2021, 20, 3, 12);
		await Factory.createBooking(therapist1, null, null, 2021, 20, 3, 12);
		await Factory.createBooking(therapist1, null, null, 2021, 20, 3, 12);
		// third assignment
		await Factory.createBooking(therapist1, null, null, 2021, 20, 4, 7);
		await Factory.createBooking(therapist1, null, null, 2021, 20, 4, 7);

		// therapist2 assignment
		await Factory.createBooking(therapist2, expertise3, null, 2021, 20, 5, 11);
		await Factory.createBooking(therapist2, expertise1, null, 2021, 20, 5, 11);
		await Factory.createBooking(therapist2, null, null, 2021, 20, 5, 11);

		// not same week
		await Factory.createBooking(therapist1, null, null, 2021, 21, 5, 11);
		await Factory.createBooking(therapist1, null, null, 2021, 21, 5, 11);

		const results = await BookingModel.getAllBookedByExpertise(expertise1.expertise_id, 20, 2021);
		expect(results).toHaveLength(10);
		await testBooking(
			results.find(
				(x) =>
					x.therapist_id === therapist1.therapist_id &&
					x.year === 2021 &&
					x.week_number === 20 &&
					x.time === 10.25 &&
					x.expertise_id === expertise1.expertise_id &&
					x.week_day === moment().day(5).format('dddd')
			),
			therapist1.therapist_id,
			2021,
			20,
			10.25,
			5,
			2
		);
		await testBooking(
			results.find(
				(x) =>
					x.therapist_id === therapist1.therapist_id &&
					x.year === 2021 &&
					x.week_number === 20 &&
					x.time === 12 &&
					x.week_day === moment().day(3).format('dddd')
			),
			therapist1.therapist_id,
			2021,
			20,
			12,
			3,
			3
		);
		await testBooking(
			results.find(
				(x) =>
					x.therapist_id === therapist1.therapist_id &&
					x.year === 2021 &&
					x.week_number === 20 &&
					x.time === 7 &&
					x.week_day === moment().day(4).format('dddd')
			),
			therapist1.therapist_id,
			2021,
			20,
			7,
			4,
			2
		);
		await testBooking(
			results.find(
				(x) =>
					x.therapist_id === therapist2.therapist_id &&
					x.year === 2021 &&
					x.week_number === 20 &&
					x.time === 11 &&
					x.week_day === moment().day(5).format('dddd')
			),
			therapist2.therapist_id,
			2021,
			20,
			11,
			5,
			3
		);
	});
});
