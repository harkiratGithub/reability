import * as AdminHelper from '../helpers/admin.helper';

export const extractBodyParams = (body) => {
	const { first_name: firstName, last_name: lastName, phone, email } = body;
	const adminData = {
		firstName,
		lastName,
		email,
		phone,
	};
	const userData = {
		email,
	};
	return { adminData, userData };
};

export const createAdmin = (req, res, next) => {
	const { adminData } = extractBodyParams(req.body.admin);

	AdminHelper.createAdmin(adminData)
		.then((createdAdmin) => res.json(createdAdmin))
		.catch((err) => next(err));
};

export const editAdmin = (req, res, next) => {
	const { adminData, userData } = extractBodyParams(req.body.admin);
	const { adminId } = req.body;

	AdminHelper.editAdmin({ ...adminData, id: adminId }, userData)
		.then((editedAdmin) => res.json(editedAdmin))
		.catch((err) => next(err));
};

export const deleteAdmin = (req, res, next) => {
	const { id } = req.params;

	AdminHelper.deleteAdmin(id)
		.then(() => res.json({ id }))
		.catch((err) => next(err));
};

export const getAllActive = (req, res, next) => {
	AdminHelper.getAllActive()
		.then((activeAdmins) => res.json(activeAdmins))
		.catch((err) => next(err));
};
