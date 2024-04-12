import faker from 'faker';
import { TABLE_NAME } from '../../const';
import * as BaseModel from '../../services/BaseModel.service';

export const createImage = async () => {
	const id = faker.datatype.number();
	const imageParams = {
		id,
		key: faker.random.word(),
		url: faker.image.imageUrl(),
	};
	await BaseModel.insertRow(TABLE_NAME.IMAGE, imageParams);

	return { image_id: id };
};
