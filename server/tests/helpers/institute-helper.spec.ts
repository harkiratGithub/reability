import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME } from '../../const';

import * as InstituteHelper from '../../helpers/institute.helper';
import * as DepartmentHelper from '../../helpers/department.helper';

describe('TEST INSTITUTE HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: createInstitute()', () => {
		it('should throw error if there are extra fields', async () => {
			const newInstitute = { name: 'test', extra: 'extra' };
			const institutesBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);
			try {
				await InstituteHelper.createInstitute(newInstitute, []);
			} catch (err) {
				const institutesAfterInsert = await BaseModel.getAllTable(
					TABLE_NAME.INSTITUTE
				);
				expect(institutesBeforeInsert).toHaveLength(0);
				expect(institutesAfterInsert).toHaveLength(0);
				expect(err.message).toBeTruthy();
			}
		});
		it('should throw error if not all required fields supplied', async () => {
			const newInstitute = {};
			const institutesBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);
			try {
				await InstituteHelper.createInstitute(newInstitute, []);
			} catch (err) {
				const institutesAfterInsert = await BaseModel.getAllTable(
					TABLE_NAME.INSTITUTE
				);
				expect(institutesBeforeInsert).toHaveLength(0);
				expect(institutesAfterInsert).toHaveLength(0);
				expect(err.message).toBeTruthy();
			}
		});
		it('should create institute successfully', async () => {
			const newInstitute = { name: 'test' };
			const institutesBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);
			const result = await InstituteHelper.createInstitute(newInstitute, []);
			const instituteCreated = result.institute;
			const instituteFoundInDB = await BaseModel.itemsByField(
				TABLE_NAME.INSTITUTE,
				'name',
				'test'
			);
			const institutesAfterInsert = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);

			expect(institutesBeforeInsert).toHaveLength(0);
			expect(institutesAfterInsert).toHaveLength(1);
			expect(instituteCreated.name).toEqual(newInstitute.name);
			expect(instituteFoundInDB).toHaveLength(1);
			expect(instituteFoundInDB[0].name).toEqual(newInstitute.name);
		});
		it('should throw error about duplicate name constraint if such name already exists', async () => {
			const newInstitute = { name: 'test' };
			const institutesBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);
			await InstituteHelper.createInstitute(newInstitute, []);
			try {
				await InstituteHelper.createInstitute(newInstitute, []);
			} catch (err) {
				const institutesAfterInsert = await BaseModel.getAllTable(
					TABLE_NAME.INSTITUTE
				);
				expect(institutesBeforeInsert).toHaveLength(0);
				expect(institutesAfterInsert).toHaveLength(1);
				expect(err.message).toEqual(
					`duplicate key value violates unique constraint "institute_name_key"`
				);
			}
		});
	});

	describe('TESTING: deleteInstitute()', () => {
		it('should delete existing institute', async () => {
			await MockFunction.testSeedDatabase();
			await InstituteHelper.deleteInstitute(1);

			const patients = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const notActivePatients = patients.filter(
				(patient) => patient.active === false
			);
			expect(notActivePatients).toHaveLength(7);

			const therapists = await BaseModel.getAllTable(TABLE_NAME.THERAPIST);
			const notActiveTherapists = therapists.filter(
				(therapist) => therapist.active === false
			);
			expect(notActiveTherapists).toHaveLength(2);

			const users = await BaseModel.getAllTable(TABLE_NAME.USER);
			const notActiveUsers = users.filter((user) => user.active === false);
			expect(notActiveUsers).toHaveLength(9);

			const departments = await BaseModel.getAllTable(TABLE_NAME.DEPARTMENT);
			const notActiveDepartments = departments.filter(
				(department) => department.active === false
			);
			expect(notActiveDepartments).toHaveLength(2);

			const institutes = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			const notActiveInstitutes = institutes.filter(
				(institute) => institute.active === false
			);
			expect(notActiveInstitutes).toHaveLength(1);
		});
	});

	describe('TESTING: getAll()', () => {
		it('check we not get any institute deleted & department deleted', async () => {
			await MockFunction.testSeedDatabase();
			await InstituteHelper.deleteInstitute(2);
			await DepartmentHelper.deleteDepartment(2);
			const allInstitutes = await InstituteHelper.getAll();
			expect(allInstitutes).toHaveLength(1);
		});
	});
});
