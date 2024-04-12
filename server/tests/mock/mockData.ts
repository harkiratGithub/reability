import * as EncryptHelper from '../../services/encrypt.helper';
import { ROLE } from '../../const';
import * as Helper from '../../services/util.helper';

export const validInstitutes = [
	{ id: 1, name: 'clalit' },
	{ id: 2, name: 'macabi' },
	{ id: 3, name: 'leumit' },
];

export const validDepartments = [
	{ name: 'neck', institute_id: 1 },
	{ name: 'shoulder', institute_id: 2 },
	{ name: 'head', institute_id: 3 },
];

export const institutes = [
	{
		id: 1,
		name: 'clalit',
	},
	{
		id: 2,
		name: 'sheba',
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
	{ id: 3, name: 'neck', institute_id: 2 },
];

export const users = [
	{
		id: 1,
		user_name: 'ori',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 2,
		user_name: 'gil',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 3,
		user_name: 'guy',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 4,
		user_name: 'itamar',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 5,
		user_name: 'ben',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 6,
		user_name: 'shlomo',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 7,
		user_name: 'david',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 8,
		user_name: 'niv',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 9,
		user_name: 'nivbdf',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 10,
		user_name: 'nivbdefef',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.PATIENT,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 11,
		user_name: 'fwegf',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.THERAPIST,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
	{
		id: 12,
		user_name: 'admin',
		password: EncryptHelper.hashPassword('12345'),
		role: ROLE.ADMIN,
		email: EncryptHelper.encryptPersonalData('test@spectory.com'),
	},
];

export const therapists = [
	{
		id: 1,
		first_name: EncryptHelper.encryptPersonalData('ori'),
		last_name: EncryptHelper.encryptPersonalData('glick'),
		identity_number: EncryptHelper.encryptPersonalData('8723435'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 1,
	},
	{
		id: 2,
		first_name: EncryptHelper.encryptPersonalData('shlomo'),
		last_name: EncryptHelper.encryptPersonalData('glick'),
		identity_number: EncryptHelper.encryptPersonalData('87234354'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 6,
	},
	{
		id: 3,
		first_name: EncryptHelper.encryptPersonalData('shlomofe'),
		last_name: EncryptHelper.encryptPersonalData('glickefgw'),
		identity_number: EncryptHelper.encryptPersonalData('8723435454'),
		phone: EncryptHelper.encryptPersonalData('0545684313'),
		user_id: 9,
	},
	{
		id: 4,
		first_name: EncryptHelper.encryptPersonalData('grweghwe'),
		last_name: EncryptHelper.encryptPersonalData('gergre'),
		identity_number: EncryptHelper.encryptPersonalData('8723435'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 11,
	},
];

export const patients = [
	{
		id: 1,
		first_name: EncryptHelper.encryptPersonalData('ben'),
		last_name: EncryptHelper.encryptPersonalData('aaa'),
		identity_number: EncryptHelper.encryptPersonalData('8723436'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 5,
	},
	{
		id: 2,
		first_name: EncryptHelper.encryptPersonalData('gil'),
		last_name: EncryptHelper.encryptPersonalData('bbb'),
		identity_number: EncryptHelper.encryptPersonalData('8723437'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 2,
	},
	{
		id: 3,
		first_name: EncryptHelper.encryptPersonalData('itamar'),
		last_name: EncryptHelper.encryptPersonalData('ccc'),
		identity_number: EncryptHelper.encryptPersonalData('8723438'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 4,
	},
	{
		id: 4,
		first_name: EncryptHelper.encryptPersonalData('guy'),
		last_name: EncryptHelper.encryptPersonalData('ddd'),
		identity_number: EncryptHelper.encryptPersonalData('8723439'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 3,
	},
	{
		id: 5,
		first_name: EncryptHelper.encryptPersonalData('david'),
		last_name: EncryptHelper.encryptPersonalData('eee'),
		identity_number: EncryptHelper.encryptPersonalData('87234391'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 7,
	},
	{
		id: 6,
		first_name: EncryptHelper.encryptPersonalData('niv'),
		last_name: EncryptHelper.encryptPersonalData('niv'),
		identity_number: EncryptHelper.encryptPersonalData('872376391'),
		phone: EncryptHelper.encryptPersonalData('054568431'),
		user_id: 8,
	},
	{
		id: 7,
		first_name: EncryptHelper.encryptPersonalData('nierherhv'),
		last_name: EncryptHelper.encryptPersonalData('nivewte'),
		identity_number: EncryptHelper.encryptPersonalData('3872376391'),
		phone: EncryptHelper.encryptPersonalData('0545684321'),
		user_id: 10,
	},
];

export const games = [
	{
		id: 1,
		name: 'squat',
		url: 'https://gertner-squats.s3.eu-central-1.amazonaws.com/index.html',
	},
	{
		id: 2,
		name: 'memory-game',
		url: 'https://gertner-memory-game.s3.eu-central-1.amazonaws.com/index.html',
	},
];

export const patientGames = [
	{
		id: 1,
		patient_id: 1,
		game_id: 1,
		active: true,
	},
	{
		id: 2,
		patient_id: 1,
		game_id: 2,
		active: true,
	},
	{
		id: 5,
		patient_id: 2,
		game_id: 2,
		active: true,
	},
	{
		id: 3,
		patient_id: 3,
		game_id: 1,
		active: true,
	},
	{
		id: 4,
		patient_id: 4,
		game_id: 2,
		active: false,
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
	{
		id: 8,
		patient_id: 7,
		department_id: 1
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
	{
		id: 3,
		therapist_id: 3,
		department_id: 1,
	},
	{
		id: 4,
		therapist_id: 4,
		department_id: 2,
	},
	{
		id: 6,
		therapist_id: 4,
		department_id: 3,
	},
];

const date = Helper.createTimeForDb();
export const sessions = [
	{
		id: 1,
		patient_id: 1,
		patient_start_time: date,
		patient_end_time: date,
	},
	{
		id: 2,
		patient_id: 2,
		patient_start_time: date,
		patient_end_time: date,
	},
	{
		id: 3,
		patient_id: 1,
		patient_start_time: date,
		patient_end_time: date,
	},
];
