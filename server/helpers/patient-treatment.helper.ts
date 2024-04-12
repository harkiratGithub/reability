import * as BaseModel from '../services/BaseModel.service';
import * as PatientTreatmentModel from '../models/patient-treatment.model';
import { IPatientTreatment } from '../models/patient-treatment.model';

export const getPatientActiveTreatments = async (patientId: number): Promise<IPatientTreatment[]> => {
	return await PatientTreatmentModel.getPatientActiveTreatments(patientId);
};

export const deletePatientTreatment = async (id: number) => {
	const patientTreatmentDeleteFunc = (client = null) => PatientTreatmentModel.removeByPatientTreatmentId(id, client);
	return await BaseModel.runAsTransaction(patientTreatmentDeleteFunc);
};

export const createPatientTreatment = async (patientTreatment: IPatientTreatment) => {
	const { patient_id, expertise_id, payer, max_patients, times_per_week } = patientTreatment;
	return await PatientTreatmentModel.create({
		patient_id,
		expertise_id,
		payer,
		max_patients,
		times_per_week,
		active: true,
	});
};

export const editPatientTreatment = async (patientTreatment: IPatientTreatment) => {
	const { id, patient_id, expertise_id, payer, max_patients, times_per_week } = patientTreatment;
	const oldPatientTreatment = await PatientTreatmentModel.getPatientTreatmentById(patientTreatment.id);
	const updatedPatientTreatment = await PatientTreatmentModel.edit(patientTreatment.id, {
		id,
		patient_id,
		expertise_id,
		payer,
		max_patients,
		times_per_week,
		active: true,
	});
	return [oldPatientTreatment, updatedPatientTreatment];
};

export const deletePatientTreatmentByPatientId = (id: number) => {
	return PatientTreatmentModel.removeByPatientId(id);
};

export const getNumberOfExpertiseActiveTreatments = (expertiseId: number): Promise<number> => {
	return PatientTreatmentModel.getNumberOfExpertiseActiveTreatments(expertiseId);
};
