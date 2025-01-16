import * as InstituteHelper from '../helpers/institute.helper';

export const createInstitute = (req, res, next) => {
	const { name, departments } = req.body;
	const { file } = req;

	const newInstitute = { name };
	InstituteHelper.createInstitute(newInstitute, JSON.parse(departments), file)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const editInstitute = (req, res, next) => {
	const { name, departments, instituteId, imageId } = req.body;
	const { file } = req;

	const instituteDataToUpdate = {
		id: instituteId,
		name,
	};
	InstituteHelper.editInstitute(
		instituteDataToUpdate,
		file,
		imageId,
		JSON.parse(departments)
	)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const deleteInstitute = (req, res, next) => {
	const { id } = req.params;

	InstituteHelper.deleteInstitute(id)
		.then((deletedInstitute) => res.json(deletedInstitute))
		.catch((err) => next(err));
};

export const getAll = (req, res, next) => {
	InstituteHelper.getAll()
		.then((institutes) => res.json(institutes))
		.catch((err) => next(err));
};

export const getAllInstitutes = (req, res, next) => {
	InstituteHelper.getAllInstitutes()
		.then((institutes) => res.json(institutes))
		.catch((err) => next(err));
};
