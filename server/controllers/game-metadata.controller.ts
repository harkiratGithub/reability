import * as GameMetaDataModel from '../models/game-metadata.model';

export const createGameMetaData = (req, res, next) => {
	let { gameData } = req.body;
	GameMetaDataModel.createGameMetaData(req.body)
		.then((createdGameMetaData) => res.json(createdGameMetaData))
		.catch((err) => next(err));
};

export const editGameMetaData = (req, res, next) => {
	const { gameData } = req.body;
	GameMetaDataModel.editGameMetaData(gameData.id, gameData)
		.then((updatedGameMetaData) => res.json(updatedGameMetaData))
		.catch((err) => next(err));
};

export const deleteGameMetaData = (req, res, next) => {
	const { gameDataIds } = req.body;
	GameMetaDataModel.deleteGameMetaData(gameDataIds)
		.then((deletedGameMetaData) => res.json(deletedGameMetaData))
		.catch((err) => next(err));
};

export const getGameMetaDataByIds = (req, res, next) => {
	const { gameDataIds } = req.body;
	GameMetaDataModel.getGameMetaDataByIds(gameDataIds)
		.then((gameData) => res.json(gameData))
		.catch((err) => next(err));
};

export const getShortGameMetaData = (req, res, next) => {
	const { videoName } = req.params;
	GameMetaDataModel.getShortGameMetaData(videoName)
		.then((gameData) => res.json(gameData))
		.catch((err) => next(err));
};

export const clearGameMetaData = (req, res, next) => {
	GameMetaDataModel.clearGameMetaData()
		.then((deletedData) => res.json(deletedData))
		.catch((err) => next(err));
};

export const checkPassword = (req, res, next) => {
	const { password } = req.body;
	res.status(200).send({ passwordCorrect: password === process.env.WB_CLEAR_GAMEDATA_PASSWORD });
};
