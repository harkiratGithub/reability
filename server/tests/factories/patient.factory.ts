import faker from 'faker';
import { TABLE_NAME, ROLE } from '../../const';
import * as EncryptHelper from '../../services/encrypt.helper';
import * as BaseModel from '../../services/BaseModel.service';
import { createUser } from './user.factory';

export const createPatient = async () => {
	const user = await createUser(ROLE.PATIENT);

	const patientId = faker.datatype.number();
	const patientParams = {
		id: patientId,
		user_id: user.userId,
		first_name: EncryptHelper.encryptPersonalData(faker.name.firstName()),
		last_name: EncryptHelper.encryptPersonalData(faker.name.lastName()),
		identity_number: EncryptHelper.encryptPersonalData('111111111'),
		phone: EncryptHelper.encryptPersonalData(faker.phone.phoneNumber()),
		active: true,
	};
	await BaseModel.insertRow(TABLE_NAME.PATIENT, patientParams);
	const returnedPatient = { ...user, ...patientParams };
	delete returnedPatient['id'];
	delete returnedPatient['userId'];
	return { ...returnedPatient, patient_id: patientId };
};
