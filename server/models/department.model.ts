import squel from 'squel';
import { map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import * as UtilModel from './util.model';
import * as Helper from '../services/util.helper';
import { TABLE_NAME } from '../const';

const squelPostgres = squel.useFlavour('postgres');

const departmentValidationObject = [
	{ key: 'name', type: 'string', required: true },
	{ key: 'institute_id', type: 'number', required: true },
];

export const departmentValidator = (departmentObject) => {
	return UtilModel.modelValidator(departmentValidationObject, departmentObject, 'departmentValidator');
};

export const create = async (department) => {
	return BaseModel.createRow(TABLE_NAME.DEPARTMENT, department, departmentValidator);
};

export const getAll = () => {
	return BaseModel.getAllTable(TABLE_NAME.DEPARTMENT);
};

export const getPatientsByDepartment = async (arrayOfIds, client = null) => {
	const rows = await BaseModel.itemsInArray(TABLE_NAME.PATIENT_DEPARTMENTS, 'department_id', arrayOfIds, client);
	let patientIds = rows.reduce((accumulator, currentValue) => {
		if (accumulator.indexOf(currentValue.patient_id) === -1) {
			accumulator.push(currentValue.patient_id);
		}
		return accumulator;
	}, []);
	return patientIds.length > 0 ? BaseModel.itemsInArray(TABLE_NAME.PATIENT, 'id', patientIds, client) : [];
};

export const getTherapistByDepartment = async (arrayOfIds, client = null) => {
	const rows = await BaseModel.itemsInArray(TABLE_NAME.THERAPIST_DEPARTMENTS, 'department_id', arrayOfIds, client);
	let therapistIds = rows.reduce((accumulator, currentValue) => {
		if (accumulator.indexOf(currentValue.therapist_id) === -1) {
			accumulator.push(currentValue.therapist_id);
		}
		return accumulator;
	}, []);
	return therapistIds.length > 0 ? BaseModel.itemsInArray(TABLE_NAME.THERAPIST, 'id', therapistIds, client) : [];
};

export const updateDepartmentNotActive = async (arrayOfIds, client = null) => {
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.DEPARTMENT)
		.set('name', `name || '${Helper.getDateForArchiveString()}'`, {
			dontQuote: true,
		})
		.set('active', false)
		.where(`id in ?`, arrayOfIds)
		.returning('*')
		.toString();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const removeDepartmentsFromPatient = async (arrayOfIds, client = null) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.PATIENT_DEPARTMENTS)
		.where(`department_id in ?`, arrayOfIds)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const removeDepartmentsFromTherapist = async (arrayOfIds, client = null) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.THERAPIST_DEPARTMENTS)
		.where(`department_id in ?`, arrayOfIds)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query, client);
	return result.rows;
};

export const getTherapistsIdsByPatientDepartments = async (patientId: number, client = null): Promise<number[]> => {
	const patientDepartments = await BaseModel.itemsByField(
		TABLE_NAME.PATIENT_DEPARTMENTS,
		'patient_id',
		patientId,
		client
	);
	const patientDepartmentIdsStr = map(patientDepartments, (patientDepartment) => patientDepartment.department_id).join(
		','
	);
	if (!patientDepartmentIdsStr) {
		return [];
	}

	const matchedTherapists = await BaseModel.itemsInArrayDistinct(
		TABLE_NAME.THERAPIST_DEPARTMENTS,
		'department_id',
		patientDepartmentIdsStr,
		'therapist_id',
		client
	);

	return map(matchedTherapists, (therapist) => therapist.therapist_id);
};

export const getTherapistByDepartmentId = async (arrayOfIds, client = null) => {
	try {
		const rows = await BaseModel.itemsInArray(TABLE_NAME.THERAPIST_DEPARTMENTS, 'therapist_id', arrayOfIds, client);
		return rows;
	} catch (error) {
		throw error;
	}
};

export const getAllByIdsAndInstitute = async (departmentIds: number[], therapistId: number, client = null) => {
	try {
		const query = squelPostgres
			.select()
			.from(TABLE_NAME.DEPARTMENT, 'd')
			.join(TABLE_NAME.THERAPIST_DEPARTMENTS, 'td', 'd.id = td.department_id')
			.where('td.therapist_id = ?', therapistId)
			.where('d.id IN ?', departmentIds)
			.toParam();
		const result = await BaseModel.runQuery(query, client);
		const formattedResults = result.rows.map((row) => ({
			id: row.department_id,
			name: row.name,
			institute_id: row.institute_id,
			created_at: row.created_at,
			updated_at: row.updated_at,
			active: row.active,
		}));
		return formattedResults;
	} catch (error) {
		throw error;
	}
};
