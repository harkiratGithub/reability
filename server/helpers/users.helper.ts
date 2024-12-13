import { map, findLast } from 'lodash';

import * as UserModel from '../models/users.model';
import * as PatientModel from '../models/patient.model';
import * as GameModel from '../models/game.model';
import * as TherapistSessionModel from '../models/therapist-session.model';

import * as GameSessionHelper from '../helpers/game-session.helper';
import * as TherapistSessionHelper from '../helpers/therapist-session.helper';

import * as EmailHelper from '../helpers/email.helper';
import * as SMSHelper from '../helpers/sms.helper';

import * as EncryptHelper from '../services/encrypt.helper';
import * as Helper from '../services/util.helper';
import * as Scheduler from '../services/scheduler.service';

import { PEERS_STATUS, ROLE, PATIENT_AUTO_PASSWORD_LENGTH } from '../const';
import { delayedHeartbeat } from '../../constants/heartbeat';
import moment from 'moment';

import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export const onLogIn = async (user: {
	id: number;
	role: string;
	username: string;
	isTherapist: boolean;
	peerId: string;
	is_two_factor_enabled: boolean;
}): Promise<any> => {
	try {
		await UserModel.updateById(user.id, {
			logged_in_at: Helper.createTimeForDb(),
			logged_out_at: Helper.createTimeForDb(),
		});
		switch (user.role) {
			case ROLE.ADMIN:
				return user;
			case ROLE.THERAPIST:
			case ROLE.VIDEO_PATIENT:
				const userDetails = await UserModel.getUserDetails(user.id);
				const {
					id,
					first_name: firstName,
					last_name: lastName,
					is_two_factor_enabled: is_two_factor_enabled,
				} = EncryptHelper.decryptJson(userDetails[0]);
				return { ...user, id, firstName, lastName, is_two_factor_enabled };
			case ROLE.PATIENT:
				const details = await UserModel.getUserDetails(user.id);
				const {
					id: patientId,
					first_name: firstNameDetails,
					last_name: lastNameDetails,
					fast_login_link: fast_login_link,
					pain_level: pain_level,
					date_agreed_terms: date_agreed_terms,
				} = EncryptHelper.decryptJson(details[0]);
				const RTM = details?.some((ele: { department_name: string }) => ele.department_name.toLowerCase() === 'rtm');
				const todayEntry = await UserModel.isPatientEntryForToday(patientId);
				const isPainModelOpen = RTM && typeof todayEntry.painLevel === 'undefined' && !todayEntry.hasEntries;
				const validGames = await GameModel.getValidGameForPatient(patientId);
				const patient = await PatientModel.findPatientByUserId(user.id);
				const disabledSkeleton = patient.disabled_skeleton;
				const requiresTermsAgreement = date_agreed_terms === null;

				return {
					...user,
					id: patientId,
					firstName: firstNameDetails,
					lastName: lastNameDetails,
					validGames,
					disabledSkeleton,
					fast_login_link,
					isPainModelOpen,
					date_agreed_terms: requiresTermsAgreement,
				};
		}
	} catch (error) {
		throw error;
	}
};

export const getPatientsByTherapist = async (therapistId: any) => {
	const patients = await UserModel.getPatientsByTherapistId(therapistId);
	return map(patients, (patient) => {
		const decryptPatient = EncryptHelper.decryptJson(patient);
		return {
			patientId: decryptPatient.patient_id,
			firstName: decryptPatient.first_name,
			lastName: decryptPatient.last_name,
			peerId: decryptPatient.peer_id.toString(),
			isTherapist: decryptPatient.role === ROLE.THERAPIST,
			role: decryptPatient.role,
			username: decryptPatient.user_name,
			notification_email: decryptPatient.notification_email,
			disabledSkeleton: decryptPatient.disabled_skeleton,
			hasCamera: decryptPatient.has_camera,
			phone: decryptPatient.phone,
		};
	});
};

export const updateUserUsage = async (userId: number) => {
	return UserModel.updateUserUsage(userId);
};

export const updateHeartBeat = async (userId: any, onTherapistSession = undefined, onGameSession = undefined) => {
	try {
		const promiseArray = [];
		promiseArray.push(updateUserUsage(Number(userId)));
		if (onTherapistSession) {
			promiseArray.push(TherapistSessionHelper.updateTherapistSession(Number(userId)));
		}
		const promiseRes = await Promise.all(promiseArray);
		if (onGameSession) {
			const therapistSessionId = promiseRes[1] && promiseRes[1].id;
			await GameSessionHelper.updateGameSession(userId, therapistSessionId);
		}
	} catch (err) {
		throw err;
	}
};

export const updateUserTermsConditions = async (userId, dateAgreedTerms) => {
	return UserModel.updateUserTermsConditions(userId, dateAgreedTerms?.date_agreed_terms);
};

export const getOpenPeers = async (therapistId: any) => {
	try {
		const openPeers = await UserModel.getPeersByTherapistId(therapistId);
		const busyPeers = await TherapistSessionModel.getBusyPeers();
		const peersStatus = openPeers.map(
			(peer: { [x: string]: any; active: any; logged_out_at: any; patient_id: any }) => {
				let userStatus: string;
				userStatus = peer.active ? PEERS_STATUS.LOGGED_OUT : PEERS_STATUS.DISABLED;
				const openPeer = peer.logged_out_at
					? !Helper.checkIfPassedAmountOfMs(peer.logged_out_at, delayedHeartbeat)
					: false;
				userStatus = openPeer ? PEERS_STATUS.AVAILABLE : PEERS_STATUS.LOGGED_OUT;
				const therapistLastSession = findLast(busyPeers, (b) => b.patient_id === peer.patient_id);
				if (userStatus === PEERS_STATUS.AVAILABLE && therapistLastSession) {
					userStatus = therapistLastSession.therapist_id === therapistId ? PEERS_STATUS.CONNECTED : PEERS_STATUS.BUSY;
				}
				delete peer['patient_id'];
				delete peer['active'];
				return {
					...peer,
					peerStatus: userStatus,
				};
			}
		);
		return peersStatus;
	} catch (err) {
		throw err;
	}
};

export const create = async (user: { email: any; role: any }, client = null) => {
	const defaultPassword = 'Aa123456';
	try {
		const user_name = await generateUniqUsername();

		let plainTextPassword = Helper.generateRandomString();
		if (user.role === ROLE.THERAPIST) {
			plainTextPassword = plainTextPassword.substring(0, PATIENT_AUTO_PASSWORD_LENGTH);
		} else if (user.role === ROLE.PATIENT || user.role === ROLE.VIDEO_PATIENT) {
			// plainTextPassword = Helper.generateUserPassword();
			plainTextPassword = defaultPassword;
		}

		const password = EncryptHelper.hashPassword(plainTextPassword);
		const token = Helper.generateSecureRandomString();
		const token_timestamp = Helper.createTimeForDb();
		const userCreated = await UserModel.create(
			{
				user_name,
				email: user.email,
				role: user.role,
				password,
				token,
				token_timestamp,
			},
			client
		);
		if (user.role === ROLE.PATIENT || user.role === ROLE.THERAPIST || user.role === ROLE.VIDEO_PATIENT) {
			await EmailHelper.sendPatientCredentialsEmail(user.email, user_name, plainTextPassword);
		} else {
			await EmailHelper.sendNewUserEmail(user.email, token);
		}
		return userCreated;
	} catch (err) {
		throw err;
	}
};

export const checkEmailToken = async (token: any) => {
	try {
		const users = await UserModel.findByToken(token);
		if (users.length !== 1) {
			throw new Error('token not valid');
		}
		const [user] = users;
		if (Helper.checkIfPassedAmountOfMs(user.token_timestamp, 60 * 60 * 1000)) {
			throw new Error('token expired');
		}
		return user;
	} catch (err) {
		throw new Error(err);
	}
};

export const changePassword = async (token: any, password: any) => {
	try {
		if (Helper.checkPasswordStrength(password)) {
			throw new Error('password not strength');
		}
		const user = await checkEmailToken(token);
		await UserModel.updateById(user.id, {
			password: EncryptHelper.hashPassword(password),
			token: null,
			token_timestamp: null,
		});
		await EmailHelper.sendUpdatedUserEmail(EncryptHelper.decryptPersonalData(user.email), user.user_name, password);
	} catch (err) {
		throw new Error(err);
	}
};

export const forgotPassword = async (username: any) => {
	const defaultPassword = 'Aa123456';
	try {
		const users = await UserModel.findByUsername(username);
		if (users.length !== 1) {
			throw new Error('username not valid');
		}
		const [user] = users;
		// block old password
		const randomPassword = Helper.generateRandomShortString();
		const password =
			user.role == ROLE.PATIENT || user.role == ROLE.VIDEO_PATIENT
				? EncryptHelper.hashPassword(defaultPassword)
				: EncryptHelper.hashPassword(randomPassword);
		const token = Helper.generateSecureRandomString();
		const token_timestamp = Helper.createTimeForDb();
		await UserModel.updateById(user.id, { password, token, token_timestamp });
		const passwordToSend =
			user.role == ROLE.PATIENT || user.role == ROLE.VIDEO_PATIENT ? defaultPassword : randomPassword;
		await EmailHelper.sendNewPasswordEmail(EncryptHelper.decryptPersonalData(user.email), username, passwordToSend);
	} catch (err) {
		throw new Error(err);
	}
};

// PRIVATE
export const generateUniqUsername = async () => {
	const numberOfTries = 3;
	for (let i = 0; i < numberOfTries; i++) {
		const newUsername = Helper.generateUsername();
		const user = await UserModel.findByUsername(newUsername);
		if (user.length === 0) {
			return newUsername;
		}
	}
	throw new Error("can't create unique username, please change algorithm");
};

export const createFastLoginToken = async (
	userId: number,
	emailOrPhone: string,
	dateTime: string,
	link_type: string
) => {
	try {
		const users = await UserModel.findById(userId);
		if (users.length !== 1) {
			throw new Error('user id not valid');
		}
		const [user] = users;
		if (!user) {
			throw new Error('user id not valid');
		}
		if (dateTime && moment.unix(Number.parseInt(dateTime)).isValid()) {
			const dateForScheduler = moment.unix(Number.parseInt(dateTime)); //Helper.getUTCMomentDateFromString(dateTime);
			Scheduler.setSchedulerByMoment(dateForScheduler, () => {
				sendSMSOrEmail(user, emailOrPhone, link_type);
			});
		} else {
			sendSMSOrEmail(user, emailOrPhone, link_type);
		}
	} catch (err) {
		throw new Error(err);
	}
};

export const sendSMSOrEmail = async (user: { id: any }, emailOrPhone: string | string[], link_type: string) => {
	const fast_login_token = Helper.generateSecureRandomString();
	const fast_login_token_timestamp = Helper.createTimeForDb();
	const fast_login_link = link_type;
	await UserModel.updateById(user.id, { fast_login_token, fast_login_token_timestamp, fast_login_link });
	if (emailOrPhone.includes('@')) {
		await EmailHelper.sendFastLoginEmail(
			emailOrPhone, //user.email
			fast_login_token
		);
	} else {
		await SMSHelper.sendFastLoginSMS(emailOrPhone, fast_login_token);
	}
};

export const checkFastLoginToken = async (token: any) => {
	try {
		const users = await UserModel.findByFastLoginToken(token);
		if (users.length !== 1) {
			throw new Error('token not valid');
		}
		const [user] = users;
		if (Helper.checkIfPassedAmountOfMs(user.fast_login_token_timestamp, 60 * 60 * 1000)) {
			throw new Error('token expired');
		}
		return user;
	} catch (err) {
		throw new Error(err);
	}
};

export const getUserContactData = async (patientId: any) => {
	try {
		const userDetails = await UserModel.getUserDetails(patientId);
		const { id, phone, email } = EncryptHelper.decryptJson(userDetails[0]);
		return {
			id,
			phone,
			email,
		};
	} catch (err) {
		throw new Error(err);
	}
};

export const resetPassword = async (
	user: { id: any; user_name: any; email: any; role: any },
	setDefaultPassword: any
) => {
	const defaultPassword = 'Aa123456';
	const { id: userId, user_name: username, email, role } = user;
	try {
		let plainTextPassword = setDefaultPassword ? defaultPassword : Helper.generateRandomString();
		if (role === ROLE.PATIENT || role === ROLE.VIDEO_PATIENT) {
			plainTextPassword = setDefaultPassword ? defaultPassword : Helper.generateUserPassword();
		}
		const password = EncryptHelper.hashPassword(plainTextPassword);

		await UserModel.updateById(userId, {
			password,
			token: null,
			token_timestamp: null,
		});
		await EmailHelper.sendPatientCredentialsEmail(
			EncryptHelper.decryptPersonalData(email),
			username,
			plainTextPassword
		);
	} catch (err) {
		throw new Error(err);
	}
};

export const getUserById = async (userId: any) => {
	const results = await UserModel.findById(userId);
	return results[0];
};

export const enable2FAForUser = async (userId: any) => {
	let user = await UserModel.findById(userId);
	user = EncryptHelper.decryptJson(user[0]);
	if (user.role !== ROLE.ADMIN) {
		throw new Error('2FA can only be enabled for Admin roles.');
	}
	const secret = speakeasy.generateSecret({ name: 'ReAbility Online Auth' });
	user.two_factor_secret = secret.base32;
	// user.is_two_factor_enabled = false;
	await UserModel.updateById(user.id, user);
	const qrCodeData = await qrcode.toDataURL(secret.otpauth_url);
	return { qrCodeData, secret: secret.base32 };
};

export const verify2FAToken = async (userId: any, token: any) => {
	try {
		let user = await UserModel.findById(userId);
		user = EncryptHelper.decryptJson(user[0]);
		const isValid = speakeasy.totp.verify({
			secret: user.two_factor_secret,
			encoding: 'base32',
			token: token,
		});
		if (!isValid) {
			throw new Error('Invalid 2FA token');
		} else {
			user.is_two_factor_enabled = true;
			await UserModel.updateById(user.id, user);
			return { success: true, message: '2FA verified successfully' };
		}
	} catch (error) {
		throw new Error('Error verifying 2FA token');
	} finally {
		console.error('In finally block');
	}
};

export const reVerify2FAToken = async (userId: any) => {
	try {
		let user = await UserModel.findById(userId);
		user = EncryptHelper.decryptJson(user[0]);
		const secret = speakeasy.generateSecret({ name: 'ReAbility Online Re-Auth' });
		user.two_factor_secret = secret.base32;
		user.is_two_factor_enabled = true;
		await UserModel.updateById(user.id, user);
		const qrCodeData = await qrcode.toDataURL(secret.otpauth_url);
		await EmailHelper.sendQrReVerify2FA(user.email, qrCodeData);
		return { qrCodeData, secret: secret.base32 };
	} catch (error) {
		throw new Error('Error verifying 2FA token');
	} finally {
		console.error('In finally block');
	}
};
