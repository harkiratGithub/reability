import * as BaseModel from '../services/BaseModel.service';
import * as UtilModel from '../models/util.model';
import * as Helper from '../services/util.helper';
import { TABLE_NAME } from '../const';
import { delayedHeartbeat } from '../../constants/heartbeat';
import squel from 'squel';

const squelPostgres = squel.useFlavour('postgres');
const therapistSessionValidationObject = [
	{ key: 'patient_id', type: 'number', required: true },
	{ key: 'therapist_id', type: 'number', required: true },
];

export const therapistSessionValidator = (therapistSessionObject) => {
	return UtilModel.modelValidator(
		therapistSessionValidationObject,
		therapistSessionObject,
		'therapistSessionValidator'
	);
};

export const create = (therapistSessionObject) => {
	return BaseModel.createRow(
		TABLE_NAME.THERAPIST_SESSION,
		therapistSessionObject,
		therapistSessionValidator
	);
};

export const getLastTherapistPatientSession = async (
	patient_id,
	therapist_id
) => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.THERAPIST_SESSION)
		.where('patient_id = ?', patient_id)
		.where('therapist_id = ?', therapist_id)
		.order('id', false)
		.limit(1)
		.toParam();
	const res = await BaseModel.runQuery(query);
	return res.rows[0];
};

export const updateTherapistSessionEndTime = async (userId) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.THERAPIST_SESSION)
		.set('end_time', Helper.createTimeForDb())
		.where(
			`id = ?`,
			squelPostgres
				.select()
				.field(`Max(${TABLE_NAME.THERAPIST_SESSION}.id)`)
				.from(TABLE_NAME.THERAPIST_SESSION)
				.left_join(
					TABLE_NAME.PATIENT,
					null,
					`${TABLE_NAME.THERAPIST_SESSION}.patient_id = ${TABLE_NAME.PATIENT}.id`
				)
				.where(`${TABLE_NAME.PATIENT}.user_id = ?`, userId)
		)
		.returning('*')
		.toParam();
	const res = await BaseModel.runQuery(query);
	return res.rows[0];
};

// get all peers by there activeness
export const getBusyPeers = async () => {
	const time = new Date();
	time.setMilliseconds(time.getMilliseconds() - delayedHeartbeat);
	const utcTime = time.toUTCString();
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.THERAPIST_SESSION)
		.where('end_time > ?', utcTime)
		.toParam();
	const res = await BaseModel.runQuery(query);
	return res.rows;
};
