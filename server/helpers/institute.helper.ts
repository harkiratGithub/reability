import * as BaseModel from '../services/BaseModel.service';
import * as InstituteModel from '../models/institute.model';
import * as ImageHelper from '../helpers/image.helper';
import * as DepartmentHelper from '../helpers/department.helper';
import { TABLE_NAME } from '../const';

export const createInstitute = async (institute, departments, file = undefined) => {
	const instituteCreationFunc = async (client = null) => {
		try {
			let imgId;
			if (file) {
				imgId = await ImageHelper.createImage(`${file.originalname}`, file, process.env.AWS_IMAGE_BUCKET_PATH, client);
			}
			const createdInstitute = await InstituteModel.create(
				{
					...institute,
					...(imgId && { image_id: imgId }),
				},
				client
			);
			const newDepartments = getCreatedInstituteDepartments(departments, createdInstitute.id);
			const createdDepartments = await BaseModel.insertBulk(TABLE_NAME.DEPARTMENT, newDepartments, client);
			return {
				institute: createdInstitute,
				departments: createdDepartments,
			};
		} catch (err) {
			throw err;
		}
	};
	return BaseModel.runAsTransaction(instituteCreationFunc);
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

function getCreatedInstituteDepartments(departments, institutedId) {
	return Array.isArray(departments)
		? departments.map((department) => ({
				name: department.name,
				institute_id: institutedId,
		  }))
		: [];
}

function getEditedInstituteDepartments(departments, instituteId) {
	return Array.isArray(departments)
		? departments
				.filter((department) => !department.id)
				.map((department) => ({
					name: department.name,
					institute_id: instituteId,
				}))
		: [];
}

export const editInstitute = async (institute, file, imageId, departments) => {
	const instituteEditFunc = async (client = null) => {
		const updatedImgId = await handleEditImage(file, imageId, client);
		const { id, ...data } = institute;
		const instituteToUpdate = {
			...data,
			...(updatedImgId && { image_id: updatedImgId }),
		};
		const updatedInstitute = await InstituteModel.edit(id, instituteToUpdate, client);

		// save new departments
		const newDepartments = getEditedInstituteDepartments(departments, updatedInstitute.id);
		const createdDepartments = await BaseModel.insertBulk(TABLE_NAME.DEPARTMENT, newDepartments, client);

		return {
			institute: updatedInstitute,
			newDepartments: createdDepartments,
		};
	};
	return BaseModel.runAsTransaction(instituteEditFunc);
};

export const deleteInstitute = async (id) => {
	const instituteDeleteFunc = async (client = null) => {
		const departments = await InstituteModel.getDepartmentByInstitute(id, client);
		const institute = await InstituteModel.updateInstituteNotActive(id, client);
		await DepartmentHelper.deleteDepartmentFunctionality(
			departments.map((x) => x.id),
			client
		);
		if (process.env.NODE_ENV !== 'test') {
			await ImageHelper.deleteImage(institute.image_id, process.env.AWS_IMAGE_BUCKET_PATH, client);
		}
	};
	return BaseModel.runAsTransaction(instituteDeleteFunc);
};

export const getAll = async () => {
	return InstituteModel.getAll();
};
