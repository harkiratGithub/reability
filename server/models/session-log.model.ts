import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';

export interface ISessionLog {
	peer_id: number;
	therapist_id: number;
	patient_id: number;
	status: string;
}

export const create = (sessionLogObject: ISessionLog) => {
	return BaseModel.insertRow(TABLE_NAME.SESSION_LOG, sessionLogObject);
};

