import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import * as GameSettingsHelper from '../../helpers/game-settings.helper';
import { TABLE_NAME } from '../../const';

describe('TEST GAME SETTINGS HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: saveNewSettings()', () => {
		it('should update settings from patient', async () => {
			await MockFunction.testSeedDatabase();
			const newSetting = await GameSettingsHelper.saveNewSettings(5, 1, {
				check: 'check',
			});
			const allSettingsTable = await BaseModel.getAllTable(
				TABLE_NAME.GAME_SETTINGS
			);
			expect(newSetting).toBeTruthy();
			expect(allSettingsTable).toHaveLength(1);
			expect(allSettingsTable[0].settings).toEqual({ check: 'check' });
			expect(allSettingsTable[0].patient_id).toEqual(5);
		});
	});
});
