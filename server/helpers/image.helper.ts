/*import AwsService from '../services/aws.service';
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
*/

import { SharedKeyCredential, StorageURL, ServiceURL, ContainerURL, BlockBlobURL, Aborter } from '@azure/storage-blob';
import * as ImageModel from '../models/image.model';
import { v4 as uuidv4 } from 'uuid';

export const createImage = async (imageKey, imageContent, bucketName, client = null) => {
    try {
        const extension = imageContent.mimetype.split('/')[1];
        const fileName = `${uuidv4()}.${extension}`;
		const fileBuffer = imageContent.buffer; 
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = bucketName;
        const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceURL = new ServiceURL(
            `https://${accountName}.blob.core.windows.net`,
            pipeline
        );
        const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);

        const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);
        const aborter = Aborter.timeout(30 * 60 * 1000); // 30 minutes timeout
        await blockBlobURL.upload(aborter, fileBuffer, fileBuffer.length);

        // Construct the URL for the uploaded file
        const fileURL = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}`;
		console.log("======fileurl=====",fileURL);

        // Add the image record to the database (ImageModel)
        const row = await ImageModel.addImage(imageKey, fileURL, client);
		console.log("======row.id=====",row.id);
        return row.id;
    } catch (err) {
        console.error("Error creating image:", err.message);
        throw err;
    }
};

export const deleteImage = async (id, bucketName, client = null) => {
    try {
        // Fetch image record from the database
        const rows = await ImageModel.deleteImage(id, client);

        // Azure Storage credentials and container details
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = bucketName;
		const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceURL = new ServiceURL(
            `https://${accountName}.blob.core.windows.net`,
            pipeline
        );
        const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);

        // Extract file name from URL
        const fileName = rows[0].key.split('/').pop();

        // Create a BlockBlobURL to delete the file
        const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);
        await blockBlobURL.delete(Aborter.none); // Delete the file

    } catch (err) {
        console.error("Error deleting image:", err.message);
        throw err;
    }
};