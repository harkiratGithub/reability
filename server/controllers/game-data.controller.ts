import * as GameDataModel from '../models/game-data.model';

export const createGameData = (req, res, next) => {
	let { gameData } = req.body;
	GameDataModel.createGameData(gameData)
		.then((createdGameData) => res.json(createdGameData))
		.catch((err) => next(err));
};

export const getAllGames = (req, res, next) => {
	GameDataModel.getAllGames()
		.then((allGames) => res.json(allGames))
		.catch((err) => next(err));
};

export const getAllEndGames = (req, res, next) => {
	GameDataModel.getAllEndGames()
		.then((allGames) => res.json(allGames))
		.catch((err) => next(err));
};

export const editGameData = (req, res, next) => {
	const { gameData } = req.body;
	GameDataModel.editGameData(gameData.id, gameData)
		.then((updatedGameData) => res.json(updatedGameData))
		.catch((err) => next(err));
};

export const deleteGameData = (req, res, next) => {
	const { gameDataIds } = req.body;
	GameDataModel.deleteGameData(gameDataIds)
		.then((deletedGameData) => res.json(deletedGameData))
		.catch((err) => next(err));
};

export const getGameDataByIds = (req, res, next) => {
	const { gameDataIds } = req.body;
	GameDataModel.getGameDataByIds(gameDataIds)
		.then((gameData) => res.json(gameData))
		.catch((err) => next(err));
};

export const getShortGameData = (req, res, next) => {
	const { gameId } = req.params;
	GameDataModel.getShortGameData(gameId)
		.then((gameData) => res.json(gameData))
		.catch((err) => next(err));
};

export const updateGameDataStatus = (req, res, next) => {
	const { gameDataIds, active } = req.body;
	GameDataModel.updateGameDataStatus(gameDataIds, active)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const clearGameData = (req, res, next) => {
	GameDataModel.clearGameData()
		.then((deletedData) => res.json(deletedData))
		.catch((err) => next(err));
};

export const checkPassword = (req, res, next) => {
	const { password } = req.body;
	res.status(200).send({ passwordCorrect: password === process.env.WB_CLEAR_GAMEDATA_PASSWORD });
};
