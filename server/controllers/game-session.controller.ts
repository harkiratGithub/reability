import * as GameSessionHelper from '../helpers/game-session.helper';

export const startGameSession = (req, res, next) => {
	const { gameId } = req.body;
	const userId = req.user.id;
	GameSessionHelper.createGameSession(userId, gameId)
		.then((settings) => res.json(settings))
		.catch((err) => next(err));
};

export const endGameSession = (req, res, next) => {
	const { gameSummary, gameFeedback } = req.body;
	const userId = req.user.id;
	if (gameSummary)
		GameSessionHelper.endGameSession(userId, gameSummary)
			.then(() => res.sendStatus(200))
			.catch((err) => next(err));
	if (gameFeedback)
		GameSessionHelper.feedbackGameSession(userId, gameFeedback)
			.then(() => res.sendStatus(200))
			.catch((err) => next(err));
};
