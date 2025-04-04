import * as BaseModel from '../services/BaseModel.service';
import { updateRTM } from '../models/rtm.model';
import * as Helper from '../services/util.helper';

export const updatePatientSession = async (patient_id, painValue, patient_note,userTimezone) => {
	const timezoneinMinutes = Helper.convertTimezoneToMinutes(userTimezone);
	const rtmCreationFunc = async (client = null) => {
		try {
			const updatePatientSession = await updateRTM(patient_id, { painValue , patient_note }, 'patient','','',timezoneinMinutes);
			return updatePatientSession;
		} catch (err) {
			throw err;
		}
	};
	return BaseModel.runAsTransaction(rtmCreationFunc);
};


export const updateTherapistSession = async (patient_id, data, timestamp,userTimezone) => {
	const timezoneinMinutes = Helper.convertTimezoneToMinutes(userTimezone);
	const rtmCreationFunc = async (client = null) => {
		try {
			const updatePatientSession = await updateRTM(patient_id, data, 'therapist', null, timestamp,timezoneinMinutes);
			return updatePatientSession;
		} catch (err) {
			if (err.status === 400) {
				throw {
					status: 400,
					message: err.message, // Pass the "Duplicate entry" message
				};
			}
			throw err;
			// throw err;
		}
	};
	return BaseModel.runAsTransaction(rtmCreationFunc);
};