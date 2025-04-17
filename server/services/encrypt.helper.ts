import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { reduce } from 'lodash';
import { FIELDS_TO_DECRYPT, FIELDS_TO_ENCRYPT } from '../const';

const encryptionKey = process.env.ENCRYPTION_KEY;
const encryptionIv = process.env.ENCRYPTION_IV;
const algorithm = 'aes256';

export const hashPassword = (password) => {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
};

export const comparePassword = (hashedPassword, password) => {
	return bcrypt.compareSync(password, hashedPassword);
};

export const encryptPersonalData = (text) => {
	if (!text) {
		return '';
	}
	const cipher = crypto.createCipheriv(algorithm, encryptionKey, encryptionIv);
	return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
};

export const encryptJson = (json): Record<string, any> => {
	return reduce(
		json,
		(result, value, key) => {
			if (FIELDS_TO_ENCRYPT.includes(key)) {
				result[key] = encryptPersonalData(value);
			} else {
				result[key] = value;
			}
			return result;
		},
		{}
	);
};

export const decryptPersonalData = (cipherText) => {
	if (!cipherText) {
		return '';
	}
	const decipher = crypto.createDecipheriv(algorithm, encryptionKey, encryptionIv);
	return decipher.update(cipherText, 'hex', 'utf8') + decipher.final('utf8');
};

export const decryptJson = (json): any => {
	return reduce(
		json,
		(result, value, key) => {
			if (FIELDS_TO_DECRYPT.includes(key)) {
				result[key] = decryptPersonalData(value);
			} else {
				result[key] = value;
			}
			return result;
		},
		{}
	);
};

export const decryptArray = (array: any): any[] => {
	return array.map((item) => decryptJson(item));
};
