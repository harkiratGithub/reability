import * as TherapistSessionModel from '../models/therapist-session.model';
import * as UserModel from '../models/users.model';
import * as Helper from '../services/util.helper';
import { delayedHeartbeat } from '../../constants/heartbeat';
import * as RtmHelper from '../helpers/rtm.helper';

export const createTherapistSession = async (userId, therapistId, type = null) => {
	console.log('userId', userId);
	const newDbTime = Helper.createTimeForDb();
	const patient = await UserModel.getUserDetails(userId);
	const checkLastTherapistPatientSession = await TherapistSessionModel.getLastTherapistPatientSession(
		patient[0].id,
		therapistId
	);
	const checkLastTherapistRingingPatientSession = await TherapistSessionModel.getLastTherapistRingingPatientSession(
		patient[0].id,
		therapistId
	);
	// prevent from create two times in a row...
	if (
		checkLastTherapistPatientSession &&
		checkLastTherapistPatientSession.therapist_id === therapistId &&
		!Helper.checkIfPassedAmountOfMs(checkLastTherapistPatientSession.end_time, delayedHeartbeat)
	) {
		return;
	}

	if (
		type == 'ringing' &&
		checkLastTherapistRingingPatientSession &&
		checkLastTherapistRingingPatientSession.therapist_id === therapistId &&
		!Helper.checkIfPassedAmountOfMs(checkLastTherapistRingingPatientSession.end_time, delayedHeartbeat)
	) {
		return;
	}

	let therapistSessionData = null;

	if (type === 'ringing') {
		// For ringing sessions, set end_time to a future time (e.g., 30 seconds from now)
		// const futureTime = new Date(newDbTime);
		// futureTime.setSeconds(futureTime.getSeconds() + 30); // 30 seconds timeout for ringing

		therapistSessionData = await TherapistSessionModel.create({
			patient_id: patient[0].id,
			therapist_id: therapistId,
			start_time: newDbTime,
			end_time: newDbTime,
			type,
		});
	} else {
		therapistSessionData = await TherapistSessionModel.create({
			patient_id: patient[0].id,
			therapist_id: therapistId,
			start_time: newDbTime,
			end_time: newDbTime,
		});
	}

	await RtmHelper.updateTherapistSession(
		therapistSessionData.patient_id,
		{
			mode: 'auto',
			therapist_session_id: therapistSessionData.id,
			review_activity: 'Video Call',
			therapist_id: therapistId,
		},
		new Date(),
		null
	);
	return therapistSessionData;
};

export const updateTherapistSession = async (userId) => {
	console.log('updateTherapistSessionEndTime');
	return TherapistSessionModel.updateTherapistSessionEndTime(userId);
};

export const getLastSessionStatusByPatientId = async (patientId) => {
	try {
		const lastSession = await TherapistSessionModel.getLastSessionByPatientId(patientId);
		if (!lastSession) {
			return null;
		}
		return {
			type: lastSession.type,
			status: lastSession.status,
			therapist_id: lastSession.therapist_id,
		};
	} catch (error) {
		throw error;
	}
};
