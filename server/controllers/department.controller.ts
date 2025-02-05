import * as DepartmentHelper from '../helpers/department.helper';
import * as UserHelper from '../helpers/users.helper';

export const createDepartment = (req, res, next) => {
	const { name, instituteId } = req.body;
	const newDepartment = { name, institute_id: instituteId };
	DepartmentHelper.createDepartment(newDepartment)
		.then((createdDepartment) => res.json(createdDepartment))
		.catch((err) => next(err));
};

export const deleteDepartment = (req, res, next) => {
	const { id } = req.params;
	DepartmentHelper.deleteDepartment(id)
		.then((deletedDepartment) => res.json(deletedDepartment))
		.catch((err) => next(err));
};

export const getAll = (req, res, next) => {
	DepartmentHelper.getAll()
		.then((departments) => res.json(departments))
		.catch((err) => next(err));
};

export const getAllTherapistDepartment = async (req, res, next) => {
	const user = req.user;
	const userDetails = await UserHelper.onLogIn(user);
	DepartmentHelper.getAllTherapistDepartment(userDetails)
		.then((departments) => res.json(departments))
		.catch((err) => next(err));
};
