import * as BaseModel from '../../services/BaseModel.service';
import * as Factory from '../factories/index';
import * as AvailabilityModel from '../../models/availability.model';
import { TABLE_NAME } from '../../const';

const checkAvailabilityRow = async (therapistInput, therapistAvailability, expertiseId, row) => {
	expect(row.availability).toEqual(JSON.parse(therapistAvailability.availability));
	const therapistExpertise = await BaseModel.itemsBySeveralFields(TABLE_NAME.THERAPIST_EXPERTISE, {
		therapist_id: row.therapist_id,
		expertise_id: expertiseId,
	});
	const expertise = await BaseModel.itemsBySeveralFields(TABLE_NAME.EXPERTISE, {
		id: expertiseId,
	});
	expect(row.therapist_max_patients).toEqual(therapistExpertise[0].max_patients);
	expect(row.expertise_max_patients).toEqual(expertise[0].max_patients);
	expect(row.therapist_first_name).toEqual(therapistInput.first_name);
	expect(row.therapist_id).toEqual(therapistInput.therapist_id);
	expect(row.therapist_last_name).toEqual(therapistInput.last_name);
};

describe('TEST AVAILABILITY MODEL', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: getAvailabilityByExpertise()', () => {
		it('get availability by expertise - default', async () => {
			const expertise1 = await Factory.createExpertise();
			const therapist1 = await Factory.createTherapist();
			const therapistAvailability1 = await Factory.createAvailability(0, 0, therapist1.user_id);
			await Factory.createTherapistExpertise(therapist1, expertise1);

			const therapist2 = await Factory.createTherapist();
			const expertise2 = await Factory.createExpertise();
			const therapistAvailability2 = await Factory.createAvailability(0, 0, therapist2.user_id);
			await Factory.createTherapistExpertise(therapist2, expertise2);
			await Factory.createTherapistExpertise(therapist1, expertise2);

			const therapist3 = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist3, expertise1);
			const therapistAvailability3 = await Factory.createAvailability(0, 0, therapist3.user_id);

			const results = await AvailabilityModel.getAvailabilityByExpertise(expertise1.expertise_id, 1, 2021);
			expect(results).toHaveLength(2);
			checkAvailabilityRow(
				therapist1,
				therapistAvailability1,
				expertise1.expertise_id,
				results.filter((x) => x.therapist_id === therapist1.therapist_id)[0]
			);
			checkAvailabilityRow(
				therapist3,
				therapistAvailability3,
				expertise1.expertise_id,
				results.filter((x) => x.therapist_id === therapist3.therapist_id)[0]
			);
		});

		it('get availability by expertise - with exceptions', async () => {
			const expertise1 = await Factory.createExpertise();
			const therapist1 = await Factory.createTherapist();
			const therapist1DefaultAvailability = await Factory.createAvailability(0, 0, therapist1.user_id);

			await Factory.createTherapistExpertise(therapist1, expertise1);

			const therapist2 = await Factory.createTherapist();
			const expertise2 = await Factory.createExpertise();
			await Factory.createAvailability(0, 0, therapist2.user_id);
			await Factory.createTherapistExpertise(therapist2, expertise2);
			await Factory.createTherapistExpertise(therapist1, expertise2);

			const therapist3 = await Factory.createTherapist();
			await Factory.createTherapistExpertise(therapist3, expertise1);
			const therapist3DefaultAvailability = await Factory.createAvailability(0, 0, therapist3.user_id);

			const therapist1ExceptionAvailability = await Factory.createAvailability(52, 2021, therapist1.user_id);
			await Factory.createAvailability(52, 2021, therapist2.user_id);

			const results = await AvailabilityModel.getAvailabilityByExpertise(expertise1.expertise_id, 52, 2021);
			expect(results).toHaveLength(3);
			checkAvailabilityRow(
				therapist1,
				therapist1DefaultAvailability,
				expertise1.expertise_id,
				results.find((x) => x.therapist_id === therapist1.therapist_id && x.is_default_availability)
			);
			checkAvailabilityRow(
				therapist1,
				therapist1ExceptionAvailability,
				expertise1.expertise_id,
				results.find((x) => x.therapist_id === therapist1.therapist_id && !x.is_default_availability)
			);
			checkAvailabilityRow(
				therapist3,
				therapist3DefaultAvailability,
				expertise1.expertise_id,
				results.find((x) => x.therapist_id === therapist3.therapist_id)
			);
		});
	});
});
