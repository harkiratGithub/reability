import { TABLE_NAME, TABLE_SEQUENCE } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';

export default async (users, admins) => {
	const seedFunction = async () => {
		const createdUsers = await BaseModel.insertBulk(TABLE_NAME.USER, users);
		await BaseModel.setSequence(TABLE_SEQUENCE.USERS, createdUsers.length);
		const createdAdmins = await BaseModel.insertBulk(TABLE_NAME.ADMIN, admins);
		await BaseModel.setSequence(TABLE_SEQUENCE.ADMIN, createdAdmins.length);
	};
	return BaseModel.runAsTransaction(seedFunction);
};
