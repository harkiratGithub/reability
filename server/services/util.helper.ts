import moment from 'moment';
import crypto from 'crypto';
import { padStart } from 'lodash';
//import { DateTime } from 'luxon';
import momentTimezone from 'moment-timezone';


import { emailRegex, passwordRegex } from '../const';

export const validateEmail = (email) => {
	const regex = emailRegex;
	return regex.test(String(email).toLowerCase());
};

export const checkPasswordStrength = (password) => {
	const regex = passwordRegex;
	return !regex.test(password);
};

export const createTimeForDb = () => {
	return new Date().toUTCString();
};

export const getUTCMomentDateFromString = (date: string) => {
	return moment(date).add(new Date(date).getTimezoneOffset(), 'minutes'); // change to UTC
};

export const checkIfPassedAmountOfMs = (date, ms) => {
	const now = moment()
		.add(new Date().getTimezoneOffset(), 'minutes') // change to UTC
		.subtract(ms, 'milliseconds');
	const dbDate = moment(date);
	return dbDate.isBefore(now);
};

export const buildPostgresInterval = (postgresInterval) => {
	if (!postgresInterval) {
		return 0;
	}
	const checkPostgresTime = (time) => {
		if (!time) {
			return '00';
		}
		if (time < 10) {
			return `0${time}`;
		}
		return time;
	};

	const { hours, minutes, seconds } = postgresInterval;
	return `${checkPostgresTime(hours)}:${checkPostgresTime(minutes)}:${checkPostgresTime(seconds)}`;
};

export const generateRandomString = () => {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
export const generateRandomShortString = () => {
	return Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
};

export const generateUserPassword = () => {
	const characters = 'abcdefghjkmnpqrstuvwxyz';
	let userPassword = '';
	for (let i = 0; i < 8; i++) {
		userPassword += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return userPassword;
};

export const generateSecureRandomString = () => {
	return crypto.randomBytes(64).toString('hex');
};

export const getDateForArchiveString = () => {
	return `_archive_${new Date().toISOString()}`;
};

export const generateUsername = () => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const numbers = '0123456789';
	const array = [];
	for (let i = 0; i < 6; i++) {
		if (i < 2) {
			array.push(characters.charAt(Math.floor(Math.random() * characters.length)));
		} else {
			array.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
		}
	}
	return array.join('');
};

export const getTimeString = (time: number): string => {
	const hours = Math.floor(time);
	const minutes = (time - Math.floor(time)) * 60;
	return [hours, minutes]
		.map((v) => padStart(v.toString(), 2, '0'))
		.filter((v, i) => v !== '00' || i > 0)
		.join(':');
};

	// Converts UTC time to the specified timezone
	export const convertUtcToTimezone = (utcTime, timezone) => {
		if (!utcTime || !timezone) {
		throw new Error('Both UTC time and timezone are required.');
		}
		return momentTimezone.utc(utcTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
	};


	export const currentTimeofTimezone = (timezone)=>{
		if ( !timezone) {
			throw new Error('timezone are required.');
		}
		return  momentTimezone().tz(timezone);
	};
	

	/*
	// Converts UTC time to the specified timezone
	export const convertUtcToTimezoneOffset = (utcTime, timezoneOffset) => {
		if (!utcTime || !timezoneOffset) {
			throw new Error('Both UTC time and timezone offset are required.');
		}
		const timezoneRegex = /^[+-]\d{2}:\d{2}$/;
		if (!timezoneRegex.test(timezoneOffset)) {
			throw new Error(`Invalid timezone offset format: ${timezoneOffset}`);
		}
		// Normalize UTC time to ensure three-digit milliseconds
		const normalizedUtcTime = normalizeMilliseconds(utcTime);
	
		const [hoursOffset, minutesOffset] = parseTimezoneOffset(timezoneOffset);
	
		const dateTimeUtc = DateTime.fromFormat(normalizedUtcTime, 'yyyy-MM-dd HH:mm:ss.SSS', { zone: 'utc' });
	
		if (!dateTimeUtc.isValid) {
			throw new Error(`Invalid UTC time format: ${normalizedUtcTime}`);
		}
	
		const convertedDateTime = dateTimeUtc.plus({ hours: hoursOffset, minutes: minutesOffset });
		console.log("Converted DateTime:", convertedDateTime.toISO());
		return convertedDateTime.toFormat('yyyy-MM-dd HH:mm:ss');
	};
	
	const normalizeMilliseconds = (utcTime) => {
		const parts = utcTime.split('.');
		if (parts.length === 2 && parts[1].length < 3) {
			parts[1] = parts[1].padEnd(3, '0'); 
			return parts.join('.');
		}
		if (parts.length === 1) {
			return `${utcTime}.000`; // Add milliseconds if missing
		}
		return utcTime;
	};
	
	const parseTimezoneOffset = (offset) => {
		const sign = offset.charAt(0);
		const [hours, minutes] = offset.slice(1).split(':').map(Number);
	
		return sign === '+' ? [hours, minutes] : [-hours, -minutes];
	};
	*/
