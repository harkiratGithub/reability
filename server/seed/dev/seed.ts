import dotenv from 'dotenv';
import seedDatabase from './seedFunction';
import {
	institutes,
	departments,
	users,
	patients,
	therapists,
	games,
	patientGames,
	patientDepartments,
	therapistDepartments,
	admins,
} from './seedData';

dotenv.config();

seedDatabase(
	institutes,
	departments,
	users,
	patients,
	therapists,
	games,
	patientGames,
	patientDepartments,
	therapistDepartments,
	admins
)
	.then(() => console.log('seed success!!'))
	.catch((err) => console.warn('error: ', err));
