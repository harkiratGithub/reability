import dotenv from 'dotenv';
import * as EncryptHelper from '../../services/encrypt.helper';
import { ROLE } from '../../const';

dotenv.config();

export const users = [
	{
		id: 1,
		user_name: 'AD2468',
		password: EncryptHelper.hashPassword('AD2468'),
		role: ROLE.ADMIN,
		email: 'test@spectory.com',
	},
];

export const admins = [
	{
		id: 1,
		first_name: 'admin',
		last_name: 'admin',
		phone: '123456789',
		user_id: 1,
	},
];
