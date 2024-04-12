import squel from 'squel';

import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';
import * as UtilHelper from './util.model';

const squelPostgres = squel.useFlavour('postgres');

export interface IPatientTreatment {
	id?: number;
	patient_id: number;
	expertise_id: number;
	payer: string;
	max_patients: number;
	times_per_week: number;
	active: boolean;
}

const patientTreatmentValidationObject = [
	{ key: 'id', type: 'number', required: false },
	{ key: 'patient_id', type: 'number', required: true },
	{ key: 'expertise_id', type: 'number', required: true },
	{ key: 'payer', type: 'string', required: true },
	{ key: 'max_patients', type: 'number', required: false },
	{ key: 'times_per_week', type: 'number', required: true },
	{ key: 'active', type: 'boolean', required: true },
];

export const patientTreatmentValidator = (patientTreatmentObject): void => {
	UtilHelper.modelValidator(patientTreatmentValidationObject, patientTreatmentObject, 'patientTreatmentValidator');
};

export const getPatientActiveTreatments = async (patientId: number): Promise<IPatientTreatment[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.id`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.patient_id`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.expertise_id`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.payer`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.max_patients`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.times_per_week`)
		.field(`${TABLE_NAME.PATIENT_TREATMENT}.active`)
		.field(`${TABLE_NAME.EXPERTISE}.name`, 'expertise_name')
		.field(`${TABLE_NAME.EXPERTISE}.duration`)
		.field(`${TABLE_NAME.PROFESSION}.name`, 'profession_name')
		.field(`${TABLE_NAME.PROFESSION}.id`, 'profession_id')
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.join(TABLE_NAME.EXPERTISE, null, `${TABLE_NAME.PATIENT_TREATMENT}.expertise_id = ${TABLE_NAME.EXPERTISE}.id`)
		.join(TABLE_NAME.PROFESSION, null, `${TABLE_NAME.EXPERTISE}.profession_id = ${TABLE_NAME.PROFESSION}.id`)
		.where(
			`${TABLE_NAME.PATIENT_TREATMENT}.patient_id = ? AND ${TABLE_NAME.PATIENT_TREATMENT}.active = ?`,
			patientId,
			true
		)
		.order(`${TABLE_NAME.PATIENT_TREATMENT}.created_at`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const removeByPatientTreatmentId = async (id: number, client = null): Promise<IPatientTreatment> => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT_TREATMENT)
		.set('active', false)
		.where(`id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows?.[0];
};
export const removeByPatientId = async (id: number, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.PATIENT_TREATMENT)
		.set('active', false)
		.where(`patient_id = ?`, id)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};
export const create = (patientTreatment: IPatientTreatment) =>
	BaseModel.createRow(TABLE_NAME.PATIENT_TREATMENT, patientTreatment, patientTreatmentValidator);

export const edit = (id, data, client = null) => {
	return BaseModel.updateRowByField(TABLE_NAME.PATIENT_TREATMENT, data, 'id', id, client);
};

export const getPatientTreatmentById = async (id: number) => {
	const result = await BaseModel.itemsByField(TABLE_NAME.PATIENT_TREATMENT, 'id', id);
	return result?.[0];
};

export const getNumberOfExpertiseActiveTreatments = async (expertiseId: number): Promise<number> => {
	const query = squelPostgres
		.select()
		.field(`COUNT(*) as treatments`)
		.from(TABLE_NAME.PATIENT_TREATMENT)
		.where(
			`${TABLE_NAME.PATIENT_TREATMENT}.expertise_id = ? AND ${TABLE_NAME.PATIENT_TREATMENT}.active = ?`,
			expertiseId,
			true
		)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return +result.rows[0].treatments;
};
