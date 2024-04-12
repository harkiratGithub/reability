import faker from 'faker';
import { TABLE_NAME } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';
import { createImage } from './image.factory';

export const createProfession = async () => {
	const image = await createImage();
	const professionId = faker.datatype.number();
	const professionParams = {
		id: professionId,
		name: faker.name.firstName(),
		image_id: image.image_id,
	};
	await BaseModel.insertRow(TABLE_NAME.PROFESSION, professionParams);
	delete professionParams['id'];
	return { ...professionParams, profession_id: professionId };
};
