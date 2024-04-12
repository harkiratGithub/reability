import _ from 'lodash';

export const modelValidator = (validationObject, object, nameOfValidator) => {
	validationObject.forEach((element) => {
		if (checkIfElementMust(object, element)) {
			throw new Error(`${nameOfValidator}: ${element.key} missing`);
		} else if (checkIfNotValidElement(object, element)) {
			throw new Error(`${nameOfValidator}: ${element.key} not ${element.type}`);
		}
	});
	return true;
};

export const updateModelValidator = (validationObject, object, nameOfValidator) => {
	validationObject.forEach((element) => {
		if (checkIfNotValidElement(object, element)) {
			throw new Error(`${nameOfValidator}: ${element.key} not ${element.type}`);
		}
	});
	return true;
};

export const checkIfNotValidElement = (object, element) => {
	return object[element.key] && typeof object[element.key] !== element.type;
};

export const checkIfElementMust = (object, element) => {
	return element.required && !object[element.key];
};

const convertToSnakeCase = (str: string) =>
	str.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`).replace(/^_/, '');

const convertToCamelCase = (str: string) => str.replace(/_[a-z]/g, (match: string) => `${match[1].toUpperCase()}`);

export const convertKeysToSnakeCase = (obj: Record<string, any>): any => {
	const res: Record<string, any> = {};
	_.each(_.keys(obj), (key: string) => {
		res[convertToSnakeCase(key)] = obj[key];
	});
	return res;
};

export const convertKeysToCamelCase = <T = any>(obj: Record<string, any>): T => {
	const res: Record<string, any> = {};
	_.each(_.keys(obj), (key: string) => {
		res[convertToCamelCase(key)] = obj[key];
	});
	return res as T;
};
