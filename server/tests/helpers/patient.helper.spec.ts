import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME, ROLE } from '../../const';

import * as PatientHelper from '../../helpers/patient.helper';
import * as EncryptHelper from '../../services/encrypt.helper';
import { spyConsole } from '../jest-util';

describe('TEST PATIENT HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: createPatient()', () => {
		spyConsole();
		it('check if PATIENT create properly', async () => {
			await MockFunction.testSeedDatabase();
			const patientData = {
				firstName: 'test',
				lastName: 'test',
				email: 'a@a.com',
				departmentsIds: [1],
				isPatientVideo: false,
				disabledSkeleton: false,
			};
			const newPatient = await PatientHelper.createPatient(patientData);

			const getPatientFromDb = await BaseModel.itemsByField(
				TABLE_NAME.PATIENT,
				'id',
				newPatient.id
			);
			const getUserFromDb = await BaseModel.itemsByField(
				TABLE_NAME.USER,
				'id',
				getPatientFromDb[0].user_id
			);
			const getAllGamesForPatient = await BaseModel.itemsByField(
				TABLE_NAME.PATIENT_GAME,
				'patient_id',
				newPatient.id
			);

			expect(EncryptHelper.encryptPersonalData(patientData.firstName)).toEqual(
				getPatientFromDb[0].first_name
			);
			expect(EncryptHelper.encryptPersonalData(patientData.lastName)).toEqual(
				getPatientFromDb[0].last_name
			);
			expect(EncryptHelper.encryptPersonalData(patientData.email)).toEqual(
				getUserFromDb[0].email
			);
			expect(getAllGamesForPatient).toHaveLength(2);
		});

		it('check if email not valid -> not create anything', async () => {
			await MockFunction.testSeedDatabase();
			const patientData = {
				firstName: 'test',
				lastName: 'test',
				email: 'arwegwegwe',
				departmentId: 1,
				isPatientVideo: false,
				disabledSkeleton: false,
			};
			try {
				await PatientHelper.createPatient(patientData);
			} catch (err) {
				expect(err.message).toEqual('email not valid');
			} finally {
				const checkUserEncrypt = await BaseModel.itemsByField(
					TABLE_NAME.PATIENT,
					'first_name',
					EncryptHelper.encryptPersonalData(patientData.firstName)
				);
				const checkUserInTable = await BaseModel.itemsByField(
					TABLE_NAME.PATIENT,
					'first_name',
					patientData.firstName
				);
				expect(checkUserEncrypt).toHaveLength(0);
				expect(checkUserInTable).toHaveLength(0);
			}
		});
	});

	describe('TESTING: editPatient()', () => {
		spyConsole();
		it('check if PATIENT edit properly', async () => {
			await MockFunction.testSeedDatabase();
			const patientData = {
				firstName: 'test',
				lastName: 'test',
				email: 'a@a.com',
				departmentsIds: [1],
				isPatientVideo: false,
				disabledSkeleton: false,
			};
			const editPatientData = {
				firstName: 'test2',
				lastName: 'test2',
				departmentsIds: [2],
				isPatientVideo: true,
				disabledSkeleton: true,
			};
			const editUserData = {
				email: 'a2@a.com',
			};
			const newPatient = await PatientHelper.createPatient(patientData);
			await PatientHelper.editPatient(
				{
					...editPatientData,
					patientId: newPatient.id,
				},
				editUserData
			);

			const getPatientFromDb = await BaseModel.itemsByField(
				TABLE_NAME.PATIENT,
				'id',
				newPatient.id
			);
			const getUserFromDb = await BaseModel.itemsByField(
				TABLE_NAME.USER,
				'id',
				getPatientFromDb[0].user_id
			);

			expect(
				EncryptHelper.encryptPersonalData(editPatientData.firstName)
			).toEqual(getPatientFromDb[0].first_name);
			expect(
				EncryptHelper.encryptPersonalData(editPatientData.lastName)
			).toEqual(getPatientFromDb[0].last_name);
			expect(EncryptHelper.encryptPersonalData(editUserData.email)).toEqual(
				getUserFromDb[0].email
			);
			expect(getPatientFromDb[0].disabled_skeleton).toBeTruthy();
			expect(getUserFromDb[0].role).toEqual(ROLE.VIDEO_PATIENT);
		});
	});

	describe('TESTING: deletePatient()', () => {
		spyConsole();

		it('check if PATIENT delete properly', async () => {
			await MockFunction.testSeedDatabase();
			const patientData = {
				firstName: 'test',
				lastName: 'test',
				email: 'a@a.com',
				departmentsIds: [1],
				isPatientVideo: false,
				disabledSkeleton: false,
			};
			const newPatient = await PatientHelper.createPatient(patientData);
			await PatientHelper.deletePatient(newPatient.id);
			const getPatientFromDb = await BaseModel.itemsByField(
				TABLE_NAME.PATIENT,
				'id',
				newPatient.id
			);
			const getUserFromDb = await BaseModel.itemsByField(
				TABLE_NAME.USER,
				'id',
				getPatientFromDb[0].user_id
			);

			expect(EncryptHelper.encryptPersonalData(patientData.firstName)).toEqual(
				getPatientFromDb[0].first_name
			);
			expect(EncryptHelper.encryptPersonalData(patientData.lastName)).toEqual(
				getPatientFromDb[0].last_name
			);
			expect(EncryptHelper.encryptPersonalData(patientData.email)).toEqual(
				getUserFromDb[0].email
			);
			expect(getPatientFromDb[0].active).toBeFalsy();
			expect(getUserFromDb[0].active).toBeFalsy();
		});
	});

	describe('TESTING: getAllActive()', () => {
		spyConsole();
		it('get all active patient decrypted', async () => {
			await MockFunction.testSeedDatabase();
			const allActive = await PatientHelper.getAllActive();
			expect(allActive).toHaveLength(7);
			const gilUser = allActive.find((x) => x.id === 2);
			expect(gilUser.first_name).toEqual('gil');
			expect(gilUser.last_name).toEqual('bbb');
			expect(gilUser.full_name).toEqual('gil bbb');
			expect(gilUser.email).toEqual('test@spectory.com');
			expect(gilUser.departments_names.includes('head')).toBeTruthy();
		});
	});

	describe('TESTING: getValidGames()', () => {
		spyConsole();
		it('get all valid game for patient', async () => {
			await MockFunction.testSeedDatabase();
			const patientTable = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const benUser = patientTable.find((x) => x.id === 1);
			await BaseModel.updateRowByField(
				TABLE_NAME.PATIENT_GAME,
				{ active: false },
				'game_id',
				1
			);
			const validGames = await PatientHelper.getValidGames(benUser.id);
			expect(validGames).toHaveLength(2);
			const firstGame = validGames.find((x) => x.name === 'squat');
			const secondGame = validGames.find((x) => x.name === 'memory-game');
			expect(firstGame.is_enable).toBeFalsy();
			expect(firstGame.url).toEqual(
				'https://gertner-squats.s3.eu-central-1.amazonaws.com/index.html'
			);
			expect(secondGame.is_enable).toBeTruthy();
			expect(secondGame.url).toEqual(
				'https://gertner-memory-game.s3.eu-central-1.amazonaws.com/index.html'
			);
		});
	});
});
