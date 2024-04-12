import * as GameSettingHelper from '../helpers/game-settings.helper';
import * as ActivityLogHelper from '../helpers/activity-log.helper';
import * as GameModel from '../models/game.model';
import { LogAction } from '../models/activity-log.model';
import { TABLE_NAME } from '../const';

export const saveNewSettings = (req, res, next) => {
	const { gameId, settings } = req.body;
	const { patientId } = req.user;
	GameSettingHelper.saveNewSettings(patientId, gameId, settings)
		.then(() => res.json({}))
		.catch((err) => next(err));
};

export const saveNewSettingsFromTherapist = (req, res, next) => {
	const { patientId, gameId, settings } = req.body;
	const user = req.user;
	GameSettingHelper.saveNewSettings(patientId, gameId, settings)
		.then(async ([newSettings, oldSettings]) => {
			await ActivityLogHelper.createLog(
				user.id,
				newSettings.patient_id,
				TABLE_NAME.GAME_SESSION,
				LogAction.Update,
				newSettings.id,
				oldSettings.settings,
				settings
			);
			res.json({});
		})
		.catch((err) => next(err));
};

export const getGameSettingsForPatient = (req, res, next) => {
	const { patientId, gameId } = req.body;
	GameSettingHelper.getGameSettings(gameId, patientId)
		.then((name) => res.json(name))
		.catch((err) => next(err));
};

export const addGameToPatient = (req, res, next) => {
	const { patientId, gameId } = req.body;
	GameModel.addGameToPatient(patientId, gameId)
		.then((createdPatientGame) => res.json(createdPatientGame))
		.catch((err) => next(err));
};

export const removeGameFromPatient = (req, res, next) => {
	const { patientId, gameId } = req.body;
	GameModel.removeGameFromPatient(patientId, gameId)
		.then((removedPatientGame) => res.json(removedPatientGame))
		.catch((err) => next(err));
};
