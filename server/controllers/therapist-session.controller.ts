import * as TherapistSessionHelper from '../helpers/therapist-session.helper';

export const createTherapistPatientSession = (req, res, next) => {
	const { userId, type } = req.body;
	const { therapistId } = req.user;
	TherapistSessionHelper.createTherapistSession(Number(userId), therapistId, type)
		.then((settings) => res.json(settings))
		.catch((err) => next(err));
};

export const getLastSessionStatusByPatientId = (req, res, next) => {
	const { patientId } = req.params;
	TherapistSessionHelper.getLastSessionStatusByPatientId(Number(patientId))
		.then((result) => {
			if (!result) {
				return res.status(200).json({ message: 'No session found for the patient' });
			}
			res.json(result);
		})
		.catch((err) => next(err));
};
