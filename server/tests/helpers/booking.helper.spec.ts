import { find } from 'lodash';
import moment from 'moment';
import { BOOKING_DELETE_OPTIONS, TABLE_NAME } from '../../const';
import * as BookingHelper from '../../helpers/booking.helper';
import * as BaseModel from '../../services/BaseModel.service';
import * as Factory from '../factories/index';
import { weekNumberFromDate } from '../../services/week-number.helper';

const checkBookingRow = (
	input: {
		patientTreatmentId: number;
		therapistId: number;
		weekDay: string;
		time: number;
		date: string;
	},
	row
) => {
	expect(input.patientTreatmentId).toEqual(row.patient_treatment_id);
	expect(input.therapistId).toEqual(row.therapist_id);
	expect(input.weekDay).toEqual(row.week_day);
	expect(input.time).toEqual(row.time);
	const momentDate = moment(input.date, 'DD-MM-YYYY');
	// preserve this function use
	const weekNumberDate = weekNumberFromDate(
		momentDate.format('YYYY'),
		momentDate.format('MM'),
		momentDate.format('DD')
	);
	expect(weekNumberDate.weekNumber).toEqual(row.week_number);
	expect(weekNumberDate.year).toEqual(row.year);
};

describe('TEST BOOKING HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: assignedPatientTreatment()', () => {
		it('create one time treatment', async () => {
			const patient = await Factory.createPatient();
			const expertise = await Factory.createExpertise();
			const patientTreatment = await Factory.createPatientTreatment(patient, expertise);
			const therapist = await Factory.createTherapist();
			const therapistExpertise = await Factory.createTherapistExpertise(therapist, expertise);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				'03-02-2021',
				10.25,
				1
			);
			const allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(1);
			checkBookingRow(
				{
					patientTreatmentId: patientTreatment.patient_treatment_id,
					therapistId: therapist.therapist_id,
					weekDay: 'Wednesday',
					time: 10.25,
					date: '03-02-2021',
				},
				allTable[0]
			);
		});

		it('create series of 6 treatments', async () => {
			const patient = await Factory.createPatient();
			const expertise = await Factory.createExpertise();
			const patientTreatment = await Factory.createPatientTreatment(patient, expertise);
			const therapist = await Factory.createTherapist();
			const therapistExpertise = await Factory.createTherapistExpertise(therapist, expertise);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				11,
				6
			);
			const allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(6);
			// Fri Dec 10 2021
			const template = {
				patientTreatmentId: patientTreatment.patient_treatment_id,
				therapistId: therapist.therapist_id,
				weekDay: 'Friday',
				time: 11,
				date: '10-12-2021',
			};
			for (let i = 0; i < 5; i++) {
				switch (i) {
					case 0:
						template['date'] = '10-12-2021';
						break;
					case 1:
						template['date'] = '17-12-2021';
						break;
					case 2:
						template['date'] = '24-12-2021';
						break;
					case 3:
						template['date'] = '31-12-2021';
						break;
					case 4:
						template['date'] = '07-01-2022';
						break;
					case 5:
						template['date'] = '14-01-2022';
						break;
				}
				const momentDate = moment(template['date'], 'DD-MM-YYYY');
				const rowWeekNumber = weekNumberFromDate(
					momentDate.format('YYYY'),
					momentDate.format('MM'),
					momentDate.format('DD')
				);
				const row = find(allTable, (x) => x['week_number'] === rowWeekNumber.weekNumber);
				checkBookingRow(template, row);
			}
		});
	});

	describe('TESTING: editPatientTreatment()', () => {
		it('edit one time treatment', async () => {
			const patient = await Factory.createPatient();
			const expertise = await Factory.createExpertise();
			const patientTreatment = await Factory.createPatientTreatment(patient, expertise);
			const therapist = await Factory.createTherapist();
			const therapistExpertise = await Factory.createTherapistExpertise(therapist, expertise);
			const dateString = '03-02-2021';
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				dateString,
				10.25,
				5
			);

			const momentDate = moment(dateString, 'DD-MM-YYYY');
			const weekYearFormat = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);
			await BookingHelper.editPatientTreatment(
				patientTreatment.patient_treatment_id,
				weekYearFormat.year,
				weekYearFormat.weekNumber,
				3,
				10.25,
				1,
				12,
				true
			);

			const editedRows = await BaseModel.itemsByField(TABLE_NAME.BOOKING, 'week_day', 'Monday');
			expect(editedRows.length).toEqual(1);
			checkBookingRow(
				{
					patientTreatmentId: patientTreatment.patient_treatment_id,
					therapistId: therapist.therapist_id,
					weekDay: 'Monday',
					time: 12,
					date: '01-02-2021',
				},
				editedRows[0]
			);
			const notChangedRows = await BaseModel.itemsByField(TABLE_NAME.BOOKING, 'week_day', 'Wednesday');
			expect(notChangedRows.length).toEqual(4);
		});

		it('edit series of treatments', async () => {
			const patient = await Factory.createPatient();
			const expertise = await Factory.createExpertise();
			const patientTreatment = await Factory.createPatientTreatment(patient, expertise);
			const therapist = await Factory.createTherapist();
			const therapistExpertise = await Factory.createTherapistExpertise(therapist, expertise);
			const dateString = '03-02-2021';
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				dateString,
				10.25,
				5
			);

			const momentDate = moment(dateString, 'DD-MM-YYYY');
			const weekYearFormat = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);
			await BookingHelper.editPatientTreatment(
				patientTreatment.patient_treatment_id,
				weekYearFormat.year,
				weekYearFormat.weekNumber,
				3,
				10.25,
				1,
				12,
				false
			);

			const editedRows = await BaseModel.itemsByField(TABLE_NAME.BOOKING, 'week_day', 'Monday');
			expect(editedRows.length).toEqual(5);
			const notChangedRows = await BaseModel.itemsByField(TABLE_NAME.BOOKING, 'week_day', 'Wednesday');
			expect(notChangedRows.length).toEqual(0);
		});

		it('edit series of treatments at end of the year', async () => {
			const patient = await Factory.createPatient();
			const expertise = await Factory.createExpertise();
			const patientTreatment = await Factory.createPatientTreatment(patient, expertise);
			const therapist = await Factory.createTherapist();
			const therapistExpertise = await Factory.createTherapistExpertise(therapist, expertise);
			const dateString = '10-12-2021';
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				dateString,
				10.25,
				6
			);

			const momentDate = moment(dateString, 'DD-MM-YYYY');
			const weekYearFormat = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);
			await BookingHelper.editPatientTreatment(
				patientTreatment.patient_treatment_id,
				weekYearFormat.year,
				weekYearFormat.weekNumber,
				5,
				10.25,
				1,
				12,
				false
			);

			const notChangedRows = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				week_day: 'Friday',
				time: 10.25,
			});
			expect(notChangedRows.length).toEqual(0);
			const editedRows = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				week_day: 'Monday',
				time: 12,
			});
			expect(editedRows.length).toEqual(6);
		});

		it('edit series with several series', async () => {
			const patient = await Factory.createPatient();
			const expertise = await Factory.createExpertise();
			const patientTreatment = await Factory.createPatientTreatment(patient, expertise);
			const therapist = await Factory.createTherapist();
			const therapistExpertise = await Factory.createTherapistExpertise(therapist, expertise);
			const dateString = '10-12-2021';
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				10.25,
				6
			);
			// should not affect from edit
			await BookingHelper.assignedPatientTreatment(
				patientTreatment.patient_treatment_id,
				therapist.therapist_id,
				'05-02-2021',
				10.25,
				6
			);
			const beforeEdit = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				week_day: 'Friday',
				time: 10.25,
			});
			expect(beforeEdit.length).toEqual(12);
			const momentDate = moment(dateString, 'DD-MM-YYYY');
			const weekYearFormat = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);
			await BookingHelper.editPatientTreatment(
				patientTreatment.patient_treatment_id,
				weekYearFormat.year,
				weekYearFormat.weekNumber,
				5,
				10.25,
				1,
				12,
				false
			);

			const notChangedRows = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				week_day: 'Friday',
				time: 10.25,
			});
			expect(notChangedRows.length).toEqual(6);
			const editedRows = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				week_day: 'Monday',
				time: 12,
			});
			expect(editedRows.length).toEqual(6);
		});
	});

	describe('TESTING: deletePatientTreatment()', () => {
		it('delete specific treatment', async () => {
			const patient = await Factory.createPatient();
			const expertise1 = await Factory.createExpertise();
			const patientTreatment1 = await Factory.createPatientTreatment(patient, expertise1);
			const therapist = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist, expertise1);
			const expertise2 = await Factory.createExpertise();
			const patientTreatment2 = await Factory.createPatientTreatment(patient, expertise1);
			await Factory.createTherapistExpertise(therapist, expertise2);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment1.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				11,
				6
			);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment2.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				13,
				6
			);
			let allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(12);

			const momentDate = moment('24-12-2021', 'DD-MM-YYYY');
			const weekNumberDate = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			await BookingHelper.deletePatientTreatment(
				BOOKING_DELETE_OPTIONS.SPECIFIC_TREATMENT,
				patientTreatment1.patient_treatment_id,
				weekNumberDate.year,
				weekNumberDate.weekNumber,
				5,
				11
			);

			allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(11);

			const checkDeleteExist = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				year: weekNumberDate.year,
				week_number: weekNumberDate.weekNumber,
				patient_treatment_id: patientTreatment1.patient_treatment_id,
			});
			expect(checkDeleteExist).toHaveLength(0);

			const checkOtherPrescriptionWorks = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				year: weekNumberDate.year,
				week_number: weekNumberDate.weekNumber,
				patient_treatment_id: patientTreatment2.patient_treatment_id,
			});
			expect(checkOtherPrescriptionWorks).toHaveLength(1);
		});

		it('delete all treatment on same day and time', async () => {
			const patient = await Factory.createPatient();
			const expertise1 = await Factory.createExpertise();
			const patientTreatment1 = await Factory.createPatientTreatment(patient, expertise1);
			const therapist = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist, expertise1);
			const expertise2 = await Factory.createExpertise();
			const patientTreatment2 = await Factory.createPatientTreatment(patient, expertise1);
			await Factory.createTherapistExpertise(therapist, expertise2);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment1.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				11,
				6
			);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment2.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				13,
				6
			);
			let allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(12);

			const momentDate = moment('10-12-2021', 'DD-MM-YYYY');
			const weekNumberDate = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			await BookingHelper.deletePatientTreatment(
				BOOKING_DELETE_OPTIONS.ALL_TREATMENTS_ON_SAME_DAY_AND_TIME,
				patientTreatment1.patient_treatment_id,
				weekNumberDate.year,
				weekNumberDate.weekNumber,
				5,
				11
			);

			allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(6);

			const checkDeleteExist = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment1.patient_treatment_id,
			});
			expect(checkDeleteExist).toHaveLength(0);

			const checkOtherPrescriptionWorks = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment2.patient_treatment_id,
			});
			expect(checkOtherPrescriptionWorks).toHaveLength(6);
		});

		it('delete all treatment on same day and time in future time', async () => {
			const patient = await Factory.createPatient();
			const expertise1 = await Factory.createExpertise();
			const patientTreatment1 = await Factory.createPatientTreatment(patient, expertise1);
			const therapist = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist, expertise1);
			const expertise2 = await Factory.createExpertise();
			const patientTreatment2 = await Factory.createPatientTreatment(patient, expertise1);
			await Factory.createTherapistExpertise(therapist, expertise2);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment1.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				11,
				6
			);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment2.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				13,
				6
			);
			let allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(12);

			const momentDate = moment('24-12-2021', 'DD-MM-YYYY');
			const weekNumberDate = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			await BookingHelper.deletePatientTreatment(
				BOOKING_DELETE_OPTIONS.ALL_TREATMENTS_ON_SAME_DAY_AND_TIME,
				patientTreatment1.patient_treatment_id,
				weekNumberDate.year,
				weekNumberDate.weekNumber,
				5,
				11
			);

			allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(8);

			const checkDeleteExist = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment1.patient_treatment_id,
			});
			expect(checkDeleteExist).toHaveLength(2);

			const checkOtherPrescriptionWorks = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment2.patient_treatment_id,
			});
			expect(checkOtherPrescriptionWorks).toHaveLength(6);
		});

		it('delete all treatment on same day and time when one in the series edited', async () => {
			const patient = await Factory.createPatient();
			const expertise1 = await Factory.createExpertise();
			const patientTreatment1 = await Factory.createPatientTreatment(patient, expertise1);
			const therapist = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist, expertise1);
			const expertise2 = await Factory.createExpertise();
			const patientTreatment2 = await Factory.createPatientTreatment(patient, expertise1);
			await Factory.createTherapistExpertise(therapist, expertise2);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment1.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				11,
				6
			);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment2.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				13,
				6
			);

			let momentDate = moment('24-12-2021', 'DD-MM-YYYY');
			const weekYearFormat = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			await BookingHelper.editPatientTreatment(
				patientTreatment1.patient_treatment_id,
				weekYearFormat.year,
				weekYearFormat.weekNumber,
				5,
				11,
				5,
				12,
				true
			);

			let allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(12);

			momentDate = moment('10-12-2021', 'DD-MM-YYYY');
			const weekNumberDate = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			await BookingHelper.deletePatientTreatment(
				BOOKING_DELETE_OPTIONS.ALL_TREATMENTS_ON_SAME_DAY_AND_TIME,
				patientTreatment1.patient_treatment_id,
				weekNumberDate.year,
				weekNumberDate.weekNumber,
				5,
				11
			);

			allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(7);

			const checkDeleteExist = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment1.patient_treatment_id,
			});
			expect(checkDeleteExist).toHaveLength(1);

			const checkOtherPrescriptionWorks = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment2.patient_treatment_id,
			});
			expect(checkOtherPrescriptionWorks).toHaveLength(6);
		});

		it('delete all patient treatment', async () => {
			const patient = await Factory.createPatient();
			const expertise1 = await Factory.createExpertise();
			const patientTreatment1 = await Factory.createPatientTreatment(patient, expertise1);
			const therapist = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist, expertise1);
			const expertise2 = await Factory.createExpertise();
			const patientTreatment2 = await Factory.createPatientTreatment(patient, expertise1);
			await Factory.createTherapistExpertise(therapist, expertise2);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment1.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				11,
				6
			);
			await BookingHelper.assignedPatientTreatment(
				patientTreatment2.patient_treatment_id,
				therapist.therapist_id,
				'10-12-2021',
				13,
				6
			);

			let momentDate = moment('24-12-2021', 'DD-MM-YYYY');
			const weekYearFormat = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			// delete even if edited
			await BookingHelper.editPatientTreatment(
				patientTreatment1.patient_treatment_id,
				weekYearFormat.year,
				weekYearFormat.weekNumber,
				5,
				11,
				5,
				12,
				true
			);

			let allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(12);

			momentDate = moment('10-12-2021', 'DD-MM-YYYY');
			const weekNumberDate = weekNumberFromDate(
				momentDate.format('YYYY'),
				momentDate.format('MM'),
				momentDate.format('DD')
			);

			await BookingHelper.deletePatientTreatment(
				BOOKING_DELETE_OPTIONS.ALL_TREATMENTS_ON_SAME_PRESCRIPTION,
				patientTreatment1.patient_treatment_id
			);

			allTable = await BaseModel.getAllTable(TABLE_NAME.BOOKING);
			expect(allTable).toHaveLength(6);

			const checkDeleteExist = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment1.patient_treatment_id,
			});
			expect(checkDeleteExist).toHaveLength(0);

			const checkOtherPrescriptionWorks = await BaseModel.itemsBySeveralFields(TABLE_NAME.BOOKING, {
				patient_treatment_id: patientTreatment2.patient_treatment_id,
			});
			expect(checkOtherPrescriptionWorks).toHaveLength(6);
		});
	});
});
