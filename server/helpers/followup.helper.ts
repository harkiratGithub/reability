import * as BaseModel from '../services/BaseModel.service';
import * as FollowupModel from '../models/followup.model';
import { IFollowup } from '../models/followup.model';
import * as EncryptHelper from '../services/encrypt.helper';
import * as ActivityLogModel from '../models/activity-log.model';
import * as PatientModel from '../models/patient.model';
import { TABLE_NAME } from '../const';

const formatFollowup = (result: any): IFollowup => {
	const { patient_first_name, patient_last_name, therapist_first_name, therapist_last_name, ...rest } =
		EncryptHelper.decryptJson(result);
	const patient_full_name = `${patient_first_name} ${patient_last_name}`;
	const therapist_full_name = `${therapist_first_name} ${therapist_last_name}`;
	return {
		...rest,
		patient_full_name,
		therapist_full_name,
	};
};

export const getAll = async (): Promise<IFollowup[]> => {
	const encryptedResult = await FollowupModel.getAll();
	return encryptedResult.map(formatFollowup);
};

export const editFollowup = async (followupToUpdate: IFollowup): Promise<void> => {
	await FollowupModel.updateById(followupToUpdate);
};

export function deleteFollowup(id: number, performedByUserId: number) {
	const followupDeleteFunc = async (client = null) => {
		const followup = await FollowupModel.getFollowupById(id);
		const patient = await PatientModel.getPatientById(followup.patient_id);
		await FollowupModel.remove(id, client);

		const remarks = `Followup Deleted - ${followup.description}`;
		const activityLog: ActivityLogModel.IActivityLog = {
			userId: patient.user_id,
			action: ActivityLogModel.LogAction.Delete,
			tableName: TABLE_NAME.FOLLOWUP,
			rowId: id,
			performedByUserId,
			remarks,
		};
		await ActivityLogModel.logToDb(activityLog);
	};
	return BaseModel.runAsTransaction(followupDeleteFunc);
}

export const createFollowup = async (followup: IFollowup) => {
	const { patient_id, therapist_id, date, description } = followup;
	try {
		await FollowupModel.create({ patient_id, therapist_id, date, description, done: false });
	} catch (err) {
		throw err;
	}
};
