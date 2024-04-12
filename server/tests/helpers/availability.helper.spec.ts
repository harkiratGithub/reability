import * as BaseModel from '../../services/BaseModel.service';
import * as Factory from '../factories/index';
import { NO_AVAILABILITY, TABLE_NAME } from '../../const';
import * as AvailabilityHelper from '../../helpers/availability.helper';

describe('TEST Availability HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: setAvailability()', () => {
		it('should set user availability successfully', async () => {
			const newUserAvailability = await Factory.createAvailability();
			const availabilitiesFoundInDB = await BaseModel.itemsByField(
				TABLE_NAME.AVAILABILITY,
				'id',
				newUserAvailability.availability_id
			);
			const availabilityFoundInDB = availabilitiesFoundInDB[0];

			expect(newUserAvailability.user_id).toEqual(availabilityFoundInDB.user_id);
			expect(newUserAvailability.week).toEqual(availabilityFoundInDB.week);
			expect(newUserAvailability.year).toEqual(availabilityFoundInDB.year);
			expect(newUserAvailability.availability).toEqual(JSON.stringify(availabilityFoundInDB.availability));
		});
		it('should throw error if there is no relation to user', async () => {
			const availabilitiesBeforeInsert = await BaseModel.getAllTable(TABLE_NAME.AVAILABILITY);
			const newAvailability = { user_id: 99999, week: 2, year: 2022, availability: {} };
			try {
				await AvailabilityHelper.setAvailability(newAvailability);
			} catch (err) {
				const availabilitiesAfterInsert = await BaseModel.getAllTable(TABLE_NAME.AVAILABILITY);
				expect(availabilitiesBeforeInsert).toHaveLength(0);
				expect(availabilitiesAfterInsert).toHaveLength(0);
				expect(err.message).toEqual(
					`insert or update on table "availability" violates foreign key constraint "availability_user_id_fkey"`
				);
			}
		});
		it('should throw error about duplicate user_id-week-year', async () => {
			const newUserAvailability = await Factory.createAvailability();
			const { week, year, user_id } = newUserAvailability;
			const availabilitiesBeforeInsert = await BaseModel.getAllTable(TABLE_NAME.AVAILABILITY);
			try {
				await Factory.createAvailability(week, year, user_id);
			} catch (err) {
				const availabilitiesAfterInsert = await BaseModel.getAllTable(TABLE_NAME.AVAILABILITY);
				expect(availabilitiesBeforeInsert).toHaveLength(1);
				expect(availabilitiesAfterInsert).toHaveLength(1);
				expect(err.message).toEqual(`duplicate key value violates unique constraint \"availability_constraint\"`);
			}
		});
		it('should get user availability for specific week', async () => {
			const WEEK = 24;
			const YEAR = 2021;
			const noAvailability = await AvailabilityHelper.getUserAvailability(1, WEEK, YEAR);
			expect(noAvailability).toEqual(NO_AVAILABILITY);

			const newUserAvailabilityDefault = await Factory.createAvailability(0, 0);
			const parsedNewUserAvailabilityDefaultAvailability = JSON.parse(newUserAvailabilityDefault.availability);
			const defaultWeek = await AvailabilityHelper.getUserAvailability(newUserAvailabilityDefault.user_id, WEEK, YEAR);

			expect(defaultWeek.Sunday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Sunday);
			expect(defaultWeek.Monday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Monday);
			expect(defaultWeek.Tuesday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Tuesday);
			expect(defaultWeek.Wednesday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Wednesday);
			expect(defaultWeek.Thursday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Thursday);
			expect(defaultWeek.Friday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Friday);
			expect(defaultWeek.Saturday).toEqual(parsedNewUserAvailabilityDefaultAvailability.Saturday);

			const currentWeekAvailability = await Factory.createAvailability(WEEK, YEAR, newUserAvailabilityDefault.user_id);
			const parsedCurrentWeekAvailabilityAvailability = JSON.parse(currentWeekAvailability.availability);
			const currentWeek = await AvailabilityHelper.getUserAvailability(newUserAvailabilityDefault.user_id, WEEK, YEAR);
			expect(currentWeek.Sunday).toEqual(parsedCurrentWeekAvailabilityAvailability.Sunday);
			expect(currentWeek.Monday).toEqual(parsedCurrentWeekAvailabilityAvailability.Monday);
			expect(currentWeek.Tuesday).toEqual(parsedCurrentWeekAvailabilityAvailability.Tuesday);
			expect(currentWeek.Wednesday).toEqual(parsedCurrentWeekAvailabilityAvailability.Wednesday);
			expect(currentWeek.Thursday).toEqual(parsedCurrentWeekAvailabilityAvailability.Thursday);
			expect(currentWeek.Friday).toEqual(parsedCurrentWeekAvailabilityAvailability.Friday);
			expect(currentWeek.Saturday).toEqual(parsedCurrentWeekAvailabilityAvailability.Saturday);
		});
	});
});
