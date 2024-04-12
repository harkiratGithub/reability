import * as TherapistModel from '../models/therapist.model';
import * as UserModel from '../models/users.model';
import * as UserHelper from './users.helper';
import * as Encrypt from '../services/encrypt.helper';
import * as BaseModel from '../services/BaseModel.service';
import * as EncryptHelper from '../services/encrypt.helper';
import * as Helper from '../services/util.helper';
import { ROLE } from '../const';
import { reduce } from 'lodash';

export const createTherapist = (therapistData) => {
	const { departmentsIds, expertisesIds } = therapistData;
	const therapistCreationFunc = async (client = null) => {
		const userToSave = {
			email: therapistData.email,
			role: ROLE.THERAPIST,
		};
		const createdUser = await UserHelper.create(userToSave, client);
		const therapistToSave = getCommonData(therapistData, createdUser.id);
		const createdTherapist = await TherapistModel.create(therapistToSave, client);
		await TherapistModel.addTherapistDepartments(createdTherapist, departmentsIds, client);
		await TherapistModel.addTherapistExpertises(createdTherapist, expertisesIds, client);
		return Encrypt.decryptJson(createdTherapist);
	};
	return BaseModel.runAsTransaction(therapistCreationFunc);
};

export const editTherapist = (therapistDataToUpdate, userDataToUpdate) => {
	const { departmentsIds, expertisesIds } = therapistDataToUpdate;
	const therapistEditFunc = async (client = null) => {
		const { id: therapistId, ...therapistData } = therapistDataToUpdate;
		const parsedDataToSave = getCommonData(therapistData);
		const editedTherapist = await TherapistModel.edit(therapistId, parsedDataToSave, client);
		const { user_id: userId } = editedTherapist;
		await UserModel.updateById(userId, userDataToUpdate, client);
		await TherapistModel.deleteTherapistDepartments(therapistId, client);
		await TherapistModel.editTherapistDepartments(editedTherapist, departmentsIds, client);
		await TherapistModel.deleteTherapistExpertises(therapistId, client);
		await TherapistModel.editTherapistExpertises(editedTherapist, expertisesIds, client);
		return Encrypt.decryptJson(editedTherapist);
	};
	return BaseModel.runAsTransaction(therapistEditFunc);
};

export const deleteTherapist = (id) => {
	const therapistDeleteFunc = async (client = null) => {
		const therapist = await TherapistModel.remove([id], client);
		await UserModel.remove([therapist[0].user_id], client);
		await TherapistModel.deleteTherapistDepartments(id, client);
		return therapist[0];
	};
	return BaseModel.runAsTransaction(therapistDeleteFunc);
};

export const getTherapistsSessions = async () => {
	const therapistsSessions = await TherapistModel.getTherapistsSessions();
	const decryptedTherapistsSessions = EncryptHelper.decryptArray(therapistsSessions);
	return decryptedTherapistsSessions;
};

export const getAllActive = async () => {
	try {
		const allTherapists = await TherapistModel.getAllActive();

		return reduce(
			allTherapists,
			(result, value) => {
				const therapist = Encrypt.decryptJson(value);
				const { department_id, department_name, expertise_id, expertise_name, ...therapistWithoutDepartmentId } =
					therapist;
				const existingTherapist = result.find((res) => res.id === value.id);

				if (existingTherapist) {
					if (
						department_id &&
						!existingTherapist.departments_ids.find((departmentId) => departmentId === department_id)
					) {
						existingTherapist.departments_ids.push(department_id);
						existingTherapist.departments_names.push(department_name);
					}
					if (expertise_id && !existingTherapist.expertises_ids.find((expertiseId) => expertiseId === expertise_id)) {
						existingTherapist.expertises_ids.push(expertise_id);
						existingTherapist.expertises_names.push(expertise_name);
					}
				} else {
					if (department_id) {
						therapistWithoutDepartmentId['departments_ids'] = [department_id];
						therapistWithoutDepartmentId['departments_names'] = [department_name];
					} else {
						therapistWithoutDepartmentId['departments_ids'] = [];
						therapistWithoutDepartmentId['departments_names'] = [];
					}
					if (expertise_id) {
						therapistWithoutDepartmentId['expertises_ids'] = [expertise_id];
						therapistWithoutDepartmentId['expertises_names'] = [expertise_name];
					} else {
						therapistWithoutDepartmentId['expertises_ids'] = [];
						therapistWithoutDepartmentId['expertises_names'] = [];
					}
					result.push({
						...therapistWithoutDepartmentId,
						full_name: `${therapist.first_name} ${therapist.last_name}`,
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

const getCommonData = (therapist, userId?) => {
	return {
		first_name: therapist.firstName,
		last_name: therapist.lastName || '',
		identity_number: therapist.identityNumber || '',
		phone: therapist.phone || '',
		therapist_type: therapist.therapistType || '',
		...(userId && { user_id: userId }),
	};
};

export const getTherapistsByExpertise = (expertiseIds) => {
	return TherapistModel.getTherapistsByExpertise(expertiseIds);
};

export const getTherapistById = async (id: number) => {
	return TherapistModel.getTherapistById(id);
};
