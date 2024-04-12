import * as GameSessionHelper from '../models/game-session.model';
import * as GameSettingsModel from '../models/game-settings.model';
import * as Patient from '../models/patient.model';
import * as Helper from '../services/util.helper';
import logger from '../services/logger.service';
import { delayedHeartbeat } from '../../constants/heartbeat';
import { isEmpty } from 'lodash';

export const updateGameSession = async (
	userId,
	therapistSessionId = undefined
) => {
	try {
		const lastGameSession = await GameSessionHelper.getLastGameSession(userId);
		if (!lastGameSession) {
			logger.error('no session to update!!!');
			return;
		}
		if (
			Helper.checkIfPassedAmountOfMs(lastGameSession.end_time, delayedHeartbeat)
		) {
			logger.error('last session is too far. no session to update!!!');
			return;
		}
		if (isEmpty(lastGameSession.game_summary)) {
			const gameSessionObject = {
				end_time: Helper.createTimeForDb(),
			};
			if (therapistSessionId) {
				gameSessionObject['therapist_session_id'] = therapistSessionId;
			}
			await GameSessionHelper.updateSessionGame(
				lastGameSession.id,
				gameSessionObject
			);
		} else {
			await createGameSession(userId, lastGameSession.game_id);
		}
	} catch (err) {
		throw err;
	}
};

export const createGameSession = async (userId, gameId) => {
	try {
		const patient = await Patient.findPatientByUserId(userId);
		const { id, settings } = await GameSettingsModel.getLastGameSettings(
			patient.id,
			gameId
		);
		await GameSessionHelper.createGameSession({
			patient_id: patient.id,
			game_id: gameId,
			game_settings_id: id,
			start_time: Helper.createTimeForDb(),
			end_time: Helper.createTimeForDb(),
		});
		return settings;
	} catch (err) {
		throw err;
	}
};

export const endGameSession = async (userId, gameSummary) => {
	try {
		const patient = await Patient.findPatientByUserId(userId);
		const lastGameSession = await GameSessionHelper.getLastGameSession(userId);
		const lastGameSettings = await GameSettingsModel.getLastGameSettings(
			patient.id,
			lastGameSession.game_id
		);
		const score = gameSummary && gameSummary.score ? gameSummary.score : null;
		const gameSummaryJsonString = JSON.stringify(gameSummary);
		await GameSessionHelper.updateSessionGame(lastGameSession.id, {
			game_id: lastGameSession.game_id,
			game_settings_id: lastGameSettings.id,
			game_summary: gameSummaryJsonString,
			game_score: score,
			end_time: Helper.createTimeForDb(),
		});
	} catch (err) {
		throw err;
	}
};
