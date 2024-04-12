import { IAvailabilitySchedule } from './models/availability.model';

export const TABLE_NAME = {
	INSTITUTE: 'institute',
	DEPARTMENT: 'department',
	DEVICE: 'device',
	GAME: 'game',
	GAME_SETTINGS: 'game_settings',
	PATIENT: 'patient',
	GAME_SESSION: 'game_session',
	THERAPIST: 'therapist',
	USER: 'users',
	PATIENT_GAME: 'patient_game',
	IMAGE: 'image',
	THERAPIST_SESSION: 'therapist_session',
	USER_SESSION: 'user_session',
	PATIENT_DEPARTMENTS: 'patient_departments',
	THERAPIST_DEPARTMENTS: 'therapist_departments',
	FOLLOWUP: 'followup',
	PATIENT_CONTACTS: 'patient_contacts',
	PROFESSION: 'profession',
	EXPERTISE: 'expertise',
	PATIENT_TREATMENT: 'patient_treatment',
	THERAPIST_EXPERTISE: 'therapist_expertise',
	AVAILABILITY: 'availability',
	BOOKING: 'booking',
	ACTIVITY_LOG: 'activity_log',
	ADMIN: 'admin',
	LEAD: 'lead',
	LEAD_REMINDER: 'lead_reminder',
	LEAD_CONTACTS: 'lead_contacts',
	USER_FILTERS: 'user_filters',
	USER_GAME_DATA: 'user_game_data',
	GAME_DATA: 'game_data',
	SERVER_LOG: 'server_log',
};

export const TABLE_SEQUENCE = {
	USERS: 'users_id_seq',
	DEPARTMENT: 'department_id_seq',
	INSTITUTE: 'institute_id_seq',
	THERAPIST: 'therapist_id_seq',
	PATIENT: 'patient_id_seq',
	GAME: 'game_id_seq',
	PATIENT_GAME: 'patient_game_id_seq',
	SESSION: 'session_id_seq',
	PATIENT_DEPARTMENTS: 'patient_departments_id_seq',
	THERAPIST_DEPARTMENTS: 'therapist_departments_id_seq',
	ADMIN: 'admin_id_seq',
};

export const GENDER_TYPE = {
	MALE: 'male',
	FEMALE: 'female',
};

export const PEERS_STATUS = {
	CONNECTED: 'Connected',
	AVAILABLE: 'Available',
	LOGGED_OUT: 'Offline',
	BUSY: 'Busy',
	DISABLED: 'Disabled',
};

export const ROLE = {
	ADMIN: 'admin',
	THERAPIST: 'therapist',
	PATIENT: 'patient',
	VIDEO_PATIENT: 'video_patient',
};

export const ERROR_NAME = {
	PERMISSION: 'Unauthorized',
	THERAPIST_PERMISSION_NOT_VALID: 'Therapist not have permission to this patient',
};

export const FIELDS_TO_DECRYPT = [
	'email',
	'first_name',
	'last_name',
	'patient_first_name',
	'patient_last_name',
	'therapist_first_name',
	'therapist_last_name',
	'identity_number',
	'phone',
	'full_name',
	'contact_full_name',
	'contact_phone',
	'contact_email',
	'additional_contact_full_name',
	'additional_contact_phone',
	'additional_contact_email',
	'therapist_name',
];

export const FIELDS_TO_ENCRYPT = [
	'email',
	'first_name',
	'last_name',
	'full_name',
	'identity_number',
	'phone',
	'contact_full_name',
	'contact_phone',
	'contact_email',
	'therapist_name',
];

export const DEFAULT_RECAPTCHA_MIN_SCORE = 0.5;

export const emailRegex =
	/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const passwordRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})');

export enum BOOKING_DELETE_OPTIONS {
	SPECIFIC_TREATMENT = 0,
	ALL_TREATMENTS_ON_SAME_DAY_AND_TIME,
	ALL_TREATMENTS_ON_SAME_PRESCRIPTION,
}

export const NO_AVAILABILITY: IAvailabilitySchedule = {
	Sunday: [],
	Monday: [],
	Tuesday: [],
	Wednesday: [],
	Thursday: [],
	Friday: [],
	Saturday: [],
};

export const PATIENT_AUTO_PASSWORD_LENGTH = 8;

export const ARRAY_TO_POSTGRES_ARRAY_COLUMNS = ['departments'];

export const MAX_NUMBER_OF_PATIENT_CONTACTS = 2;
