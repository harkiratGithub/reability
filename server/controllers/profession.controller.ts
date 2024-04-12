import { map } from 'lodash';

import * as ProfessionHelper from '../helpers/profession.helper';
import * as ExpertiseHelper from '../helpers/expertise.helper';

export const createProfession = (req, res, next) => {
	const { name, expertises } = req.body;
	const { file } = req;

	const newProfession = { name };
	ProfessionHelper.createProfession(newProfession, JSON.parse(expertises), file)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const editProfession = (req, res, next) => {
	const { name, expertises, professionId, imageId } = req.body;
	const { file } = req;

	const professionDataToUpdate = {
		id: professionId,
		name,
	};
	ProfessionHelper.editProfession(professionDataToUpdate, file, imageId, JSON.parse(expertises))
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const getAll = (req, res, next) => {
	ProfessionHelper.getAll()
		.then((professions) => res.json(professions))
		.catch((err) => next(err));
};

export const getProfessionSlots = async (req, res, next) => {
	const { professionId, week, year } = req.body;
	if (!professionId || !week || !year) {
		return next(`getAllProfessionSlots: not valid`);
	}

	const professionExpertise = await ProfessionHelper.getExpertiseByProfession(professionId);
	const expertiseIds = map(professionExpertise, (expertise) => expertise.id);

	ExpertiseHelper.getAllExpertiseSlots(expertiseIds, week, year)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};
