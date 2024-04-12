import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { isEmpty, reduce } from 'lodash';
import { TABLE_NAME, ROLE } from '../../const';

import * as EncryptHelper from '../../services/encrypt.helper';
import * as UserModel from '../../models/users.model';

describe('TEST USER MODEL', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: getUserDetails()', () => {
		it('check if we get user details on therapist', async () => {
			await MockFunction.testSeedDatabase();
			let details = await UserModel.getUserDetails(1);
			details = reduce(
				details,
				(result, value) => {
					const patient = EncryptHelper.decryptJson(value);
					const { department_id, ...patientWithoutDepartmentId } = patient;
					const existingPatient = result.find(res => res.id === value.id);

					if (existingPatient) {
						existingPatient.departments_ids.push(department_id);
					} else {
						patientWithoutDepartmentId['departments_ids'] = [department_id];
						result.push({
							...patientWithoutDepartmentId,
							full_name: `${patient.first_name} ${patient.last_name}`,
						});
					}
					return result;
				},
				[]
			);
			expect(details[0].departments_ids.includes(1)).toBeTruthy();
			expect(details[0].first_name).toEqual(
				'ori'
			);
			expect(details[0].last_name).toEqual(
				'glick'
			);
		});

		it('check if we get user details on patient', async () => {
			await MockFunction.testSeedDatabase();
			let details = await UserModel.getUserDetails(2);
			details = reduce(
				details,
				(result, value) => {
					const patient = EncryptHelper.decryptJson(value);
					const { department_id, ...patientWithoutDepartmentId } = patient;
					const existingPatient = result.find(res => res.id === value.id);

					if (existingPatient) {
						existingPatient.departments_ids.push(department_id);
					} else {
						patientWithoutDepartmentId['departments_ids'] = [department_id];
						result.push({
							...patientWithoutDepartmentId,
							full_name: `${patient.first_name} ${patient.last_name}`,
						});
					}
					return result;
				},
				[]
			);
			expect(details[0].departments_ids.includes(1)).toBeTruthy();
			expect(details[0].first_name).toEqual(
				'gil'
			);
			expect(details[0].last_name).toEqual(
				'bbb'
			);
		});

		it('check if no details were found', async () => {
			await MockFunction.testSeedDatabase();
			const details = await UserModel.getUserDetails(17);
			expect(isEmpty(details[0])).toBeTruthy();
		});
	});

	describe('TESTING: getPatientsByTherapistId()', () => {
		it('check if we get all patients of specific therapist', async () => {
			await MockFunction.testSeedDatabase();
			const patients = await UserModel.getPatientsByTherapistId(1);
			expect(patients).toHaveLength(7);
		});

		it('check if we send therapist_id not exist', async () => {
			const patients = await UserModel.getPatientsByTherapistId(15);
			expect(patients).toHaveLength(0);
		});

		it('check if we send therapist_id without any patients', async () => {
			BaseModel.insertRow(TABLE_NAME.THERAPIST, {
				id: 1,
				first_name: 'ori',
				last_name: 'glick',
				identity_number: '8723435',
				phone: '054568431',
				user_id: null,
			});
			const patients = await UserModel.getPatientsByTherapistId(1);
			expect(patients).toHaveLength(0);
		});
	});
});
