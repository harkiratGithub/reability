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

import { v4 as uuidv4 } from "uuid";
import { SharedKeyCredential, StorageURL, ServiceURL, ContainerURL, BlockBlobURL, Aborter } from "@azure/storage-blob";
import * as ImageModel from '../models/image.model';

// Function to resize and crop the image
/*const resizeAndCropImage = async (imageBuffer: Buffer, width: number, height: number) => {
    try {
        const image = await Jimp.read(imageBuffer);
        image
            .resize(width, height) // Resizes the image
            .background(0x000000FF); // Sets the black background for empty areas

        return await image.getBufferAsync(Jimp.MIME_PNG); // Returns processed image as Buffer
    } catch (err) {
        console.error("Error resizing and cropping image:", err.message);
        throw err;
    }
};
*/

export const createImage = async (
    imageKey: string,
    imageContent: { buffer: Buffer; mimetype: string },
    bucketName: string,
    client = null
) => {
    try {
        const extension = imageContent.mimetype.split('/')[1];
        const fileName = `${uuidv4()}.${extension}`;
        let fileBuffer = imageContent.buffer;

       /* if (bucketName === 'gertner-images') {
            fileBuffer = await resizeAndCropImage(fileBuffer, 800, 800);
        }
        */

        // Azure Blob Storage configuration
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceURL = new ServiceURL(
            `https://${accountName}.blob.core.windows.net`,
            pipeline
        );
        const containerURL = ContainerURL.fromServiceURL(serviceURL, bucketName);

        const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);
        const aborter = Aborter.timeout(30 * 60 * 1000); // 30 minutes timeout

        // Upload the processed file to Azure Blob Storage
        await blockBlobURL.upload(aborter, fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: imageContent.mimetype,
            },
        });

        // Construct the file URL
        const fileURL = `https://${accountName}.blob.core.windows.net/${bucketName}/${fileName}`;
        console.log("Uploaded File URL:", fileURL);

        // Save the image metadata to the database
        const row = await ImageModel.addImage(imageKey, fileURL, client);
        console.log("Database Record ID:", row.id);

        return row.id;
    } catch (err) {
        console.error("Error creating image:", err.message);
        throw err;
    }
};


/*
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
*/
export const deleteImage = async (id, bucketName, client = null) => {
    try {
        const rows = await ImageModel.deleteImage(id, client);
        const fileURL = rows[0]?.url;
        if (!fileURL) {
            throw new Error("File URL is missing from the database.");
        }

        const fileName = fileURL.split('/').pop();
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

        try {
            await blockBlobURL.delete(Aborter.none);
            console.log("Blob deleted successfully:", fileName);
        } catch (err) {
            if (err.statusCode === 404) {
                console.warn("Blob not found, skipping deletion:", fileName);
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error("Error deleting image:", err.message);
        throw err;
    }
};

