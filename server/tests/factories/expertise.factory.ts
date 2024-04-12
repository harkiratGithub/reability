import faker from 'faker';
import { TABLE_NAME } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';
import { createProfession } from './profession.factory';

export const createExpertise = async (maxPatients = null, duration = null) => {
	if (!maxPatients) {
		maxPatients = faker.datatype.number({ min: 1, max: 4 });
	}
	if (!duration) {
		duration = faker.datatype.number({ min: 1, max: 60 });
	}
	const profession = await createProfession();
	const expertiseId = faker.datatype.number();
	const expertiseParams = {
		id: expertiseId,
		name: faker.random.word(),
		profession_id: profession.profession_id,
		max_patients: maxPatients,
		duration,
		active: true,
	};
	await BaseModel.insertRow(TABLE_NAME.EXPERTISE, expertiseParams);
	delete expertiseParams['id'];
	return { ...expertiseParams, expertise_id: expertiseId };
};
