import AwsService from '../services/aws.service';
import * as ImageModel from '../models/image.model';

export const createImage = async (imageKey, imageContent, bucketName, client = null) => {
	try {
		const aws = new AwsService();
		const url = await aws.uploadImage(imageKey, imageContent.buffer, bucketName);
		const row = await ImageModel.addImage(imageKey, url, client);
		return row.id;
	} catch (err) {
		throw err;
	}
};

export const deleteImage = async (id, bucketName, client = null) => {
	try {
		const rows = await ImageModel.deleteImage(id, client);
		const aws = new AwsService();
		await aws.deleteImage(rows[0].key, bucketName);
	} catch (err) {
		throw err;
	}
};
