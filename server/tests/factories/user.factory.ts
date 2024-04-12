import faker from 'faker';
import { ROLE, TABLE_NAME } from '../../const';
import * as EncryptHelper from '../../services/encrypt.helper';
import * as BaseModel from '../../services/BaseModel.service';
import { usersValidator } from '../../models/users.model';

export const createUser = async (role) => {
	const userId = faker.datatype.number();
	const userParams = {
		id: userId,
		user_name: faker.internet.userName(),
		password: EncryptHelper.hashPassword('12345'),
		role,
		active: true,
		email: EncryptHelper.encryptPersonalData(faker.internet.email()),
	};
	await BaseModel.createRow(TABLE_NAME.USER, userParams, usersValidator);
	delete userParams['id'];
	return { ...userParams, userId };
};
