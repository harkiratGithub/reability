import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME } from '../../const';
import * as EncryptHelper from '../../services/encrypt.helper';

import * as DepartmentHelper from '../../helpers/department.helper';
import * as InstituteHelper from '../../helpers/institute.helper';

describe('TEST DEPARTMENT HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: createDepartment()', () => {
		it('should create department successfully', async () => {
			const newInstitute = { name: 'test' };
			const instituteCreated = (
				await InstituteHelper.createInstitute(newInstitute, [])
			).institute;
			const departmentsBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.DEPARTMENT
			);
			const newDepartment = {
				name: 'department',
				institute_id: instituteCreated.id,
			};
			const departmentCreated = await DepartmentHelper.createDepartment(
				newDepartment
			);
			const departmentsAfterInsert = await BaseModel.getAllTable(
				TABLE_NAME.DEPARTMENT
			);
			const departmentFoundInDB = await BaseModel.itemsByField(
				TABLE_NAME.DEPARTMENT,
				'name',
				'department'
			);

			expect(departmentsBeforeInsert).toHaveLength(0);
			expect(departmentsAfterInsert).toHaveLength(1);
			expect(departmentCreated.name).toEqual(newDepartment.name);
			expect(departmentCreated.institute_id).toEqual(
				newDepartment.institute_id
			);
			expect(departmentFoundInDB[0].name).toEqual(newDepartment.name);
			expect(departmentFoundInDB[0].institute_id).toEqual(
				newDepartment.institute_id
			);
		});
		it('should throw error if there is no relation to institute', async () => {
			const departmentsBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.DEPARTMENT
			);
			const newDepartment = { name: 'department', institute_id: 1 };
			try {
				await DepartmentHelper.createDepartment(newDepartment);
			} catch (err) {
				const departmentsAfterInsert = await BaseModel.getAllTable(
					TABLE_NAME.DEPARTMENT
				);
				expect(departmentsBeforeInsert).toHaveLength(0);
				expect(departmentsAfterInsert).toHaveLength(0);
				expect(err.message).toEqual(
					`insert or update on table "department" violates foreign key constraint "department_institute_id_fkey"`
				);
			}
		});
		it('should throw error about duplicate name constraint if such name already exists', async () => {
			const newInstitute1 = { name: 'test1' };
			const newInstitute2 = { name: 'test2' };
			const instituteCreated1 = (
				await InstituteHelper.createInstitute(newInstitute1, [])
			).institute;
			const instituteCreated2 = (
				await InstituteHelper.createInstitute(newInstitute2, [])
			).institute;
			const newDepartment1 = {
				name: 'department',
				institute_id: instituteCreated1.id,
			};
			await DepartmentHelper.createDepartment(newDepartment1);
			const newDepartment2 = {
				name: 'department',
				institute_id: instituteCreated2.id,
			};
			const departmentsBeforeInsert = await BaseModel.getAllTable(
				TABLE_NAME.DEPARTMENT
			);

			try {
				await DepartmentHelper.createDepartment(newDepartment2);
			} catch (err) {
				const departmentsAfterInsert = await BaseModel.getAllTable(
					TABLE_NAME.DEPARTMENT
				);
				const departmentFoundInDB = await BaseModel.itemsByField(
					TABLE_NAME.DEPARTMENT,
					'institute_id',
					instituteCreated1.id
				);
				expect(departmentsBeforeInsert).toHaveLength(1);
				expect(departmentsAfterInsert).toHaveLength(1);
				expect(departmentFoundInDB).toHaveLength(1);
				expect(departmentFoundInDB[0]).toBeDefined();
				expect(err.message).toEqual(
					`duplicate key value violates unique constraint \"department_name_key\"`
				);
			}
		});
	});
	describe('TESTING: deleteDepartment()', () => {
		it('should throw error if there is no department with such id', async () => {
			const newInstitute = { name: 'test' };
			const instituteCreated = (
				await InstituteHelper.createInstitute(newInstitute, [])
			).institute;
			const newDepartment = {
				name: 'department',
				institute_id: instituteCreated.id,
			};
			const createdDepartment = await DepartmentHelper.createDepartment(
				newDepartment
			);
			// making sure to have an id that isn't exist yet
			const departmentIdToDelete = createdDepartment.id + 10;
			const departmentsBeforeDelete = await BaseModel.getAllTable(
				TABLE_NAME.DEPARTMENT
			);
			try {
				await DepartmentHelper.deleteDepartment(departmentIdToDelete);
			} catch (err) {
				const departmentsAfterDelete = await BaseModel.getAllTable(
					TABLE_NAME.DEPARTMENT
				);
				expect(departmentsBeforeDelete).toHaveLength(1);
				expect(departmentsAfterDelete).toHaveLength(1);
			}
		});
		it('should delete existing department', async () => {
			await MockFunction.testSeedDatabase();
			await DepartmentHelper.deleteDepartment(1);

			const patients = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const notActivePatients = patients.filter(
				(patient) => patient.active === false
			);
			expect(notActivePatients).toHaveLength(6);
			const gilPatient = patients.find((x) => x.id === 2);
			expect(
				EncryptHelper.decryptPersonalData(gilPatient.first_name).includes('gil')
			).toBeTruthy();
			expect(gilPatient.active).toBeFalsy();

			const therapists = await BaseModel.getAllTable(TABLE_NAME.THERAPIST);
			const notActiveTherapists = therapists.filter(
				(therapist) => therapist.active === false
			);
			expect(notActiveTherapists).toHaveLength(2);
			const shlomoTherapist = notActiveTherapists.find((t) => t.id === 2);
			expect(
				EncryptHelper.decryptPersonalData(shlomoTherapist.first_name).includes(
					'shlomo'
				)
			).toBeTruthy();
			expect(shlomoTherapist.active).toBeFalsy();

			const users = await BaseModel.getAllTable(TABLE_NAME.USER);
			const notActiveUsers = users.filter((user) => user.active === false);
			expect(notActiveUsers).toHaveLength(8);
			const userNotActive = notActiveUsers.find((x) => x.id === 6);
			expect(userNotActive.user_name.includes('shlomo')).toBeTruthy();
			expect(userNotActive.active).toBeFalsy();

			const departments = await BaseModel.getAllTable(TABLE_NAME.DEPARTMENT);
			const notActiveDepartments = departments.filter(
				(department) => department.active === false
			);
			expect(notActiveDepartments).toHaveLength(1);
			expect(
				notActiveDepartments[0].name.includes('head_archive')
			).toBeTruthy();
		});
	});
});
