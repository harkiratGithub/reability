import { TABLE_NAME, TABLE_SEQUENCE } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';

export default async (
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
) => {
	const seedFunction = async () => {
		const institutesCreated = await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, institutes);
		await BaseModel.setSequence(TABLE_SEQUENCE.INSTITUTE, institutesCreated.length);

		const departmentsCreated = await BaseModel.insertBulk(TABLE_NAME.DEPARTMENT, departments);
		await BaseModel.setSequence(TABLE_SEQUENCE.DEPARTMENT, departmentsCreated.length);

		const usersCreated = await BaseModel.insertBulk(TABLE_NAME.USER, users);
		await BaseModel.setSequence(TABLE_SEQUENCE.USERS, usersCreated.length);

		const patientsCreated = await BaseModel.insertBulk(TABLE_NAME.PATIENT, patients);
		await BaseModel.setSequence(TABLE_SEQUENCE.PATIENT, patientsCreated.length);

		const therapistsCreated = await BaseModel.insertBulk(TABLE_NAME.THERAPIST, therapists);
		await BaseModel.setSequence(TABLE_SEQUENCE.THERAPIST, therapistsCreated.length);

		const gamesCreated = await BaseModel.insertBulk(TABLE_NAME.GAME, games);
		await BaseModel.setSequence(TABLE_SEQUENCE.GAME, gamesCreated.length);
		const patientGamesCreated = await BaseModel.insertBulk(TABLE_NAME.PATIENT_GAME, patientGames);
		await BaseModel.setSequence(TABLE_SEQUENCE.PATIENT_GAME, patientGamesCreated.length);

		const patientDepartmentsCreated = await BaseModel.insertBulk(TABLE_NAME.PATIENT_DEPARTMENTS, patientDepartments);
		await BaseModel.setSequence(TABLE_SEQUENCE.PATIENT_DEPARTMENTS, patientDepartmentsCreated.length);

		const therapistDepartmentsCreated = await BaseModel.insertBulk(
			TABLE_NAME.THERAPIST_DEPARTMENTS,
			therapistDepartments
		);
		await BaseModel.setSequence(TABLE_SEQUENCE.THERAPIST_DEPARTMENTS, therapistDepartmentsCreated.length);

		const adminsCreated = await BaseModel.insertBulk(TABLE_NAME.ADMIN, admins);
		await BaseModel.setSequence(TABLE_SEQUENCE.ADMIN, adminsCreated.length);
	};
	return BaseModel.runAsTransaction(seedFunction);
};
