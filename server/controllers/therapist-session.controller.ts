import * as TherapistSessionHelper from '../helpers/therapist-session.helper';

export const createTherapistPatientSession = (req, res, next) => {
	const { userId, type } = req.body;
	const { therapistId } = req.user;
	TherapistSessionHelper.createTherapistSession(Number(userId), therapistId, type)
		.then((settings) => res.json(settings))
		.catch((err) => next(err));
};
