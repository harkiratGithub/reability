import faker from 'faker';
import { TABLE_NAME, ROLE } from '../../const';
import * as EncryptHelper from '../../services/encrypt.helper';
import * as BaseModel from '../../services/BaseModel.service';
import { createUser } from './user.factory';

export const createTherapist = async () => {
	const user = await createUser(ROLE.THERAPIST);
	const therapistId = faker.datatype.number();
	const therapistParams = {
		id: therapistId,
		user_id: user.userId,
		first_name: EncryptHelper.encryptPersonalData(faker.name.firstName()),
		last_name: EncryptHelper.encryptPersonalData(faker.name.lastName()),
		identity_number: EncryptHelper.encryptPersonalData('111111111'),
		phone: EncryptHelper.encryptPersonalData(faker.phone.phoneNumber()),
		active: true,
	};
	await BaseModel.insertRow(TABLE_NAME.THERAPIST, therapistParams);
	const returnedTherapist = { ...user, ...therapistParams };
	delete returnedTherapist['id'];
	delete returnedTherapist['userId'];
	return { ...returnedTherapist, therapist_id: therapistId };
};
