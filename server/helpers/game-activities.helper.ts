import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import {
    SharedKeyCredential,
    StorageURL,
    ServiceURL,
    ContainerURL,
    BlockBlobURL,
    Aborter,
} from '@azure/storage-blob';

export const addUploadedGameRelatedImage = async (file) => {
	console.log("=======addUploadedGameRelatedImage======",file);
    const extension = file.substring('data:image/'.length, file.indexOf(';base64'));
    const fileName = `${uuidv4()}.${extension}`;

    file = file.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
    const fileBuffer = Buffer.from(file, 'base64');

    try {
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_CONTAINER_NAME;

        const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceURL = new ServiceURL(`https://${accountName}.blob.core.windows.net`, pipeline);
        const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
        const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);

        const aborter = Aborter.timeout(30 * 60 * 1000); // 30 minutes timeout

        await blockBlobURL.upload(aborter, fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: `image/${extension}`, // Sets the correct MIME type
            },
        });

        const fileURL = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}`;
        return fileURL;
    } catch (err) {
        console.error("Error uploading game-related image:", err.message);
        throw err;
    }
};

export const addAdminRelatedImage = async (file, name) => {
	console.log("=======addAdminRelatedImage======",name);
    const extension = file.substring('data:image/'.length, file.indexOf(';base64'));
    const fileName = `${uuidv4()}.${extension}`;

    file = file.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
    const fileBuffer = Buffer.from(file, 'base64');

    try {
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_CONTAINER_NAME;

        const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceURL = new ServiceURL(`https://${accountName}.blob.core.windows.net`, pipeline);
        const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
        const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName);

        const aborter = Aborter.timeout(30 * 60 * 1000); // 30 minutes timeout

        await blockBlobURL.upload(aborter, fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: `image/${extension}`, // Sets the correct MIME type
            },
        });

        const fileURL = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}`;
        return { url: fileURL, name };
    } catch (err) {
        console.error("Error uploading admin-related image:", err.message);
        throw err;
    }
};
