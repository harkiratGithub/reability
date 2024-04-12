import { Moment } from 'moment';
import squel from 'squel';

import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';
import * as UtilHelper from './util.model';
import { getOldValuesFromDb } from '../helpers/activity-log.helper';

const squelPostgres = squel.useFlavour('postgres');

export interface IAvailabilitySchedule {
	Sunday: number[];
	Monday: number[];
	Tuesday: number[];
	Wednesday: number[];
	Thursday: number[];
	Friday: number[];
	Saturday: number[];
}
interface IAvailability {
	id?: number;
	userId?: number;
	week?: number;
	year?: number;
	createdAt?: Moment;
	updatedAt?: Moment;
}

export interface IAvailabilityDb extends IAvailability {
	availability?: string;
}

export interface IAvailabilityClient extends IAvailability {
	availability?: IAvailabilitySchedule;
}

const availabilityValidationObject = [
	{ key: 'id', type: 'number', required: false },
	{ key: 'user_id', type: 'number', required: true },
	{ key: 'week', type: 'number', required: false },
	{ key: 'year', type: 'number', required: false },
];

const availabilityValidator = (availabilityObject: IAvailabilityDb): boolean => {
	return UtilHelper.modelValidator(availabilityValidationObject, availabilityObject, 'availabilityValidator');
};

export const create = (availability: Omit<IAvailabilityDb, 'id'>) => {
	return BaseModel.createRow(TABLE_NAME.AVAILABILITY, availability, availabilityValidator);
};

export const update = async (userId: number, week: number, year: number, availability: string) => {
	const oldValueFieldNames = getOldValuesFromDb(['availability', 'week', 'year', 'user_id'], 'ov');
	const selectOldValue = `(SELECT * FROM ${TABLE_NAME.AVAILABILITY} WHERE user_id = ${userId} AND week = ${week} AND year = ${year} FOR UPDATE)`;
	const query = squelPostgres
		.update()
		.table(TABLE_NAME.AVAILABILITY, 'v')
		.set('availability', availability)
		.from(selectOldValue, 'ov')
		.where(`v.user_id = ?`, userId)
		.where(`v.week = ?`, week)
		.where(`v.year = ?`, year)
		.returning(`*, ${oldValueFieldNames}`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows?.[0];
};

export const deleteAvailability = async (userId: number, week: number, year: number) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.AVAILABILITY)
		.where(`user_id = ?`, userId)
		.where(`week = ?`, week)
		.where(`year = ?`, year)
		.returning('*')
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows?.[0];
};

export const getUserAvailability = async (userId: number, week: number, year: number): Promise<IAvailabilityClient> => {
	const query = squelPostgres
		.select()
		.field('availability')
		.from(TABLE_NAME.AVAILABILITY)
		.where(`${TABLE_NAME.AVAILABILITY}.user_id = ?`, userId)
		.where(`${TABLE_NAME.AVAILABILITY}.week = ?`, week)
		.where(`${TABLE_NAME.AVAILABILITY}.year = ?`, year)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows?.[0];
};

export const getAvailabilityByExpertise = async (expertiseIds: number[], week: number, year: number) => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.THERAPIST}.id`, 'therapist_id')
		.field(`${TABLE_NAME.THERAPIST}.first_name`, 'therapist_first_name')
		.field(`${TABLE_NAME.THERAPIST}.last_name`, 'therapist_last_name')
		.field(`${TABLE_NAME.AVAILABILITY}.availability`)
		.field(`${TABLE_NAME.THERAPIST_EXPERTISE}.max_patients`, 'therapist_max_patients')
		.field(`${TABLE_NAME.EXPERTISE}.max_patients`, 'expertise_max_patients')
		.field(`case when year > 0 then false else true end`, 'is_default_availability')
		.from(TABLE_NAME.THERAPIST)
		.left_join(TABLE_NAME.USER, null, `${TABLE_NAME.THERAPIST}.user_id = ${TABLE_NAME.USER}.id`)
		.left_join(
			TABLE_NAME.THERAPIST_EXPERTISE,
			null,
			`${TABLE_NAME.THERAPIST}.id = ${TABLE_NAME.THERAPIST_EXPERTISE}.therapist_id`
		)
		.left_join(
			TABLE_NAME.EXPERTISE,
			null,
			`${TABLE_NAME.EXPERTISE}.id = ${TABLE_NAME.THERAPIST_EXPERTISE}.expertise_id`
		)
		.join(TABLE_NAME.AVAILABILITY, null, `${TABLE_NAME.AVAILABILITY}.user_id = ${TABLE_NAME.USER}.id`)
		.where(
			`${TABLE_NAME.THERAPIST_EXPERTISE}.expertise_id IN (${expertiseIds.join(',')}) AND ${
				TABLE_NAME.THERAPIST
			}.active = true`
		)
		.where(
			`(${TABLE_NAME.AVAILABILITY}.year = ? and ${TABLE_NAME.AVAILABILITY}.week = ?) or (${TABLE_NAME.AVAILABILITY}.year = 0 and ${TABLE_NAME.AVAILABILITY}.week = 0)`,
			year,
			week
		)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};
