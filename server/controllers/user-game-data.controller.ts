import * as UserGameDataModel from '../models/user-game-data.model';

export const createUserGameData = (req, res, next) => {
	const { userGameData } = req.body;
	UserGameDataModel.createUserGameData(userGameData)
		.then((createdUserGameData) => res.json(createdUserGameData))
		.catch((err) => next(err));
};
export const editUserGameData = (req, res, next) => {
	const { userGameData } = req.body;
	UserGameDataModel.editUserGameData(userGameData.id, userGameData)
		.then((updatedUserGameData) => res.json(updatedUserGameData))
		.catch((err) => next(err));
};

export const deleteUserGameData = (req, res, next) => {
	const { userGameDataIds } = req.body;
	UserGameDataModel.deleteUserGameData(userGameDataIds)
		.then((deletedUserGameData) => res.json(deletedUserGameData))
		.catch((err) => next(err));
};

export const getUserGameData = (req, res, next) => {
	const { gameId, userId } = req.params;
	UserGameDataModel.getUserGameData(gameId, userId)
		.then((userGamedata) => res.json(userGamedata))
		.catch((err) => next(err));
};

export const updateUserGameDataStatus = (req, res, next) => {
	const { userGameDataIds, active } = req.body;
	UserGameDataModel.updateUserGameDataStatus(userGameDataIds, active)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const changeUserGameDataDrawer = (req, res, next) => {
	const { userGameDataIds, drawer } = req.body;
	UserGameDataModel.changeUserGameDataDrawer(userGameDataIds, drawer)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};
