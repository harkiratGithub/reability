import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import * as UtilModel from './util.model';
import squel from 'squel';

export interface IPatientModel {
	id: number;
	firstName?: string;
	lastName?: string;
	identityNumber?: number;
	status?: boolean;
	phone?: number;
	userId?: number;
	suspend?: SuspendValues;
	techIssue?: TechIssueValues;
	techReason?: string;
	hasCamera?: boolean;
	disabledSkeleton?: boolean;
}
enum SuspendValues {
	empty = '<Empty>',
	vacation = 'Vacation',
	loa = 'LOA',
	financial = 'Financial',
	tech = 'Tech',
	concluded = 'Concluded',
}
enum TechIssueValues {
	empty = '<Empty>',
	nonBlocking = 'Non-blocking',
	blocking = 'Blocking',
}

const rtmValidationObject = [
	{ key: 'patient_id', type: 'number', required: true },
	{ key: 'timestamp', type: 'string', required: false },
	{ key: 'event', type: 'string', required: true },
];

const squelPostgres = squel.useFlavour('postgres');

const rtmValidator = (rtmObject) => {
	return UtilModel.modelValidator(rtmValidationObject, rtmObject, 'rtmValidator');
};

export const updateRTM = async (patient_id, data, type = 'patient', client = null, timestamp = null) => {
	const currentTimestamp = timestamp ? new Date(timestamp) : new Date();
    const currentMonth = currentTimestamp.getMonth() + 1;
    const currentYear = currentTimestamp.getFullYear();

	const daysTransmittedQuery = squelPostgres
        .select()
        .field('COUNT(DISTINCT DATE(timestamp))', 'daysDataTransmittedInMonth')
        .from(TABLE_NAME.RTM)
        .where('patient_id = ?', patient_id)
        .where('EXTRACT(MONTH FROM timestamp) = ?', currentMonth)
        .where('EXTRACT(YEAR FROM timestamp) = ?', currentYear)
        .toParam();

    const daysTransmittedResult = await BaseModel.runQuery(daysTransmittedQuery);
    const daysDataTransmittedInMonth = daysTransmittedResult?.rows?.[0]?.daysDataTransmittedInMonth || 0;
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.RTM)
		.where(
			`patient_id = ? AND DATE(timestamp)  = ${
				timestamp ? `${new Date(timestamp).toISOString().split('T')[0]}` : 'CURRENT_DATE'
			}`,
			patient_id
		)
		.toParam();
	const result = (await BaseModel.runQuery(query))?.rows;
	const isRTMExist = result?.length ? result[0] : null;
	if (type == 'patient') {
		if (!isRTMExist)
			return BaseModel.createRow(
				TABLE_NAME.RTM,
				{
					patient_id,
					event: JSON.stringify({
						note: null,
						therapist_id: null,
						minutes_spent: null,
						review_activity: null,
						reminder_to_exercise: null,
						therapist_session_minutes: null,
						pain_level: data?.painValue,
						daysDataTransmittedInMonth
					}),
					timestamp: timestamp ? new Date(timestamp).toDateString() : new Date().toDateString(),
				},
				rtmValidator,
				client
			);
		else
			return BaseModel.updateRowByField(
				TABLE_NAME.RTM,
				{
					patient_id,
					event: JSON.stringify({
						...isRTMExist?.event,
						pain_level: data?.painValue,
						daysDataTransmittedInMonth
					}),
				},
				'line',
				isRTMExist?.line,
				client
			);
	} else {
		if (!isRTMExist)
			return BaseModel.createRow(
				TABLE_NAME.RTM,
				{
					patient_id,
					event: JSON.stringify({
						pain_level: null,
						...data,
						daysDataTransmittedInMonth
					}),
					timestamp: new Date().toDateString(),
				},
				rtmValidator,
				client
			);
		else
			return BaseModel.updateRowByField(
				TABLE_NAME.RTM,
				{
					patient_id,
					event: JSON.stringify({
						...isRTMExist?.event,
						...data,
						daysDataTransmittedInMonth
					}),
				},
				'line',
				isRTMExist?.line,
				client
			);
	}
};
