import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME } from '../../const';

import * as TherapistSessionHelper from '../../helpers/therapist-session.helper';

import { filter } from 'lodash';
import moment from 'moment';
import MockDate from 'mockdate';

describe('TEST THERAPIST SESSION HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: createTherapistSession()', () => {
		it('check if we create session as requested', async () => {
			await MockFunction.testSeedDatabase();
			await TherapistSessionHelper.createTherapistSession(1, 1);
			const therapistSessionTable = await BaseModel.getAllTable(
				TABLE_NAME.THERAPIST_SESSION
			);
			const therapistSession = filter(
				therapistSessionTable,
				(s) => s.patient_id === 1 && s.therapist_id === 1
			);
			expect(therapistSession).toHaveLength(1);
		});
	});

	describe('TESTING: updateTherapistSession()', () => {
		it('check if we create session as requested', async () => {
			await MockFunction.testSeedDatabase();
			const patientTable = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const patient = patientTable.find((p) => p.id === 1);
			// create session by patientId
			MockDate.set(1434319925275);

			await TherapistSessionHelper.createTherapistSession(patient.id, 1);
			MockDate.set(1434319926275);
			// update session by userId
			await TherapistSessionHelper.updateTherapistSession(patient.user_id);
			MockDate.set(1434319946275);
			await TherapistSessionHelper.createTherapistSession(patient.id, 1);
			MockDate.set(1434319947275);
			await TherapistSessionHelper.updateTherapistSession(patient.user_id);

			const therapistSessionTable = await BaseModel.getAllTable(
				TABLE_NAME.THERAPIST_SESSION
			);
			const therapistSessionFiltered = filter(
				therapistSessionTable,
				(s) => s.patient_id === patient.id && s.therapist_id === 1
			);
			expect(therapistSessionFiltered).toHaveLength(2);
			const firstSession = therapistSessionFiltered[0];
			const secondSession = therapistSessionFiltered[1];
			expect(secondSession.patient_id).toEqual(patient.id);
			expect(secondSession.therapist_id).toEqual(1);
			expect(
				moment(firstSession.start_time).isBefore(moment(firstSession.end_time))
			).toBeTruthy();
			expect(
				moment(secondSession.start_time).isBefore(
					moment(secondSession.end_time)
				)
			).toBeTruthy();
			expect(
				moment(firstSession.end_time).isBefore(moment(secondSession.start_time))
			).toBeTruthy();
			MockDate.reset();
		});
	});
});
