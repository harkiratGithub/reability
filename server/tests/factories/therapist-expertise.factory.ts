import faker from 'faker';
import { TABLE_NAME } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';
import { createExpertise } from './expertise.factory';
import { createTherapist } from './therapist.factory';

export const createTherapistExpertise = async (therapist = null, expertise = null, max_patients = null) => {
	const therapistExpertiseId = faker.datatype.number();
	if (!therapist) {
		therapist = await createTherapist();
	}
	if (!expertise) {
		expertise = await createExpertise();
	}
	const therapistExpertiseParams = {
		id: therapistExpertiseId,
		therapist_id: therapist.therapist_id,
		expertise_id: expertise.expertise_id,
		max_patients: max_patients || 100,
	};
	await BaseModel.insertRow(TABLE_NAME.THERAPIST_EXPERTISE, therapistExpertiseParams);
	delete therapistExpertiseParams['id'];
	return { ...therapistExpertiseParams, therapist_expertise_id: therapistExpertiseId };
};
