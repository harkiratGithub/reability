import * as AdminModel from '../models/admin.model';
import * as UserModel from '../models/users.model';
import * as UserHelper from './users.helper';
import * as Encrypt from '../services/encrypt.helper';
import * as BaseModel from '../services/BaseModel.service';
import { ROLE } from '../const';
import { reduce } from 'lodash';

export const createAdmin = (adminData) => {
	const adminCreationFunc = async (client = null) => {
		const userToSave = {
			email: adminData.email,
			role: ROLE.ADMIN,
		};
		const createdUser = await UserHelper.create(userToSave, client);
		const adminToSave = getCommonData(adminData, createdUser.id);
		const createdAdmin = await AdminModel.create(adminToSave, client);
		return Encrypt.decryptJson(createdAdmin);
	};
	return BaseModel.runAsTransaction(adminCreationFunc);
};

export const editAdmin = (adminDataToUpdate, userDataToUpdate) => {
	const adminEditFunc = async (client = null) => {
		const { id: adminId, ...adminData } = adminDataToUpdate;
		const parsedDataToSave = getCommonData(adminData);
		const editedAdmin = await AdminModel.edit(adminId, parsedDataToSave, client);
		const { user_id: userId } = editedAdmin;
		await UserModel.updateById(userId, userDataToUpdate, client);
		return Encrypt.decryptJson(editedAdmin);
	};
	return BaseModel.runAsTransaction(adminEditFunc);
};

export const deleteAdmin = (id) => {
	const adminDeleteFunc = async (client = null) => {
		const admin = await AdminModel.remove(id, client);
		await UserModel.remove([admin.user_id], client);
		return admin;
	};
	return BaseModel.runAsTransaction(adminDeleteFunc);
};

export const getAllActive = async () => {
	try {
		const allAdmins = await AdminModel.getAllActive();

		return reduce(
			allAdmins,
			(result, value) => {
				const admin = Encrypt.decryptJson(value);
				result.push({
					...admin,
					full_name: `${admin.first_name} ${admin.last_name}`,
				});
				return result;
			},
			[]
		);
	} catch (err) {
		throw err;
	}
};
const getCommonData = (admin, userId?) => {
	return {
		first_name: admin.firstName,
		last_name: admin.lastName,
		phone: admin.phone || '',
		...(userId && { user_id: userId }),
	};
};
