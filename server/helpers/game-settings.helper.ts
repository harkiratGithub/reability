import * as GameSettingModel from '../models/game-settings.model';

export const saveNewSettings = async (patientId, gameId, settings) => {
	const oldSettings = await GameSettingModel.getLastGameSettings(patientId, gameId);
	const newSettings = await GameSettingModel.createNewSettings(patientId, gameId, JSON.stringify(settings));
	return [newSettings, oldSettings];
};

export const getGameSettings = async (gameId, patientId) => {
	try {
		const { id, settings } = await GameSettingModel.getLastGameSettings(patientId, gameId);
		return settings;
	} catch (err) {
		throw err;
	}
};
