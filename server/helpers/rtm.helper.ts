import * as BaseModel from '../services/BaseModel.service';
import { updateRTM } from '../models/rtm.model';

export const updatePatientSession = async (patient_id, painValue) => {
	const rtmCreationFunc = async (client = null) => {
		try {
			const updatePatientSession = await updateRTM(patient_id, { painValue }, 'patient');
			return updatePatientSession;
		} catch (err) {
			throw err;
		}
	};
	return BaseModel.runAsTransaction(rtmCreationFunc);
};


export const updateTherapistSession = async (patient_id, data, timestamp) => {
	const rtmCreationFunc = async (client = null) => {
		try {
			const updatePatientSession = await updateRTM(patient_id, data, 'therapist', null, timestamp);
			return updatePatientSession;
		} catch (err) {
			throw err;
		}
	};
	return BaseModel.runAsTransaction(rtmCreationFunc);
};
