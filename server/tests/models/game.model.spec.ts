import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { find } from 'lodash';

import * as GameModel from '../../models/game.model';

describe('TEST GAME MODEL', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: getValidGameForPatient()', () => {
		it('check if we get all the valid games', async () => {
			await MockFunction.testSeedDatabase();
			const games = await GameModel.getValidGameForPatient(1);
			expect(games).toHaveLength(2);
			const squatGame = find(games, (game) => game.name === 'squat');
			expect(squatGame.name).toEqual('squat');
			expect(squatGame.url).toEqual(
				'https://gertner-squats.s3.eu-central-1.amazonaws.com/index.html'
			);
		});

		it('check if we get games to patient without games valid', async () => {
			await MockFunction.testSeedDatabase();
			const games = await GameModel.getValidGameForPatient(5);
			expect(games).toHaveLength(0);
		});
	});
});
