import { filter, find, isEmpty, isEqual, map, reduce, groupBy, difference } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import * as PatientModel from '../models/patient.model';
import * as UserModel from '../models/users.model';
import * as GameModel from '../models/game.model';
import * as ActivityLogModel from '../models/activity-log.model';
import { convertKeysToSnakeCase } from '../models/util.model';
import { MAX_NUMBER_OF_PATIENT_CONTACTS } from '../const';

import * as UserHelper from './users.helper';
import * as PatientGameHelper from './patient-game.helper';
import * as EncryptHelper from '../services/encrypt.helper';
import * as Helper from '../services/util.helper';

import { ROLE, TABLE_NAME } from '../const';
import { updateRTM } from '../models/rtm.model';

export const createPatient = async (patientData, patientContacts) => {
	const { departmentsIds } = patientData;
	const patientCreationFunc = async (client = null) => {
		try {
			const userToSave = {
				email: patientData.email,
				role: patientData.isPatientVideo ? ROLE.VIDEO_PATIENT : ROLE.PATIENT,
			};
			const instituteName = await UserHelper.getInstituteNameFromDepartments(departmentsIds);
		const createdUser = await UserHelper.create(userToSave, client, instituteName);
			const patientToSave = getCommonData(patientData, createdUser.id);
			const { disabledSkeleton } = patientData;
			const createdPatient = await PatientModel.create(
				{
					...patientToSave,
					disabled_skeleton: !!disabledSkeleton,
				},
				client
			);
			const patientEncryptedContacts = map(patientContacts, (contact) => {
				return { ...EncryptHelper.encryptJson(contact), patient_id: createdPatient.id };
			});
			await PatientModel.updatePatientContacts(createdPatient.id, patientEncryptedContacts, client);
			await PatientGameHelper.createAllGamesToPatient(createdPatient.id, client);
			await PatientModel.addPatientDepartments(createdPatient, departmentsIds, client);

			const departmentNames = await getDepartmentNamesById(departmentsIds, client);
			const decryptedResult = EncryptHelper.decryptJson(createdPatient);
			return { ...decryptedResult, departmentNames };
		} catch (err) {
			throw err;
		}
	};
	return BaseModel.runAsTransaction(patientCreationFunc);
};

export const editPatient = async (patientDataToUpdate, userDataToUpdate, patientContacts) => {
	const { departmentsIds } = patientDataToUpdate;
	const patientEditFunc = async (client = null) => {
		const { patientId, ...patientData } = patientDataToUpdate;
		const oldPatient = await getPatientById(patientId);
		const parsedDataToSave = getCommonData(patientData);
		const { disabledSkeleton } = patientData;
		const editedPatient = await PatientModel.edit(
			patientId,
			{
				...parsedDataToSave,
				disabled_skeleton: !!disabledSkeleton,
			},
			client
		);
		const { user_id: userId } = editedPatient;
		await UserModel.updateById(
			userId,
			{
				...userDataToUpdate,
				role: patientData.isPatientVideo ? ROLE.VIDEO_PATIENT : ROLE.PATIENT,
			},
			client
		);
		const patientEncryptedContacts = map(patientContacts, (contact) => {
			return EncryptHelper.encryptJson(contact);
		});
		const oldDepartments = await PatientModel.deletePatientDepartments(patientId, client);
		const newDepartments = await PatientModel.createPatientDepartments(editedPatient, departmentsIds, client);

		const updatedPatient = EncryptHelper.decryptJson(editedPatient);
		let { created_at, updated_at, active, disabled_skeleton, ...patientChanges } = getOnlyChanges(
			updatedPatient,
			oldPatient
		);
		let oldPatientValues = getOldPatientValues(oldPatient, patientChanges);
		const oldDepartmentIds = map(oldDepartments, (department) => department.department_id);
		const newDepartmentIds = map(newDepartments, (department) => department.department_id);
		const diffDepartmentsIds = isEqual(newDepartmentIds, oldDepartmentIds);
		if (!diffDepartmentsIds) {
			const oldDepartmentNames = await getDepartmentNamesById(
				map(oldDepartments, (department: any) => department.department_id),
				client
			);
			oldPatientValues = { ...oldPatientValues, department_names: oldDepartmentNames };
			const newDepartmentNames = await getDepartmentNamesById(
				map(newDepartments, (department: any) => department.department_id),
				client
			);
			patientChanges = { ...patientChanges, department_names: newDepartmentNames };
		}
		const [newContacts, oldContacts] = await PatientModel.updatePatientContacts(
			patientId,
			patientEncryptedContacts,
			client
		);
		let encryptedPatientChanges = EncryptHelper.encryptJson(patientChanges);
		let encryptedOldPatientValues = EncryptHelper.encryptJson(oldPatientValues);

		const preparedOldPatientContacts = getPreparedContactArrayForDiff(oldContacts);
		const preparedNewPatientContacts = getPreparedContactArrayForDiff(newContacts);
		const oldContactsDiff = getContactsDiff(preparedOldPatientContacts, preparedNewPatientContacts);
		const newContactsDiff = getContactsDiff(preparedNewPatientContacts, preparedOldPatientContacts);

		if (!isEmpty(oldContactsDiff) && !isEmpty(newContactsDiff)) {
			const encryptedOldPatientContacts = flattenAndEncryptPatientContacts(oldContactsDiff, false);
			const encryptedNewPatientContacts = flattenAndEncryptPatientContacts(newContactsDiff, false);
			encryptedPatientChanges = { ...encryptedPatientChanges, ...encryptedNewPatientContacts };
			encryptedOldPatientValues = { ...encryptedOldPatientValues, ...encryptedOldPatientContacts };
		}
		return [updatedPatient, encryptedPatientChanges, encryptedOldPatientValues];
	};
	return BaseModel.runAsTransaction(patientEditFunc);
};

export const deletePatient = async (id) => {
	const patientDeleteFunc = async (client = null) => {
		const removedPatient = await PatientModel.remove([id], client);
		const { user_id } = removedPatient[0];
		await UserModel.remove([user_id], client);
	};
	return BaseModel.runAsTransaction(patientDeleteFunc);
};

export const getAllActive = async () => {
	try {
		const allPatients = await PatientModel.getAllActive();

		return reduce(
			allPatients,
			(result, value) => {
				const patient = EncryptHelper.decryptJson(value);
				const { department_id, department_name, ...patientWithoutDepartmentId } = patient;
				const existingPatient = result.find((res) => res.id === value.id);

				if (existingPatient) {
					if (
						department_id &&
						!existingPatient.departments_ids.find((departmentId) => departmentId === department_id)
					) {
						existingPatient.departments_ids.push(department_id);
						existingPatient.departments_names.push(department_name);
					}
				} else {
					if (department_id) {
						patientWithoutDepartmentId['departments_ids'] = [department_id];
						patientWithoutDepartmentId['departments_names'] = [department_name];
					} else {
						patientWithoutDepartmentId['departments_ids'] = [];
						patientWithoutDepartmentId['departments_names'] = [];
					}
					result.push({
						...patientWithoutDepartmentId,
						full_name: `${patient.first_name} ${patient.last_name}`,
					});
				}
				return result;
			},
			[]
		);
	} catch (err) {
		throw err;
	}
};

export const getValidGames = async (patientId) => {
	return GameModel.getValidGameForPatient(patientId);
};

export const getActivities = async (therapistId, startTime, endTime) => {
	try {
		const res = await Promise.all([
			PatientModel.getPatientsActivities(therapistId, startTime, endTime),
			UserHelper.getOpenPeers(therapistId),
		]);
		const patientIds = res[0].map((patient) => patient.id);
		const sessions = await PatientModel.getPatientRelevantSessions(patientIds, startTime, endTime);
		let allPatients = [];
		let patientsIdsWithSessions = [];
		for (let item of sessions) {
			allPatients.push({
				...item,
				...res[0].find((patient) => patient['id'] == item['patient_id']),
			});
			if (!patientsIdsWithSessions.includes(item['patient_id'])) {
				patientsIdsWithSessions.push(item['patient_id']);
			}
		}
		const patientsIdsWithoutSessions = difference(patientIds, patientsIdsWithSessions);
		for (let id of patientsIdsWithoutSessions) {
			const user = res[0].find((patient) => patient['id'] == id);
			allPatients.push(user);
		}
		const contacts = await BaseModel.findByIds(TABLE_NAME.PATIENT_CONTACTS, 'patient_id', patientIds);
		const contactsByPatientId = groupBy(contacts, 'patient_id');
		// const rtmList = await BaseModel.itemsInArray(TABLE_NAME.PATIENT_DEPARTMENTS, 'department_id', ['3', '172']);
		const rtmList = await PatientModel.getRTMList();
		const newActivities = allPatients.map((patient) => {
			const patientPeer = res[1].find((x) => patient.user_id === x.user_id);
			const { duration, ...restPatient } = patient;
			const decryptedPatient = EncryptHelper.decryptJson(restPatient);
			const decryptedContacts =
				contactsByPatientId[patient.id.toString()] && contactsByPatientId[patient.id.toString()].length
					? EncryptHelper.decryptArray(contactsByPatientId[patient.id.toString()])
					: [];
			const durationString = Helper.buildPostgresInterval(duration);
			const newPatient = {
				...decryptedPatient,
				duration: durationString,
				full_name: `${decryptedPatient.first_name} ${decryptedPatient.last_name}`,
				created_at: decryptedPatient.created_at
			};
			const isRTM = rtmList?.find((rtm) => rtm.patient_id == patient.id) ? true : false;
			return patientPeer
				? {
						...newPatient,
						status: patientPeer.peerStatus,
						contacts: decryptedContacts,
						isRTM,
				  }
				: { ...newPatient };
		});
		return newActivities;
	} catch (err) {
		throw new Error(`${err}`);
	}
};

export const getPatientActivities = async (patientId, startTime, endTime) => {
	try {
		const res = await Promise.all([
			PatientModel.getPatientsActivitiesData(patientId, startTime, endTime),
			UserHelper.getOpenPeers(patientId),
		]);
		const patientIds = res[0].map((patient) => patient.id);
		const sessions = await PatientModel.getPatientRelevantSessions(patientIds, startTime, endTime);
		let allPatients = [];
		let patientsIdsWithSessions = [];
		for (let item of sessions) {
			allPatients.push({
				...item,
				...res[0].find((patient) => patient['id'] == item['patient_id']),
			});
			if (!patientsIdsWithSessions.includes(item['patient_id'])) {
				patientsIdsWithSessions.push(item['patient_id']);
			}
		}
		const patientsIdsWithoutSessions = difference(patientIds, patientsIdsWithSessions);
		for (let id of patientsIdsWithoutSessions) {
			const user = res[0].find((patient) => patient['id'] == id);
			allPatients.push(user);
		}
		const contacts = await BaseModel.findByIds(TABLE_NAME.PATIENT_CONTACTS, 'patient_id', patientIds);
		const contactsByPatientId = groupBy(contacts, 'patient_id');
		const newActivities = allPatients.map((patient) => {
			const patientPeer = res[1].find((x) => patient.user_id === x.user_id);
			const { duration, ...restPatient } = patient;
			const decryptedPatient = EncryptHelper.decryptJson(restPatient);
			const decryptedContacts =
				contactsByPatientId[patient.id.toString()] && contactsByPatientId[patient.id.toString()].length
					? EncryptHelper.decryptArray(contactsByPatientId[patient.id.toString()])
					: [];
			const durationString = Helper.buildPostgresInterval(duration);
			const newPatient = {
				...decryptedPatient,
				duration: durationString,
				full_name: `${decryptedPatient.first_name} ${decryptedPatient.last_name}`,
			};

			return patientPeer
				? {
						...newPatient,
						status: patientPeer.peerStatus,
						contacts: decryptedContacts,
				  }
				: { ...newPatient };
		});
		return newActivities;
	} catch (err) {
		throw new Error(`${err}`);
	}
};

export const updatePatientCameraAvailability = async (id, has_camera, client = null) =>
	await PatientModel.updatePatientCameraAvailability(id, has_camera, client);

export const updatePatientMobileAvailability = async (id, is_mobile, client = null) =>
	await PatientModel.updatePatientMobileAvailability(id, is_mobile, client);

export const updatePatientAvailabilityStatus = async (id, availabilityStatus, client = null) =>
	await PatientModel.updatePatientAvailabilityStatus(id, availabilityStatus, client);

export const updatePatient = async (patientId: number, patient: PatientModel.IPatientModel, client = null) => {
	const updatedPatient = await BaseModel.updateRowByField(
		TABLE_NAME.PATIENT,
		EncryptHelper.encryptJson(convertKeysToSnakeCase(patient)),
		'id',
		patientId,
		client,
		true
	);
	return updatedPatient;
};

export const getPatientById = async (id: number) => {
	const [encryptedPatient, encryptedPatientContacts] = await Promise.all([
		PatientModel.getPatientById(id),
		PatientModel.getPatientContacts(id),
	]);
	const decryptedPatientContacts = Object.values(encryptedPatientContacts).map((contactDetails) =>
		EncryptHelper.decryptJson(contactDetails)
	);
	const decryptedPatient = EncryptHelper.decryptJson(encryptedPatient);

	const encryptedPatientLog = await ActivityLogModel.getLog(decryptedPatient.user_id);

	const decryptedPatientLog = Object.values(encryptedPatientLog).map((logEntry: any) => ({
		...EncryptHelper.decryptJson(logEntry),
		old_values: EncryptHelper.decryptJson(logEntry.old_values),
		new_values: EncryptHelper.decryptJson(logEntry.new_values),
	}));

	return { ...decryptedPatient, contactDetails: decryptedPatientContacts, patientLog: decryptedPatientLog };
};

const getCommonData = (patient, userId?) => {
	return {
		first_name: patient.firstName,
		last_name: patient.lastName || '',
		identity_number: patient.identityNumber || '',
		phone: patient.phone || '',
		tech_issue: patient.tech_issue,
		tech_reason: patient.tech_reason,
		notification_email: patient.notification_email,
		login_notification_email: patient.login_notification_email,
		rustdesk_id:patient.rustdesk_id,
		suspend: patient.suspend,
		referral: patient.referral,
		...(userId && { user_id: userId }),
	};
};

export const flattenAndEncryptPatientContacts = (patientContacts: any[], needsEncryption: boolean) => {
	return reduce(
		patientContacts,
		(result, contact, indx) => {
			const { phone, email } = needsEncryption ? EncryptHelper.encryptJson(contact) : contact;
			let { full_name } = needsEncryption ? EncryptHelper.encryptJson(contact) : contact;
			full_name = full_name.trim();
			if (patientContacts.length > 2) {
				return {
					[`contact_full_name${indx}`]: full_name,
					[`contact_phone${indx}`]: phone,
					[`contact_email${indx}`]: email,
				};
			}
			if (indx === 0) {
				return { contact_full_name: full_name, contact_phone: phone, contact_email: email };
			}
			return {
				...result,
				additional_contact_full_name: full_name,
				additional_contact_phone: phone,
				additional_contact_email: email,
			};
		},
		{}
	);
};

export const getAllInactive = async () => {
	const inactivePatients = await PatientModel.getAllInactive();
	return map(inactivePatients, (patient) => {
		const decryptedPatient = EncryptHelper.decryptJson(patient);
		return {
			...decryptedPatient,
			full_name: `${decryptedPatient.first_name} ${decryptedPatient.last_name}`,
		};
	});
};

export const activatePatient = async (patientId: number, client = null) => {
	return await PatientModel.activatePatient(patientId, client);
};

export const getPatientUserId = async (patientId: number) => {
	return await PatientModel.getPatientUserId(patientId);
};

const getOnlyChanges = (updatedPatient: any, oldPatient: any): Record<string, any> =>
	reduce(
		updatedPatient,
		(sum, value, key) => {
			if (updatedPatient[key] === oldPatient[key]) {
				return sum;
			}
			return { ...sum, [key]: value };
		},
		[]
	);
const getOldPatientValues = (patient, neededValues) =>
	reduce(neededValues, (result, value, key) => ({ ...result, [`${key}`]: patient[key] }), {});

const getDepartmentNamesById = async (departmentsIds: number[], client = null): Promise<string> => {
	if (departmentsIds.length === 0) {
		return '';
	}

	const departments = await BaseModel.itemsInArray(TABLE_NAME.DEPARTMENT, 'id', departmentsIds, client);
	return reduce(departments, (result, curr) => (result += `${curr.name} `), '');
};

const getContactsDiff = (source, target) =>
	filter(source, (s) => {
		if (
			!find(target, (t) => {
				return s.full_name === t.full_name && s.phone === t.phone && s.email === t.email;
			})
		) {
			return true;
		}
		return false;
	});

const getPreparedContactArrayForDiff = (contacts: any[]) => {
	for (let i = contacts.length; i < MAX_NUMBER_OF_PATIENT_CONTACTS; i++) {
		contacts.push({
			id: 0,
			patient_id: 0,
			full_name: new Array(i).fill(' ').join(''),
			phone: '',
			email: '',
		});
	}
	return contacts;
};

export const updatePatientRustdeskId = async (id, rustdesk_id, client = null) =>
	await PatientModel.updatePatientRustdeskId(id, rustdesk_id, client);


export const getPatientRustdeskId = async (patientId: number) => {
	if (!patientId) {
	  throw new Error("Patient ID is not valid.");
	}
	return await PatientModel.getPatientRustdeskId(patientId);
  };
  