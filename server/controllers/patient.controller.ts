import { Request, Response, NextFunction } from 'express';
import { map } from 'lodash';

import { BOOKING_DELETE_OPTIONS, TABLE_NAME } from '../const';
import * as PatientHelper from '../helpers/patient.helper';
import * as ActivityLogHelper from '../helpers/activity-log.helper';
import { LogAction } from '../models/activity-log.model';
import * as EncryptHelper from '../services/encrypt.helper';
import { convertKeysToSnakeCase } from '../models/util.model';
import * as LeadHelper from '../helpers/lead.helper';
import * as PatientTreatmentHelper from '../helpers/patient-treatment.helper';
import * as BookingHelper from '../helpers/booking.helper';
import * as UserHelper from '../helpers/users.helper';
import * as FeedbackHelper from '../helpers/feedback.helper';
import { getAllPatientRTMDetails } from '../models/patient.model';
import * as PatientMetaDataModel from '../models/patient-metadata.model';

export interface IPatientContact {
	patient_id: number;
	full_name: string;
	phone: string;
	email: string;
}

const extractBodyParams = (body, patientId = null) => {
	const {
		first_name: firstName,
		last_name: lastName,
		departments_ids: departmentsIds,
		email,
		suspend,
		phone,
		tech_issue,
		tech_reason,
		notification_email,
		login_notification_email,
		referral,
		is_patient_video: isPatientVideo,
		primary_contact_email,
		primary_contact_phone,
		primary_contact_full_name,
		secondary_contact_email,
		secondary_contact_phone,
		secondary_contact_full_name,
	} = body;

	const patientData = {
		firstName,
		lastName,
		email,
		phone,
		suspend,
		tech_issue,
		tech_reason,
		notification_email,
		login_notification_email,
		referral,
		departmentsIds,
		isPatientVideo,
		disabledSkeleton: true,
	};
	const userData = {
		email,
	};
	const patientContacts: IPatientContact[] = [];
	if (primary_contact_full_name || primary_contact_phone || primary_contact_email) {
		patientContacts.push({
			patient_id: patientId,
			full_name: primary_contact_full_name,
			phone: primary_contact_phone,
			email: primary_contact_email,
		});
	}
	if (secondary_contact_full_name || secondary_contact_phone || secondary_contact_email) {
		patientContacts.push({
			patient_id: patientId,
			full_name: secondary_contact_full_name,
			phone: secondary_contact_phone,
			email: secondary_contact_email,
		});
	}

	return { patientData, userData, patientContacts };
};

export const createPatient = (req, res, next) => {
	const { lead_id } = req.body.patient;
	const { patientData, patientContacts } = extractBodyParams(req.body.patient);
	const user = req.user;
	PatientHelper.createPatient(patientData, patientContacts)
		.then(async (createdPatient) => {
			const encryptedPatientContacts = PatientHelper.flattenAndEncryptPatientContacts(patientContacts, true);
			const encryptedPatient = EncryptHelper.encryptJson(createdPatient);
			const { first_name, last_name, phone, suspend, tech_issue, tech_reason, notification_email, login_notification_email, department_names } =
				encryptedPatient;
			try {
				if (lead_id) {
					await LeadHelper.linkLeadToPatient(lead_id, createdPatient.id, createdPatient.user_id);
				}
				await ActivityLogHelper.createLog(
					user.id,
					createdPatient.user_id,
					TABLE_NAME.PATIENT,
					LogAction.Create,
					createdPatient.id,
					null,
					{
						first_name,
						last_name,
						phone,
						suspend,
						tech_issue,
						tech_reason,
						notification_email,
						login_notification_email,
						department_names,
						...encryptedPatientContacts,
					}
				);
			} catch (error) {
				console.error('error in creating activity log', error);
			}
			res.json(createdPatient);
		})
		.catch((err) => next(err));
};

export const editPatient = (req, res, next) => {
	const { patientId } = req.body;
	const { patientData, userData, patientContacts } = extractBodyParams(req.body.patient, patientId);
	const user = req.user;
	PatientHelper.editPatient({ ...patientData, patientId }, userData, patientContacts)
		.then(([updatedPatient, patientChanges, oldPatientValues]) => {
			ActivityLogHelper.createLog(
				user.id,
				updatedPatient.user_id,
				TABLE_NAME.PATIENT,
				LogAction.Update,
				updatedPatient.id,
				oldPatientValues,
				patientChanges
			);
			res.json(updatedPatient);
		})
		.catch((err) => next(err));
};

export const deletePatient = (req, res, next) => {
	const { id } = req.params;
	PatientHelper.deletePatient(id)
		.then((deletedPatient) => res.json(deletedPatient))
		.catch((err) => next(err));
};

export const getPatientListActivities = (req, res, next) => {
	const { startTime, endTime } = req.body;
	const therapistId = req.user.therapistId;
	PatientHelper.getActivities(therapistId, startTime, endTime)
		.then((patientListActivities) => res.json(patientListActivities))
		.catch((err) => {
			next(err);
		});
};

export const getPatientListDataActivities = (req, res, next) => {
	const { startTime, endTime } = req.body;
	const patientId = req.user.patientId;
	PatientHelper.getPatientActivities(patientId, startTime, endTime)
		.then((patientListActivities) => res.json(patientListActivities))
		.catch((err) => {
			next(err);
		});
};

export const getAllActive = (req, res, next) => {
	PatientHelper.getAllActive()
		.then((activePatients) => res.json(activePatients))
		.catch((err) => next(err));
};

export const getAllRTMDetails = async (req, res, next) => {
	const { month, year, sendMail } = req.query;
	getAllPatientRTMDetails(month || null, year || null, sendMail || false, null)
		.then((rtmData) => res.json(rtmData))
		.catch((err) => next(err));
};

export const sendAllRTMDetails = async (req, res, next) => {
	const user = req.user;
	const userDetails = await UserHelper.onLogIn(user);
	const { month, year, sendMail } = req.query;
	getAllPatientRTMDetails(month || null, year || null, sendMail || true, userDetails)
		.then((response) => res.json(response))
		.catch((err) => next(err));
};

export const getValidGames = async (req, res, next) => {
	const { isTherapist } = req.user;
	const patientId = isTherapist ? req.body.patientId : req.user.patientId;
	PatientHelper.getValidGames(patientId)
		.then((validGames) => res.json(validGames))
		.catch((err) => {
			next(err);
		});
};

export const updatePatientCameraAvailability = (req, res, next) => {
	const { patientId, hasCamera } = req.body;

	PatientHelper.updatePatientCameraAvailability(patientId, hasCamera)
		.then((updatedPatient) => res.json(updatedPatient))
		.catch((err) => {
			next(err);
		});
};

export const updatePatientMobileAvailability = (req, res, next) => {
	const { patientId, hasMobile } = req.body;

	PatientHelper.updatePatientMobileAvailability(patientId, hasMobile)
		.then((updatedPatient) => res.json(updatedPatient))
		.catch((err) => {
			next(err);
		});
};

export const getActive = (req: Request, res: Response, next: NextFunction) => {
	const { id } = req.params;
	PatientHelper.getPatientById(+id)
		.then((activePatient) => res.json(activePatient))
		.catch((err) => next(err));
};

export const updatePatient = (req, res, next) => {
	const { id, ...patient } = req.body;
	const user = req.user;
	PatientHelper.updatePatient(id, patient)
		.then(async (updatedPatient) => {
			const oldValues = ActivityLogHelper.getOnlyOldKeys(updatedPatient);
			await ActivityLogHelper.createLog(
				user?.id,
				updatedPatient.user_id,
				TABLE_NAME.PATIENT,
				LogAction.Update,
				updatedPatient?.id,
				oldValues,
				convertKeysToSnakeCase(patient)
			);
			res.json(updatedPatient);
		})
		.catch((err) => {
			next(err);
		});
};

export const resetPassword = async (req, res, next) => {
	const { patientId, setDefaultPassword } = req.body;
	const patient = await PatientHelper.getPatientById(patientId);
	const user = await UserHelper.getUserById(patient.user_id);

	UserHelper.resetPassword(user, setDefaultPassword)
		.then(() => res.json({ status: 'OK' }))
		.catch((err) => res.status(403).json({ message: err }));
};

export const getAllInactive = (req, res, next) => {
	PatientHelper.getAllInactive()
		.then((inactivePatients) => res.json(inactivePatients))
		.catch((err) => next(err));
};

export const activatePatient = (req, res, next) => {
	const { patientId } = req.body;
	PatientHelper.activatePatient(patientId)
		.then((patient) => res.json(patient))
		.catch((err) => next(err));
};

export const getFeedbackQuestions = (req: Request, res: Response, next: NextFunction) => {
	FeedbackHelper.getFeedbackQuestions()
		.then((questions) => {
			if (!questions || questions.length === 0) {
				return res.status(404).json({ message: 'No feedback questions found.' });
			}
			res.json(questions);
		})
		.catch((err) => next(err));
};

export const updateUserTermsConditions = (req, res, next) => {
	const { id, date_agreed_terms } = req.body;
	const user = req.user;
	UserHelper.updateUserTermsConditions(id, { date_agreed_terms })
		.then(async (updatedUser) => {
			await ActivityLogHelper.createLog(
				user?.id,
				updatedUser.id,
				TABLE_NAME.USER,
				LogAction.Update,
				updatedUser.id,
				null,
				{ date_agreed_terms }
			);
			res.json(updatedUser);
		})
		.catch((err) => {
			next(err);
		});
};

export const createPatientMetaData = (req, res, next) => {
	const userId = req.user.id;

	PatientMetaDataModel.createPatientMetaData(userId, req.body)
		.then((createdGameMetaData) => res.json(createdGameMetaData))
		.catch((err) => next(err));
};
