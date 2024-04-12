import dotenv from 'dotenv';
dotenv.config();

import * as BaseModel from '../../services/BaseModel.service';
import seedDatabase from '../../seed/seedFunction';
import * as Mock from './mockData';
import { TABLE_NAME, TABLE_SEQUENCE } from '../../const';

export const testSeedDatabase = async () => {
	return seedDatabase(
		Mock.institutes,
		Mock.departments,
		Mock.users,
		Mock.patients,
		Mock.therapists,
		Mock.games,
		Mock.patientGames,
		Mock.patientDepartments,
		Mock.therapistDepartments,
	);
};

export const testSessions = async () => {
	const sessionCreated = await BaseModel.insertBulk(
		TABLE_NAME.GAME_SESSION,
		Mock.sessions
	);
	await BaseModel.setSequence(TABLE_SEQUENCE.SESSION, sessionCreated.length);
};
