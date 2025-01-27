import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import AwsService from '../services/aws.service';

// import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';


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


// export const addUploadedGameRelatedImage = async (file) => {
//     // Extract the extension and generate a unique filename
//     const extension = file.substring('data:image/'.length, file.indexOf(';base64'));
//     const fileName = `${uuidv4()}.${extension}`;

//     // Convert base64 image data to a Buffer
//     file = file.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
//     const fileBuffer = Buffer.from(file, 'base64');

//     try {
//         // Azure Storage credentials from environment variables
//         const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
//         const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
//         const containerName = process.env.AZURE_CONTAINER_NAME;

//         // Create a BlobServiceClient
//         const blobServiceClient = new BlobServiceClient(
//             `https://${accountName}.blob.core.windows.net`,
//             new StorageSharedKeyCredential(accountName, accountKey)
//         );

//         // Get the container client
//         const containerClient = blobServiceClient.getContainerClient(containerName);

//         // Create a block blob client for the file
//         const blockBlobClient = containerClient.getBlockBlobClient(fileName);

//         // Upload the file buffer to Azure Blob Storage
//         await blockBlobClient.uploadData(fileBuffer);

//         // Return the public URL of the uploaded image
//         return blockBlobClient.url;
//     } catch (err) {
//         throw err;
//     }
// };

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

// export const addAdminRelatedImage = async (file, name) => {
//     // Extract the extension and generate a unique file name
//     const extension = file.substring('data:image/'.length, file.indexOf(';base64'));
//     const fileName = `${uuidv4()}.${extension}`;

//     // Convert Base64 string to Buffer
//     file = file.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
//     const fileBuffer = Buffer.from(file, 'base64');

//     try {
//         // Azure Storage credentials from environment variables
//         const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
//         const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
//         const containerName = process.env.AZURE_CONTAINER_NAME;

//         // Initialize BlobServiceClient
//         const blobServiceClient = new BlobServiceClient(
//             `https://${accountName}.blob.core.windows.net`,
//             new StorageSharedKeyCredential(accountName, accountKey)
//         );

//         // Get the container client
//         const containerClient = blobServiceClient.getContainerClient(containerName);

//         // Get the block blob client for the specific file
//         const blockBlobClient = containerClient.getBlockBlobClient(fileName);

//         // Upload the file buffer to Azure Blob Storage
//         await blockBlobClient.uploadData(fileBuffer);

//         // Get the public URL of the uploaded image
//         const url = blockBlobClient.url;

//         // Return the URL and name
//         return { url, name };
//     } catch (err) {
//         // Throw error if upload fails
//         throw err;
//     }
// };
