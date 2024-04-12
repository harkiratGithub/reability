import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import AwsService from '../services/aws.service';

export const addUploadedGameRelatedImage = async (file) => {
	const extention = file.substring('data:image/'.length, file.indexOf(';base64'));
	const fileName = `${uuidv4()}.${extention}`;

	file = file.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
	const fileBuffer = Buffer.from(file, 'base64');

	try {
		const aws = new AwsService();
		const url = await aws.uploadImage(fileName, fileBuffer, process.env.AWS_GAMES_IMAGES_BUCKET_PATH);
		return url;
	} catch (err) {
		throw err;
	}
};

export const addAdminRelatedImage = async (file, name) => {
	const extention = file.substring('data:image/'.length, file.indexOf(';base64'));
	const fileName = `${uuidv4()}.${extention}`;

	file = file.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
	const fileBuffer = Buffer.from(file, 'base64');

	try {
		const aws = new AwsService();

		const url = await aws.uploadImage(fileName, fileBuffer, process.env.AWS_GAMES_IMAGES_BUCKET_PATH);
		return { url, name };
	} catch (err) {
		throw err;
	}
};
