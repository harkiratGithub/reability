import * as UserSession from '../models/user-session.model';
import * as TherapistModel from '../models/therapist.model';
import { ERROR_NAME, DEFAULT_RECAPTCHA_MIN_SCORE } from '../const';
import axios from 'axios';

export const isHerokuDomain = (req, res, next) => {
	if (process.env.NODE_ENV === 'production') {
		const host = req.headers.host;
		if (host.includes('herokuapp')) {
			res.sendStatus(404);
			return;
		}
	}
	next();
};

export const permitAccess = (roles = []) => {
	return (req, res, next) => {
		try {
			if (!req.isAuthenticated() || !req.user || (roles.length && !roles.includes(req.user.role))) {
				return res.status(401).json({ message: ERROR_NAME.PERMISSION });
			}
			next();
		} catch (err) {
			console.log('PERMIT ACCESS ERROR => ', err);
		}
	};
};


export const permitTherapistAccessToPatient = () => {
	return async (req, res, next) => {
		try {
			const { id: userId, isTherapist } = req.user;
			if (isTherapist) {
				const patientId = req.body.patientId;
				const isAuthorize = await TherapistModel.isTherapistUserCanUpdatePatient(userId, patientId);
				if (!isAuthorize) {
					return res.status(401).json({ message: ERROR_NAME.THERAPIST_PERMISSION_NOT_VALID });
				}
			}
			next();
		} catch (err) {
			throw err;
		}
	};
};

export const verifyRecaptcha = () => {
	return async (req, res, next) => {
		return next();
		console.log(process.env.CAPTCHA_SERVER_KEY);

		try {
			const { captchaToken } = req.body;
			const result: any = await axios.post(
				'https://www.google.com/recaptcha/api/siteverify',
				{},
				{
					params: {
						secret: process.env.CAPTCHA_SERVER_KEY,
						response: captchaToken,
					},
				}
			);
			if (result && result.data && result.data.success && result.data.score > getRecaptchaScore()) {
				return next();
			}
			console.log('RECAPTCHA DECLINE => ', result.data);
			return res.status(403).json({ msg: 'Recaptcha error' });
		} catch (err) {
			console.log('RECAPTCHA ERROR => ', err);
			return res.status(403).json({ msg: 'Recaptcha error' });
		}
	};
};

export const removeOldSessionAndPeers = () => {
	return async (req, res, next) => {
		try {
			const user = req.user;
			await UserSession.deleteOtherSessionsForUser(user.id);
			await axios.post(`https://${process.env.SIGNALING_SERVER}/peerjs/disconnectConnectedPeers`, { peerId: user.id });
			next();
		} catch (err) {
			return res.status(401).json({ message: err });
		}
	};
};

const getRecaptchaScore = (): number => {
	const reCaptchaScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE);
	return isNaN(reCaptchaScore) ? DEFAULT_RECAPTCHA_MIN_SCORE : reCaptchaScore;
};
