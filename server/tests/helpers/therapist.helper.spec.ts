import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME } from '../../const';
import * as EncryptHelper from '../../services/encrypt.helper';

import * as TherapistHelper from '../../helpers/therapist.helper';
import { spyConsole } from '../jest-util';

describe('TEST THERAPIST HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: createTherapist()', () => {
		spyConsole();
		it('check if THERAPIST create properly', async () => {
			await MockFunction.testSeedDatabase();
			const therapistData = {
				firstName: 'test',
				lastName: 'test',
				email: 'a@a.com',
				departmentsIds: [1],
			};
			const newTherapist = await TherapistHelper.createTherapist(therapistData);
			const getTherapistFromDb = await BaseModel.itemsByField(
				TABLE_NAME.THERAPIST,
				'id',
				newTherapist.id
			);
			const getUserFromDb = await BaseModel.itemsByField(
				TABLE_NAME.USER,
				'id',
				getTherapistFromDb[0].user_id
			);

			expect(
				EncryptHelper.encryptPersonalData(therapistData.firstName)
			).toEqual(getTherapistFromDb[0].first_name);
			expect(EncryptHelper.encryptPersonalData(therapistData.lastName)).toEqual(
				getTherapistFromDb[0].last_name
			);
			expect(EncryptHelper.encryptPersonalData(therapistData.email)).toEqual(
				getUserFromDb[0].email
			);
		});

		it('check if email not valid -> not create anything', async () => {
			await MockFunction.testSeedDatabase();
			const therapistData = {
				firstName: 'test',
				lastName: 'test',
				email: 'arwegwegwe',
				departmentsIds: [1],
				isPatientVideo: false,
				disabledSkeleton: false,
			};
			try {
				await TherapistHelper.createTherapist(therapistData);
			} catch (err) {
				expect(err.message).toEqual('email not valid');
			} finally {
				const checkUserEncrypt = await BaseModel.itemsByField(
					TABLE_NAME.THERAPIST,
					'first_name',
					EncryptHelper.encryptPersonalData(therapistData.firstName)
				);
				const checkUserInTable = await BaseModel.itemsByField(
					TABLE_NAME.THERAPIST,
					'first_name',
					therapistData.firstName
				);
				expect(checkUserEncrypt).toHaveLength(0);
				expect(checkUserInTable).toHaveLength(0);
			}
		});
	});

	describe('TESTING: editTherapist()', () => {
		spyConsole();
		it('check if THERAPIST edit properly', async () => {
			await MockFunction.testSeedDatabase();
			const therapistData = {
				firstName: 'test',
				lastName: 'test',
				email: 'a@a.com',
				departmentsIds: [1],
			};
			const editTherapistData = {
				firstName: 'test2',
				lastName: 'test2',
				departmentsIds: [2],
			};
			const editUserData = {
				email: 'a2@a.com',
			};
			const newTherapist = await TherapistHelper.createTherapist(therapistData);
			await TherapistHelper.editTherapist(
				{
					...editTherapistData,
					id: newTherapist.id,
				},
				editUserData
			);

			const getTherapistFromDb = await BaseModel.itemsByField(
				TABLE_NAME.THERAPIST,
				'id',
				newTherapist.id
			);
			const getUserFromDb = await BaseModel.itemsByField(
				TABLE_NAME.USER,
				'id',
				getTherapistFromDb[0].user_id
			);

			expect(
				EncryptHelper.encryptPersonalData(editTherapistData.firstName)
			).toEqual(getTherapistFromDb[0].first_name);
			expect(
				EncryptHelper.encryptPersonalData(editTherapistData.lastName)
			).toEqual(getTherapistFromDb[0].last_name);
			expect(EncryptHelper.encryptPersonalData(editUserData.email)).toEqual(
				getUserFromDb[0].email
			);
		});
	});

	describe('TESTING: deleteTherapist()', () => {
		spyConsole();

		it('check if THERAPIST delete properly', async () => {
			await MockFunction.testSeedDatabase();
			const therapistData = {
				firstName: 'test',
				lastName: 'test',
				email: 'a@a.com',
				departmentsIds: [1],
				isPatientVideo: false,
				disabledSkeleton: false,
			};
			const newTherapist = await TherapistHelper.createTherapist(therapistData);
			await TherapistHelper.deleteTherapist(newTherapist.id);
			const getTherapistFromDb = await BaseModel.itemsByField(
				TABLE_NAME.THERAPIST,
				'id',
				newTherapist.id
			);
			const getUserFromDb = await BaseModel.itemsByField(
				TABLE_NAME.USER,
				'id',
				getTherapistFromDb[0].user_id
			);

			expect(
				EncryptHelper.encryptPersonalData(therapistData.firstName)
			).toEqual(getTherapistFromDb[0].first_name);
			expect(EncryptHelper.encryptPersonalData(therapistData.lastName)).toEqual(
				getTherapistFromDb[0].last_name
			);
			expect(EncryptHelper.encryptPersonalData(therapistData.email)).toEqual(
				getUserFromDb[0].email
			);
			expect(getTherapistFromDb[0].active).toBeFalsy();
			expect(getUserFromDb[0].active).toBeFalsy();
		});
	});

	describe('TESTING: getAllActive()', () => {
		spyConsole();
		it('get all active patient decrypted', async () => {
			await MockFunction.testSeedDatabase();
			const allActive = await TherapistHelper.getAllActive();
			expect(allActive).toHaveLength(4);
			const oriUser = allActive.find((x) => x.id === 1);
			expect(oriUser.first_name).toEqual('ori');
			expect(oriUser.last_name).toEqual('glick');
			expect(oriUser.full_name).toEqual('ori glick');
			expect(oriUser.email).toEqual('test@spectory.com');
			expect(oriUser.departments_names.includes('head')).toBeTruthy();
		});
	});
});
