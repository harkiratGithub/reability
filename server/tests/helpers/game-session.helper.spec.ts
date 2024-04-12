import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME } from '../../const';

import * as GameSessionHelper from '../../helpers/game-session.helper';
import * as GameSettingsModel from '../../models/game-settings.model';
import moment from 'moment';

import { sleep } from '../jest-util';
import { sortBy } from 'lodash';

describe('TEST GAME SESSION HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: createGameSession()', () => {
		it('check if we create session as requested', async () => {
			await MockFunction.testSeedDatabase();
			const patientsTable = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const patient = patientsTable.find((p) => p.id === 1);
			await GameSettingsModel.createNewSettings(patient.id, 1, JSON.stringify({
				difficult: 0,
			}));
			await GameSessionHelper.createGameSession(patient.user_id, 1);
			await GameSessionHelper.createGameSession(patient.user_id, 2);
			await GameSettingsModel.createNewSettings(patient.id, 2, JSON.stringify({
				difficult: 1,
			}));
			await GameSessionHelper.createGameSession(patient.user_id, 2);

			const gameSessionTable = await BaseModel.getAllTable(
				TABLE_NAME.GAME_SESSION
			);
			const gameSettingsTable = await BaseModel.getAllTable(
				TABLE_NAME.GAME_SETTINGS
			);
			expect(gameSessionTable).toHaveLength(3);
			expect(gameSettingsTable).toHaveLength(2);

			const firstGameSession = gameSessionTable[0];
			const secondGameSession = gameSessionTable[1];
			const thirdGameSession = gameSessionTable[2];

			const firstGameSettings = gameSettingsTable[0];
			const secondGameSettings = gameSettingsTable[1];

			expect(firstGameSession.patient_id).toEqual(patient.id);
			expect(firstGameSession.game_id).toEqual(1);
			expect(firstGameSession.game_settings_id).toEqual(firstGameSettings.id);
			expect(firstGameSession.game_score).toEqual(null);

			expect(secondGameSession.patient_id).toEqual(patient.id);
			expect(secondGameSession.game_id).toEqual(2);
			expect(secondGameSession.game_settings_id).toEqual(null);
			expect(secondGameSession.game_score).toEqual(null);

			expect(thirdGameSession.patient_id).toEqual(patient.id);
			expect(thirdGameSession.game_id).toEqual(2);
			expect(thirdGameSession.game_settings_id).toEqual(secondGameSettings.id);
			expect(thirdGameSession.game_score).toEqual(null);
		});
	});

	describe('TESTING: endGameSession()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());

		it('check if we create session as requested', async () => {
			await MockFunction.testSeedDatabase();
			const patientsTable = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const firstPatient = patientsTable.find((p) => p.id === 1);
			const secondPatient = patientsTable.find((p) => p.id === 2);

			await GameSettingsModel.createNewSettings(secondPatient.id, 1, JSON.stringify({
				difficult: 1,
			}));

			await GameSessionHelper.createGameSession(firstPatient.user_id, 1);
			await GameSessionHelper.createGameSession(secondPatient.user_id, 1);
			await GameSessionHelper.createGameSession(firstPatient.user_id, 2);
			await GameSessionHelper.createGameSession(firstPatient.user_id, 2);

			await GameSettingsModel.createNewSettings(firstPatient.id, 2, JSON.stringify({
				difficult: 1,
			}));

			await GameSessionHelper.endGameSession(firstPatient.user_id, {
				score: 100,
			});
			await GameSessionHelper.endGameSession(secondPatient.user_id, {
				score: 90,
			});

			let gameSessionTable = await BaseModel.getAllTable(
				TABLE_NAME.GAME_SESSION
			);
			let gameSettingsTable = await BaseModel.getAllTable(
				TABLE_NAME.GAME_SETTINGS
			);
			gameSessionTable = sortBy(gameSessionTable, 'id');
			gameSettingsTable = sortBy(gameSettingsTable, 'id');

			expect(gameSessionTable).toHaveLength(4);
			expect(gameSettingsTable).toHaveLength(2);

			const firstGameSession = gameSessionTable[0];
			const secondGameSession = gameSessionTable[1];
			const thirdGameSession = gameSessionTable[2];
			const forthGameSession = gameSessionTable[3];

			const firstGameSettings = gameSettingsTable[0];
			const secondGameSettings = gameSettingsTable[1];

			expect(firstGameSession.patient_id).toEqual(firstPatient.id);
			expect(firstGameSession.game_id).toEqual(1);
			expect(firstGameSession.game_settings_id).toEqual(null);
			expect(firstGameSession.game_score).toEqual(null);

			expect(secondGameSession.patient_id).toEqual(secondPatient.id);
			expect(secondGameSession.game_id).toEqual(1);
			expect(secondGameSession.game_settings_id).toEqual(firstGameSettings.id);
			expect(secondGameSession.game_score).toEqual(90);

			expect(thirdGameSession.patient_id).toEqual(firstPatient.id);
			expect(thirdGameSession.game_id).toEqual(2);
			expect(thirdGameSession.game_settings_id).toEqual(null);
			expect(thirdGameSession.game_score).toEqual(null);

			expect(forthGameSession.patient_id).toEqual(firstPatient.id);
			expect(forthGameSession.game_id).toEqual(2);
			expect(forthGameSession.game_settings_id).toEqual(secondGameSettings.id);
			expect(forthGameSession.game_score).toEqual(100);
		});
	});

	describe('TESTING: updateGameSession()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());

		it('check if we update session as requested', async () => {
			await MockFunction.testSeedDatabase();
			const patientsTable = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
			const firstPatient = patientsTable.find((p) => p.id === 1);
			const secondPatient = patientsTable.find((p) => p.id === 2);

			await GameSessionHelper.createGameSession(firstPatient.user_id, 1);
			await sleep(1000);
			await GameSessionHelper.createGameSession(secondPatient.user_id, 1);
			await sleep(1000);
			await GameSessionHelper.endGameSession(firstPatient.user_id, {
				score: 100,
			});
			await GameSessionHelper.updateGameSession(secondPatient.user_id);
			await sleep(1000);
			await GameSessionHelper.updateGameSession(firstPatient.user_id);

			let gameSessionTable = await BaseModel.getAllTable(
				TABLE_NAME.GAME_SESSION
			);
			gameSessionTable = sortBy(gameSessionTable, 'id');

			expect(gameSessionTable).toHaveLength(3);

			const firstGameSession = gameSessionTable[0];
			const secondGameSession = gameSessionTable[1];
			const thirdGameSession = gameSessionTable[2];

			expect(firstGameSession.patient_id).toEqual(firstPatient.id);
			expect(firstGameSession.game_score).toEqual(100);
			expect(secondGameSession.patient_id).toEqual(secondPatient.id);
			expect(thirdGameSession.patient_id).toEqual(firstPatient.id);
			expect(thirdGameSession.game_id).toEqual(1);
			expect(thirdGameSession.game_score).toEqual(null);

			expect(
				moment(secondGameSession.end_time).isBefore(
					moment(thirdGameSession.end_time)
				)
			).toBeTruthy();
		});
	});
});
