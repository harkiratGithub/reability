import * as TherapistSessionModel from '../models/therapist-session.model';
import * as UserModel from '../models/users.model';
import * as Helper from '../services/util.helper';
import { delayedHeartbeat } from '../../constants/heartbeat';
import * as RtmHelper from '../helpers/rtm.helper';

export const createTherapistSession = async (userId, therapistId) => {
	console.log('userId', userId);
	const newDbTime = Helper.createTimeForDb();
	const patient = await UserModel.getUserDetails(userId);
	const checkLastTherapistPatientSession = await TherapistSessionModel.getLastTherapistPatientSession(
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
	const therapistSessionData = await TherapistSessionModel.create({
		patient_id: patient[0].id,
		therapist_id: therapistId,
		start_time: newDbTime,
		end_time: newDbTime,
	});
	await RtmHelper.updateTherapistSession(
		therapistSessionData.patient_id,
		{
			mode: 'auto',
			therapist_session_id: therapistSessionData.id,
			review_activity: 'Video Call',
			therapist_id: therapistId,
		},
		new Date()
	);
	return therapistSessionData;
};

export const updateTherapistSession = async (userId) => {
	console.log('updateTherapistSessionEndTime');
	return TherapistSessionModel.updateTherapistSessionEndTime(userId);
};
