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
	{ key: 'data', type: 'string', required: true },
];

const squelPostgres = squel.useFlavour('postgres');

const rtmValidator = (rtmObject) => {
	if (typeof rtmObject.timestamp !== 'string' || isNaN(Date.parse(rtmObject.timestamp))) {
		throw new Error('rtmValidator: timestamp not valid date');
	}
	return UtilModel.modelValidator(rtmValidationObject, rtmObject, 'rtmValidator');
};

const getInstituteIdByPatientId = async (patient_id) => {
	const query = squelPostgres
		.select()
		.field('d.institute_id')
		.from(TABLE_NAME.PATIENT_DEPARTMENTS, 'pd')
		.join(TABLE_NAME.DEPARTMENT, 'd', 'd.id = pd.department_id')
		.where('pd.patient_id = ?', patient_id)
		.toParam();

	const result = await BaseModel.runQuery(query);

	const institute_id = result?.rows?.[0]?.institute_id;

	return institute_id;
};

export const updateRTM = async (patient_id, data, type = 'patient', client = null, timestamp = null) => {
	const currentTimestamp = timestamp ? new Date(timestamp) : new Date();
	if (isNaN(currentTimestamp.getTime())) {
		throw new Error('Invalid timestamp provided');
	}
	const institute_id = await getInstituteIdByPatientId(patient_id);
	const formattedTimestamp = currentTimestamp.toISOString().replace('T', ' ').replace('Z', '');
	console.log('formattedTimestamp: ', formattedTimestamp);
	// console.log("currentTimestamp: ",timestamp, currentTimestamp)
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
			`patient_id = ? AND DATE(timestamp) = ${timestamp ? `'${formattedTimestamp.split(' ')[0]}'` : 'CURRENT_DATE'}`,
			patient_id
		)
		.toParam();
	// const result = (await BaseModel.runQuery(query))?.rows;
	// const isRTMExist = result?.length ? result[0] : null;
	if (type == 'patient') {
		// if (!isRTMExist)
		return BaseModel.createRow(
			TABLE_NAME.RTM,
			{
				patient_id,
				institute_id: institute_id,
				data: JSON.stringify({
					patient: {
						note: data?.patient_note,
						pain_level: data?.painValue,
					},
					// therapist_id: null,
					// minutes_spent: null,
					// review_activity: null,
					// reminder_to_exercise: null,
					// therapist_session_minutes: null,
					// patient_note: data?.patient_note,
					// daysDataTransmittedInMonth
				}),
				timestamp: formattedTimestamp,
			},
			rtmValidator,
			client
		);
		// else
		// 	return BaseModel.updateRowByField(
		// 		TABLE_NAME.RTM,
		// 		{
		// 			patient_id,
		// 			event: JSON.stringify({
		// 				...isRTMExist?.event,
		// 				pain_level: data?.painValue,
		// 				patient_note: data?.patient_note,
		// 				daysDataTransmittedInMonth
		// 			}),
		// 		},
		// 		'line',
		// 		isRTMExist?.line,
		// 		client
		// 	);
	} else {
		// if (!isRTMExist)
		return BaseModel.createRow(
			TABLE_NAME.RTM,
			{
				patient_id,
				data: JSON.stringify({
					therapist: {
						start_time: data.start_time,
						end_time: data.end_time,
						therapist_id: data.therapist_id,
						minutes_spent: data.minutes_spent,
						review_activity_type: data.review_activity,
						note: data.note,
						mode: data.mode || 'manual',
						therapist_session_id: data.therapist_session_id,
					},
				}),
				institute_id: institute_id,
				timestamp: formattedTimestamp,
			},
			rtmValidator,
			client
		);
		// else
		// 	return BaseModel.updateRowByField(
		// 		TABLE_NAME.RTM,
		// 		{
		// 			patient_id,
		// 			event: JSON.stringify({
		// 				...isRTMExist?.event,
		// 				...data,
		// 				daysDataTransmittedInMonth
		// 			}),
		// 		},
		// 		'line',
		// 		isRTMExist?.line,
		// 		client
		// 	);
	}
};
