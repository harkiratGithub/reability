import * as TherapistSessionModel from '../models/therapist-session.model';
import * as UserModel from '../models/users.model';
import * as Helper from '../services/util.helper';
import { delayedHeartbeat } from '../../constants/heartbeat';

export const createTherapistSession = async (userId, therapistId) => {
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
		!Helper.checkIfPassedAmountOfMs(
			checkLastTherapistPatientSession.end_time,
			delayedHeartbeat
		)
	) {
		return;
	}
	return TherapistSessionModel.create({
		patient_id: patient[0].id,
		therapist_id: therapistId,
		start_time: newDbTime,
		end_time: newDbTime,
	});
};

export const updateTherapistSession = async (userId) => {
	return TherapistSessionModel.updateTherapistSessionEndTime(userId);
};
