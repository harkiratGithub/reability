import { TABLE_NAME } from '../const';
import * as RtmHelper from '../helpers/rtm.helper';
import { LogAction } from '../models/activity-log.model';
import * as ActivityLogHelper from '../helpers/activity-log.helper';

export const updatePatientRTMSession = (req, res, next) => {
	const { patientId, painValue } = req.body;
	const user = req.user;
	RtmHelper.updatePatientSession(patientId, painValue)
		.then(async (createdPainSession) => {
			ActivityLogHelper.createLog(user.id, patientId, TABLE_NAME.RTM, LogAction.Update, null, null, null, null);
			res.json(createdPainSession);
		})
		.catch((err) => next(err));
};

export const updateTherapistRTMSession = (req, res, next) => {
	const { patientId, data, timestamp } = req.body;
	const user = req.user;
	RtmHelper.updateTherapistSession(patientId, data, timestamp)
		.then(async (createdPainSession) => {
			ActivityLogHelper.createLog(user.id, patientId, TABLE_NAME.RTM, LogAction.Update, null, null, null, null);
			res.json(createdPainSession);
		})
		.catch((err) => next(err));
};
