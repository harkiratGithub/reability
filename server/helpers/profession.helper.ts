import * as BaseModel from '../services/BaseModel.service';
import * as ProfessionModel from '../models/profession.model';
import * as ImageHelper from '../helpers/image.helper';
import { TABLE_NAME } from '../const';

export const createProfession = async (profession, expertises, file = undefined) => {
	const professionCreationFunc = async (client = null) => {
		try {
			let imgId;
			if (file) {
				imgId = await ImageHelper.createImage(`${file.originalname}`, file, process.env.AWS_IMAGE_BUCKET_PATH, client);
			}
			const createdProfession = await ProfessionModel.create(
				{
					...profession,
					...(imgId && { image_id: imgId }),
				},
				client
			);
			const newExpertises = getCreatedProfessionExpertises(expertises, createdProfession.id);
			const createdExpertises = await BaseModel.insertBulk(TABLE_NAME.EXPERTISE, newExpertises, client);
			return {
				profession: createdProfession,
				expertises: createdExpertises,
			};
		} catch (err) {
			throw err;
		}
	};
	return BaseModel.runAsTransaction(professionCreationFunc);
};

export const handleEditImage = async (file, existingImageId, client = null) => {
	let updatedImgId;
	if (file) {
		// if already has image delete it
		if (existingImageId && existingImageId !== 'null') {
			await ImageHelper.deleteImage(existingImageId, process.env.AWS_IMAGE_BUCKET_PATH, client);
		}
		// upload the new image
		updatedImgId = await ImageHelper.createImage(
			`${file.originalname}`,
			file,
			process.env.AWS_IMAGE_BUCKET_PATH,
			client
		);
	}
	return updatedImgId;
};

function getCreatedProfessionExpertises(expertises, professionId) {
	return Array.isArray(expertises)
		? expertises.map((expertise) => ({
				name: expertise.name,
				profession_id: professionId,
				max_patients: expertise.max_patients,
				duration: expertise.duration,
		  }))
		: [];
}

function getEditedProfessionExpertises(expertises, professionId) {
	return Array.isArray(expertises)
		? expertises
				.filter((expertise) => !expertise.id)
				.map((expertise) => ({
					name: expertise.name,
					profession_id: professionId,
					max_patients: expertise.max_patients,
					duration: expertise.duration,
				}))
		: [];
}

export const editProfession = async (profession, file, imageId, expertises) => {
	const professionEditFunc = async (client = null) => {
		const updatedImgId = await handleEditImage(file, imageId, client);
		const { id, ...data } = profession;
		const professionToUpdate = {
			...data,
			...(updatedImgId && { image_id: updatedImgId }),
		};
		const updatedProfession = await ProfessionModel.edit(id, professionToUpdate, client);

		// save new expertises
		const newExpertises = getEditedProfessionExpertises(expertises, updatedProfession.id);
		const createdExpertises = await BaseModel.insertBulk(TABLE_NAME.EXPERTISE, newExpertises, client);

		return {
			profession: updatedProfession,
			newExpertises: createdExpertises,
		};
	};
	return BaseModel.runAsTransaction(professionEditFunc);
};

export const getAll = async () => {
	return ProfessionModel.getAll();
};

export const getExpertiseByProfession = async (professionId, client = null) => {
	return ProfessionModel.getExpertiseByProfession(professionId, client);
};
