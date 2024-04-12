import * as PatientTreatmentHelper from '../helpers/patient-treatment.helper';
import { IPatientTreatment } from '../models/patient-treatment.model';
import * as ExpertiseModel from '../models/expertise.model';
import * as ActivityLogHelper from '../helpers/activity-log.helper';
import * as BookingHelper from '../helpers/booking.helper';
import * as PatientHelper from '../helpers/patient.helper';
import { LogAction } from '../models/activity-log.model';
import { TABLE_NAME } from '../const';

export const getPatientActiveTreatments = (req, res, next) => {
	const { patientId } = req?.params;
	return PatientTreatmentHelper.getPatientActiveTreatments(patientId)
		.then((patientTreatments: IPatientTreatment[]) => {
			res.json(patientTreatments);
		})
		.catch((err) => next(err));
};

export const deletePatientTreatment = (req, res, next) => {
	const { id } = req?.params;
	const user = req.user;

	BookingHelper.getNumberOfFuturePatientTreatmentBookings(id)
		.then(async (numberOfFutureBookings: number) => {
			if (numberOfFutureBookings > 0) {
				res.json({ numberOfFutureBookings });
				return;
			}

			PatientTreatmentHelper.deletePatientTreatment(id).then(async (deletedPatientTreatment) => {
				const { payer, times_per_week, max_patients, expertise_id } = deletedPatientTreatment;
				const expertise = await ExpertiseModel.getExpertiseById(expertise_id);
				const patient = await PatientHelper.getPatientById(deletedPatientTreatment.patient_id);
				await ActivityLogHelper.createLog(
					user.id,
					patient.user_id,
					TABLE_NAME.PATIENT_TREATMENT,
					LogAction.Delete,
					deletedPatientTreatment.id,
					{ expertise_name: expertise.name, payer, times_per_week, max_patients },
					null
				);
				res.json(deletedPatientTreatment);
			});
		})
		.catch((err) => next(err));
};

export const createPatientTreatment = (req, res, next) => {
	const { patientTreatment } = req.body;
	const user = req.user;
	PatientTreatmentHelper.createPatientTreatment(patientTreatment)
		.then(async (createdPatientTreatment) => {
			const { payer, times_per_week, max_patients, expertise_id } = createdPatientTreatment;
			const expertise = await ExpertiseModel.getExpertiseById(expertise_id);
			const patient = await PatientHelper.getPatientById(createdPatientTreatment.patient_id);
			ActivityLogHelper.createLog(
				user.id,
				patient.user_id,
				TABLE_NAME.PATIENT_TREATMENT,
				LogAction.Create,
				createdPatientTreatment.id,
				null,
				{ expertise_name: expertise.name, payer, times_per_week, max_patients }
			);
			res.json(createdPatientTreatment);
		})
		.catch((err) => next(err));
};

export const editPatientTreatment = async (req, res, next) => {
	const { patientTreatment } = req.body;
	const user = req.user;
	PatientTreatmentHelper.editPatientTreatment(patientTreatment)
		.then(async ([oldPatientTreatment, updatedPatientTreatment]) => {
			const { payer, times_per_week, max_patients, expertise_id } = updatedPatientTreatment;
			const expertise = await ExpertiseModel.getExpertiseById(expertise_id);
			const patient = await PatientHelper.getPatientById(updatedPatientTreatment.patient_id);
			ActivityLogHelper.createLog(
				user.id,
				patient.user_id,
				TABLE_NAME.PATIENT_TREATMENT,
				LogAction.Update,
				updatedPatientTreatment.id,
				{
					expertise_name: expertise.name,
					payer: oldPatientTreatment.payer,
					times_per_week: oldPatientTreatment.times_per_week,
					max_patients: oldPatientTreatment.max_patients,
				},
				{ expertise_name: expertise.name, payer, times_per_week, max_patients }
			);
			res.json(updatedPatientTreatment);
		})
		.catch((err) => next(err));
};
