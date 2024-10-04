import { verifyUserSession } from '../helpers/user-session.helper';
import * as UserHelper from '../helpers/users.helper';
import * as EmailHelper from '../helpers/email.helper';

export const authenticate = async (req, res, next) => {
	try {
		const user = req.user;
		const userDetails = await UserHelper.onLogIn(user);
		res.json(userDetails);
	} catch (err) {
		next(err);
	}
};

export const getAllPatientForTherapist = (req, res, next) => {
	const { therapistId } = req.user;
	UserHelper.getPatientsByTherapist(therapistId)
		.then((users) => res.json(users))
		.catch((err) => next(err));
};

export const updateHeartBeat = (req, res, next) => {
	const { id: userId } = req.user;
	const { onTherapistSession, onGameSession } = req.body || undefined;
	UserHelper.updateHeartBeat(userId, onTherapistSession, onGameSession)
		.then(res.json({}))
		.catch((err) => next(err));
};

export const getPeersStatus = (req, res, next) => {
	const { therapistId } = req.user;
	UserHelper.getOpenPeers(therapistId)
		.then((peersList) => res.json(peersList))
		.catch((err) => next(err));
};

export const sendEmailAfterConnection = (req, res, next) => {
	EmailHelper.sendUserConnectedEmail(req.body.patient, req.body.therapist)
		.then(() => res.json({ message: 'success' }))
		.catch((err) => res.status(400).json({ message: err }));
};

export const checkValidToken = (req, res, next) => {
	const { token } = req.body || undefined;
	UserHelper.checkEmailToken(token)
		.then((user) => res.json({ message: 'valid token', username: user.user_name }))
		.catch((err) => res.status(403).json({ message: err }));
};

export const changePassword = (req, res, next) => {
	const { token, password } = req.body || undefined;
	UserHelper.changePassword(token, password)
		.then(() => res.json({ message: 'password has change' }))
		.catch((err) => res.status(403).json({ message: err }));
};

export const forgotPassword = (req, res, next) => {
	const { username } = req.body || undefined;
	UserHelper.forgotPassword(username)
		.then(() => res.json({ message: 'success' }))
		.catch((err) => res.status(400).json({ message: err }));
};

export const authenticatePeerjsUser = (req, res, next) => {
	const { peer_id, sid } = req.body || undefined;
	verifyUserSession(sid, peer_id)
		.then((isUserAuthenticate) => res.json({ isUserAuthenticate }))
		.catch((err) => next(err));
};

export const createFastLoginToken = (req, res, next) => {
	const { userId, emailOrPhone, dateTime, link_type } = req.body || undefined;
	UserHelper.createFastLoginToken(userId, emailOrPhone, dateTime, link_type)
		.then(() => res.json({ message: 'success' }))
		.catch((err) => res.status(400).json({ message: err }));
};

export const getUserContactData = (req, res, next) => {
	const { userId } = req.body;
	UserHelper.getUserContactData(userId)
		.then((patientData) => res.json(patientData))
		.catch((err) => next(err));
};

export const enable2FA = async (req, res) => {
    const { id } = req.params;
    try {
        const { qrCodeData } = await UserHelper.enable2FAForUser(id);
        res.json({ qrCodeData });
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

export const verify2FA = async (req, res) => {
	const { id } = req.params;
    const {  token } = req.body;
    try {
        const verificationResult = await UserHelper.verify2FAToken(id, token);
        res.json(verificationResult);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const reVerify2FA = async (req, res) => {
	const { id } = req.params;
    try {
        const verificationResult = await UserHelper.reVerify2FAToken(id);
        res.json(verificationResult);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
