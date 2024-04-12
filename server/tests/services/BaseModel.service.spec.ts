import * as BaseModel from '../../services/BaseModel.service';
import * as Mock from '../mock/mockData';

import * as InstituteModel from '../../models/institute.model';
import { TABLE_NAME } from '../../const';
import { find } from 'lodash';

describe('TEST BASE MODEL SERVICE', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());
	describe('TESTING: getAllTable()', () => {
		it('should check if there 3 institutes in the table', async () => {
			await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, Mock.validInstitutes);
			const institutes = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(institutes).toHaveLength(3);
		});

		it('should check if there 0 institutes in the table', async () => {
			const institutes = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(institutes).toHaveLength(0);
		});

		it('should throw error not valid table', async () => {
			try {
				await BaseModel.getAllTable('something');
			} catch (err) {
				expect(err.message).toEqual('relation "something" does not exist');
			}
		});
	});

	describe('TESTING: itemsByField()', () => {
		it('should check if return institute by id', async () => {
			await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, Mock.validInstitutes);
			const rows = await BaseModel.itemsByField(TABLE_NAME.INSTITUTE, 'id', 1);
			expect(rows).toHaveLength(1);
			expect(rows[0].name).toEqual('clalit');
		});

		it('should check if return institute by name', async () => {
			await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, Mock.validInstitutes);
			const rows = await BaseModel.itemsByField(
				TABLE_NAME.INSTITUTE,
				'name',
				'clalit'
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].name).toEqual('clalit');
		});

		it('should check if return 0 institute by name', async () => {
			const rows = await BaseModel.itemsByField(
				TABLE_NAME.INSTITUTE,
				'name',
				'clalit'
			);
			expect(rows).toHaveLength(0);
		});

		it('should throw error not valid table', async () => {
			try {
				await BaseModel.itemsByField('something', 'name', 'clalit');
			} catch (err) {
				expect(err.message).toEqual('relation "something" does not exist');
			}
		});
	});

	describe('TESTING: insertRow()', () => {
		it('should insert one row and return the inserted row', async () => {
			const newRow = await BaseModel.insertRow(
				TABLE_NAME.INSTITUTE,
				Mock.validInstitutes[0]
			);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(newRow.id).toEqual(Mock.validInstitutes[0].id);
			expect(newRow.name).toEqual(Mock.validInstitutes[0].name);
			expect(allRows).toHaveLength(1);
			expect(allRows[0].name).toEqual('clalit');
		});

		it('check insert not delete other rows', async () => {
			await BaseModel.insertRow(TABLE_NAME.INSTITUTE, Mock.validInstitutes[0]);
			await BaseModel.insertRow(TABLE_NAME.INSTITUTE, Mock.validInstitutes[1]);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(allRows).toHaveLength(2);
		});

		it('should throw error not valid table', async () => {
			try {
				await BaseModel.insertRow('something', Mock.validInstitutes[0]);
			} catch (err) {
				expect(err.message).toEqual('relation "something" does not exist');
			}
		});
	});

	describe('TESTING: deleteRow()', () => {
		beforeEach(async () => {
			await BaseModel.insertRow(TABLE_NAME.INSTITUTE, Mock.validInstitutes[0]);
			await BaseModel.insertRow(TABLE_NAME.INSTITUTE, Mock.validInstitutes[1]);
		});

		it('should delete row by name', async () => {
			const rowDeleted = await BaseModel.deleteRow(
				TABLE_NAME.INSTITUTE,
				'name',
				Mock.validInstitutes[0].name
			);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(rowDeleted[0].id).toEqual(Mock.validInstitutes[0].id);
			expect(rowDeleted[0].name).toEqual(Mock.validInstitutes[0].name);
			expect(allRows).toHaveLength(1);
			expect(allRows[0].name).toEqual(Mock.validInstitutes[1].name);
		});

		it('should behave correctly when there is no row with such id to delete', async () => {
			const deletedRow = await BaseModel.deleteRow(TABLE_NAME.INSTITUTE, 'id', 5);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(allRows).toHaveLength(2);
			expect(deletedRow).toHaveLength(0);
		});

		it('should throw error not valid table', async () => {
			try {
				await BaseModel.deleteRow('something', 'id', 1);
			} catch (err) {
				expect(err.message).toEqual('relation "something" does not exist');
			}
		});
	});

	describe('TESTING: deleteRowById()', () => {
		it('should remove row correctly and return the deleted row', async () => {
			const newInstitute = Mock.validInstitutes[0];
			const createdInstitute = await BaseModel.createRow(
				TABLE_NAME.INSTITUTE,
				newInstitute,
				InstituteModel.instituteValidator
			);
			const rowsBeforeDelete = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);

			const deletedInstitute = await BaseModel.deleteRowById(
				TABLE_NAME.INSTITUTE,
				createdInstitute.id
			);
			const rowsAfterDelete = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);

			expect(rowsBeforeDelete).toHaveLength(1);
			expect(rowsAfterDelete).toHaveLength(0);
			expect(deletedInstitute[0].name).toEqual(createdInstitute.name);
			expect(deletedInstitute[0].id).toEqual(createdInstitute.id);
		});

		it('should throw error when there is no row with such id', async () => {
			const newInstitute = Mock.validInstitutes[0];
			const createdInstitute = await BaseModel.createRow(
				TABLE_NAME.INSTITUTE,
				newInstitute,
				InstituteModel.instituteValidator
			);
			const rowsBeforeDelete = await BaseModel.getAllTable(
				TABLE_NAME.INSTITUTE
			);

			// making sure that there is no row with such id
			const idToDelete = createdInstitute.id + 10;

			try {
				await BaseModel.deleteRowById(TABLE_NAME.INSTITUTE, idToDelete);
			} catch (err) {
				const rowsAfterDelete = await BaseModel.getAllTable(
					TABLE_NAME.INSTITUTE
				);
				expect(rowsBeforeDelete).toHaveLength(1);
				expect(rowsAfterDelete).toHaveLength(1);
				expect(err.message).toEqual(
					`couldn't delete row with id = ${idToDelete}`
				);
			}
		});
	});

	describe('TESTING: insertBulk()', () => {
		it('should check if insert correctly', async () => {
			const createdRows = await BaseModel.insertBulk(
				TABLE_NAME.INSTITUTE,
				Mock.validInstitutes
			);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(createdRows).toHaveLength(3);
			expect(createdRows[0].name).toEqual('clalit');
			expect(createdRows[1].name).toEqual('macabi');
			expect(createdRows[2].name).toEqual('leumit');
			expect(allRows).toHaveLength(3);
			expect(allRows[0].name).toEqual('clalit');
			expect(allRows[1].name).toEqual('macabi');
			expect(allRows[2].name).toEqual('leumit');
		});

		it('check insert not delete other rows', async () => {
			await BaseModel.insertRow(TABLE_NAME.INSTITUTE, { id: 5, name: 'shiba' });
			await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, Mock.validInstitutes);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(allRows).toHaveLength(4);
		});

		it('should throw error not valid table', async () => {
			try {
				await BaseModel.insertBulk('something', Mock.validInstitutes);
			} catch (err) {
				expect(err.message).toEqual('relation "something" does not exist');
			}
		});
	});

	describe('TESTING: updateRowByField()', () => {
		it('should check if update row', async () => {
			const newRow = await BaseModel.insertBulk(
				TABLE_NAME.INSTITUTE,
				Mock.validInstitutes
			);
			await BaseModel.updateRowByField(
				TABLE_NAME.INSTITUTE,
				{ name: 'shlomo' },
				'name',
				'clalit'
			);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			const firstRow = find(allRows, (row) => row.id === 1);
			const secondRow = find(allRows, (row) => row.id === 2);
			const thirdRow = find(allRows, (row) => row.id === 3);
			expect(firstRow.name).toEqual('shlomo');
			expect(secondRow.name).toEqual('macabi');
			expect(thirdRow.name).toEqual('leumit');
		});
		it('should check if update row for number col', async () => {
			const newRow = await BaseModel.insertBulk(
				TABLE_NAME.INSTITUTE,
				Mock.validInstitutes
			);
			await BaseModel.updateRowByField(
				TABLE_NAME.INSTITUTE,
				{ name: 'shlomo' },
				'id',
				1
			);
			const allRows = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			const firstRow = find(allRows, (row) => row.id === 1);
			const secondRow = find(allRows, (row) => row.id === 2);
			const thirdRow = find(allRows, (row) => row.id === 3);
			expect(firstRow.name).toEqual('shlomo');
			expect(secondRow.name).toEqual('macabi');
			expect(thirdRow.name).toEqual('leumit');
		});

		it('not find any to update - throw error', async () => {
			await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, Mock.validInstitutes);
			try {
				await BaseModel.updateRowByField(
					TABLE_NAME.INSTITUTE,
					{ name: 'shlomo' },
					'name',
					'fewhigfubh'
				);
			} catch (err) {
				expect(err.message).toEqual('column "fewhigfubh" does not exist');
			}
		});
		it('missing where in the function', async () => {
			await BaseModel.insertBulk(TABLE_NAME.INSTITUTE, Mock.validInstitutes);
			try {
				await BaseModel.updateRowByField(
					TABLE_NAME.INSTITUTE,
					{
						name: 'shlomo',
					},
					undefined,
					undefined
				);
			} catch (err) {
				expect(err.message).toEqual(
					'whereField undefined, or valueWhereField undefined missing'
				);
			}
		});
	});

	describe('TESTING: createRow()', () => {
		it('should enter row correctly', async () => {
			const newInstitute = Mock.validInstitutes[0];
			const rowsBefore = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			const createdInstitute = await BaseModel.createRow(
				TABLE_NAME.INSTITUTE,
				newInstitute,
				InstituteModel.instituteValidator
			);
			const rowsAfter = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
			expect(rowsBefore).toHaveLength(0);
			expect(rowsAfter).toHaveLength(1);
			expect(createdInstitute.name).toEqual(newInstitute.name);
			expect(createdInstitute.id).toEqual(newInstitute.id);
		});

		it('should not enter row when validation fails', async () => {
			const newInstitute = {};
			const rowsBefore = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);

			try {
				await BaseModel.createRow(
					TABLE_NAME.INSTITUTE,
					newInstitute,
					InstituteModel.instituteValidator
				);
			} catch (err) {
				const rowsAfter = await BaseModel.getAllTable(TABLE_NAME.INSTITUTE);
				expect(rowsBefore).toHaveLength(0);
				expect(rowsAfter).toHaveLength(0);
			}
		});

		it('should throw error not valid table', async () => {
			const newInstitute = Mock.validInstitutes[0];
			try {
				await BaseModel.createRow(
					'non',
					newInstitute,
					InstituteModel.instituteValidator
				);
			} catch (err) {
				expect(err.message).toEqual(`relation \"non\" does not exist`);
			}
		});
	});
});
