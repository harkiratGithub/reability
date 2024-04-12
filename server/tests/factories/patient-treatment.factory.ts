import faker from 'faker';
import { TABLE_NAME } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';
import { createExpertise } from './expertise.factory';
import { createPatient } from './patient.factory';

export const createPatientTreatment = async (
	patient = null,
	expertise = null,
	maxPatients = null,
	timesPerWeek = null
) => {
	const patientTreatmentId = faker.datatype.number();
	if (!patient) {
		patient = await createPatient();
	}
	if (!expertise) {
		expertise = await createExpertise();
	}
	const patientTreatmentParams = {
		id: patientTreatmentId,
		patient_id: patient.patient_id,
		expertise_id: expertise.expertise_id,
		max_patients: maxPatients ? maxPatients : faker.datatype.number({ min: 1, max: 4 }),
		times_per_week: timesPerWeek ? timesPerWeek : faker.datatype.number({ min: 1, max: 6 }),
		active: true,
	};
	await BaseModel.insertRow(TABLE_NAME.PATIENT_TREATMENT, patientTreatmentParams);
	delete patientTreatmentParams['id'];
	return { ...patientTreatmentParams, patient_treatment_id: patientTreatmentId };
};
