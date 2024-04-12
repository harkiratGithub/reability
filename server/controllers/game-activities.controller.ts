import * as GameActivitiesHelper from '../helpers/game-activities.helper';

export const addUploadedGameRelatedImage = (req, res, next) => {
	const { file } = req.body;

	GameActivitiesHelper.addUploadedGameRelatedImage(file)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const addAdminRelatedImage = (req, res, next) => {
	const { file, fileName } = req.body;

	GameActivitiesHelper.addAdminRelatedImage(file, fileName)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};
