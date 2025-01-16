import * as DepartmentModel from '../models/department.model';
import * as UserModel from '../models/users.model';
import * as PatientModel from '../models/patient.model';
import * as TherapistModel from '../models/therapist.model';
import * as BaseModel from '../services/BaseModel.service';
import * as PatientHelper from '../helpers/patient.helper';
import * as TherapistHelper from '../helpers/therapist.helper';

export const createDepartment = (department) => {
	return DepartmentModel.create(department);
};

export const deleteDepartment = (id) => {
	return deleteDepartments([id]);
};

export const deleteDepartmentFunctionality = async (arrayOfIds, client) => {
	let patients = await PatientHelper.getAllActive();
	let therapists = await TherapistHelper.getAllActive();

	let removedPatients = await DepartmentModel.removeDepartmentsFromPatient(arrayOfIds, client);
	let removedTherapists = await DepartmentModel.removeDepartmentsFromTherapist(arrayOfIds, client);

	if (patients.length > 0) {
		patients.map((patient) => {
			removedPatients.map((removedPatient) => {
				if (patient.id === removedPatient.patient_id) {
					const index = patient.departments_ids.indexOf(removedPatient.department_id);
					if (index > -1) {
						patient.departments_ids.splice(index, 1);
					}
				}
			});
		});
	}

	if (therapists.length > 0) {
		therapists.map((therapist) => {
			const removedTherapist = removedTherapists.find(
				(removedTherapist) => therapist.id === removedTherapist.therapist_id
			);
			if (removedTherapist) {
				const index = therapist.departments_ids.indexOf(removedTherapist.department_id);
				if (index > -1) {
					therapist.departments_ids.splice(index, 1);
				}
			}
		});
	}
	removedTherapists = therapists.filter((therapist) => therapist.departments_ids.length === 0);
	removedPatients = patients.filter((patient) => patient.departments_ids.length === 0);
	if (removedTherapists.length > 0) {
		await TherapistModel.remove(
			removedTherapists.map((x) => x.id),
			client
		);
		await UserModel.remove(
			removedTherapists.map((x) => x.user_id),
			client
		);
	}
	if (removedPatients.length > 0) {
		await PatientModel.remove(
			removedPatients.map((x) => x.id),
			client
		);
		await UserModel.remove(
			removedPatients.map((x) => x.user_id),
			client
		);
	}
	await DepartmentModel.updateDepartmentNotActive(arrayOfIds, client);
};

export const deleteDepartments = (arrayOfIds) => {
	const deleteDepartmentFunc = async (client = null) => {
		await deleteDepartmentFunctionality(arrayOfIds, client);
	};
	return BaseModel.runAsTransaction(deleteDepartmentFunc);
};

export const getAll = () => {
	return DepartmentModel.getAll();
};

export const getAllTherapistDepartment = async (user) => {
	try {
		if (user.role === 'therapist') {
			const therapistDepartments = await DepartmentModel.getTherapistByDepartmentId([user.therapistId]);
			const departmentIds = therapistDepartments.map((item) => item.department_id);
			return departmentIds.length > 0
				? DepartmentModel.getAllByIdsAndInstitute(departmentIds, user.therapistId, null)
				: [];
		} else {
			return [];
		}
	} catch (error) {
		throw error;
	}
};
