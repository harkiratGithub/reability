import * as dotenv from 'dotenv';
dotenv.config();

export default class AwsService {
	static s3;

	createAwsInstance = () => {
		const AWS = require('aws-sdk');
		AWS.config.update({
			apiVersion: '2006-03-01',
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		});

		AwsService.s3 = new AWS.S3();
		return AwsService.s3;
	};

	getInstance() {
		if (!AwsService.s3) {
			AwsService.s3 = this.createAwsInstance();
		}
		return AwsService.s3;
	}

	uploadImage(imageKey, image, bucketName) {
		return new Promise((resolve, reject) => {
			if (!AwsService.s3) {
				AwsService.s3 = this.getInstance();
			}
			const params = {
				Bucket: bucketName,
				Key: imageKey,
				Body: image,
			};

			AwsService.s3.upload(params, (err, data) => {
				if (err) {
					reject(err);
				}
				resolve(data.Location);
			});
		});
	}

	deleteImage(imageKey, bucketName) {
		return new Promise((resolve, reject) => {
			if (!AwsService.s3) {
				AwsService.s3 = this.getInstance();
			}

			const params = {
				Bucket: bucketName,
				Key: imageKey,
			};

			AwsService.s3.deleteObject(params, (err, data) => {
				if (err) {
					reject(err);
				}
				resolve('');
			});
		});
	}
}
