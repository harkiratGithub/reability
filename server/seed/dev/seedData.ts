import dotenv from 'dotenv';

import * as EncryptHelper from '../../services/encrypt.helper';
import { ROLE } from '../../const';

dotenv.config();

export const institutes = [
	{
		id: 1,
		name: 'clalit',
	},
];

export const departments = [
	{
		id: 1,
		name: 'head',
		institute_id: 1,
	},
	{
		id: 2,
		name: 'neck',
		institute_id: 1,
	},
];

export const users = [
	{
		id: 1,
		user_name: 'ori',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: 'test@spectory.com',
	},
	{
		id: 2,
		user_name: 'gil',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: 'test@spectory.com',
	},
	{
		id: 3,
		user_name: 'guy',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: 'guyd@spectory.com',
	},
	{
		id: 4,
		user_name: 'itamar',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: 'test@spectory.com',
	},
	{
		id: 5,
		user_name: 'ben',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: 'test@spectory.com',
	},
	{
		id: 6,
		user_name: 'shlomo',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: 'test@spectory.com',
	},
	{
		id: 7,
		user_name: 'david',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: 'test@spectory.com',
	},
	{
		id: 8,
		user_name: 'haim',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: 'test@spectory.com',
	},
	{
		id: 9,
		user_name: 'admin',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.ADMIN,
		email: 'test@spectory.com',
	},
];

export const admins = [
	{
		id: 1,
		first_name: 'admin',
		last_name: 'admin',
		phone: '1234567890',
		user_id: 9,
	},
];

export const therapists = [
	{
		id: 1,
		first_name: 'ori',
		last_name: 'glick',
		identity_number: '8723435',
		phone: '054568431',
		user_id: 1,
	},
	{
		id: 2,
		first_name: 'shlomo',
		last_name: 'glick',
		identity_number: '87234354',
		phone: '054568431',
		user_id: 6,
	},
];

export const patients = [
	{
		id: 1,
		first_name: 'ben',
		last_name: 'aaa',
		identity_number: '8723436',
		phone: '054568431',
		user_id: 5,
		disabled_skeleton: true,
	},
	{
		id: 2,
		first_name: 'gil',
		last_name: 'bbb',
		identity_number: '8723437',
		phone: '054568431',
		user_id: 2,
		disabled_skeleton: true,
	},
	{
		id: 3,
		first_name: 'itamar',
		last_name: 'ccc',
		identity_number: '8723438',
		phone: '054568431',
		user_id: 4,
		disabled_skeleton: true,
	},
	{
		id: 4,
		first_name: 'guy',
		last_name: 'ddd',
		identity_number: '8723439',
		phone: '054568431',
		user_id: 3,
		disabled_skeleton: true,
	},
	{
		id: 5,
		first_name: 'david',
		last_name: 'eee',
		identity_number: '87234391',
		phone: '054568431',
		user_id: 7,
		disabled_skeleton: true,
	},
	{
		id: 6,
		first_name: 'haim',
		last_name: 'menashe',
		identity_number: '872343912',
		phone: '054568431',
		user_id: 8,
		disabled_skeleton: true,
	},
];

export const patientDepartments = [
	{
		id: 1,
		patient_id: 1,
		department_id: 1,
	},
	{
		id: 2,
		patient_id: 1,
		department_id: 2,
	},
	{
		id: 5,
		patient_id: 2,
		department_id: 1,
	},
	{
		id: 3,
		patient_id: 3,
		department_id: 1,
	},
	{
		id: 4,
		patient_id: 4,
		department_id: 1,
	},
	{
		id: 6,
		patient_id: 5,
		department_id: 1,
	},
	{
		id: 7,
		patient_id: 6,
		department_id: 1,
	},
];

export const therapistDepartments = [
	{
		id: 1,
		therapist_id: 1,
		department_id: 1,
	},
	{
		id: 2,
		therapist_id: 1,
		department_id: 2,
	},
	{
		id: 5,
		therapist_id: 2,
		department_id: 1,
	},
];

export const games = [
	{
		id: 1,
		name: 'squat',
		url:
			process.env.NODE_ENV === 'production'
				? 'https://gertner-squats.s3.eu-central-1.amazonaws.com/'
				: 'https://gertner-squats-staging.s3.eu-central-1.amazonaws.com/',
	},
	{
		id: 2,
		name: 'memory',
		url:
			process.env.NODE_ENV === 'production'
				? 'https://gertner-memory-game.s3.eu-central-1.amazonaws.com/'
				: 'https://gertner-memory-game-staging.s3.eu-central-1.amazonaws.com/',
	},
	{
		id: 3,
		name: 'studio',
		url:
			process.env.NODE_ENV === 'production'
				? 'https://gertner-respiratory-game.s3.eu-central-1.amazonaws.com/'
				: 'https://gertner-respiratory-game-staging.s3.eu-central-1.amazonaws.com/',
	},
];

export const patientGames = [
	{
		id: 1,
		patient_id: 1,
		game_id: 1,
	},
	{
		id: 2,
		patient_id: 1,
		game_id: 2,
	},
	{
		id: 3,
		patient_id: 2,
		game_id: 1,
	},
	{
		id: 4,
		patient_id: 2,
		game_id: 2,
	},
	{
		id: 5,
		patient_id: 3,
		game_id: 1,
	},
	{
		id: 6,
		patient_id: 3,
		game_id: 2,
	},
	{
		id: 7,
		patient_id: 4,
		game_id: 1,
	},
	{
		id: 8,
		patient_id: 4,
		game_id: 2,
	},
	{
		id: 9,
		patient_id: 5,
		game_id: 1,
	},
	{
		id: 10,
		patient_id: 5,
		game_id: 2,
	},
	{
		id: 11,
		patient_id: 6,
		game_id: 1,
	},
	{
		id: 12,
		patient_id: 6,
		game_id: 2,
	},
];
