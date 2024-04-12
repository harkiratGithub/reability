import * as Model from '../../models/util.model';

const validationObject = [
	{ key: 'a', type: 'string', required: true },
	{ key: 'b', type: 'string', required: false },
	{ key: 'c', type: 'number', required: true },
	{ key: 'd', type: 'number', required: false },
	{ key: 'e', type: 'object', required: true },
	{ key: 'f', type: 'object', required: false },
];

describe('TEST UTIL MODEL', () => {
	describe('TESTING: modelValidator()', () => {
		it('should check if object with all the required get true', async () => {
			const exampleObject = {
				a: 'david',
				c: 127,
				e: new Date(),
			};
			const result = Model.modelValidator(
				validationObject,
				exampleObject,
				'test'
			);
			expect(result).toBeTruthy();
		});

		it('should check if object with all the parameters', () => {
			const exampleObject = {
				a: 'david',
				b: 'shlomo',
				c: 127,
				d: 127,
				e: new Date(),
				f: new Date(),
			};
			const result = Model.modelValidator(
				validationObject,
				exampleObject,
				'test'
			);
			expect(result).toBeTruthy();
		});

		it('should check if object with required missing', () => {
			const exampleObject = {
				b: 'shlomo',
				c: 127,
				d: 127,
				e: new Date(),
				f: new Date(),
			};
			try {
				Model.modelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: a missing');
			}
		});

		it('should check if object empty', () => {
			const exampleObject = {};
			try {
				Model.modelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: a missing');
			}
		});

		it('should check if send object instead of string', () => {
			const exampleObject = {
				a: new Date(),
				b: 'shlomo',
				c: 127,
				d: 127,
				e: new Date(),
				f: new Date(),
			};
			try {
				Model.modelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: a not string');
			}
		});

		it('should check if send number instead of string', () => {
			const exampleObject = {
				a: 127,
				b: 'shlomo',
				c: 127,
				d: 127,
				e: new Date(),
				f: new Date(),
			};
			try {
				Model.modelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: a not string');
			}
		});

		it('should check if send second required missing', () => {
			const exampleObject = {
				a: 'david',
				b: 'shlomo',
				d: 127,
				e: new Date(),
				f: new Date(),
			};
			try {
				Model.modelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: c missing');
			}
		});
	});

	describe('TESTING: updateModelValidator()', () => {
		it('should check if send empty ok', () => {
			const exampleObject = {};
			const result = Model.updateModelValidator(
				validationObject,
				exampleObject,
				'test'
			);
			expect(result).toBeTruthy();
		});

		it('should check if send one parameter of required works', () => {
			const exampleObject = { a: 'shlomo' };
			const result = Model.updateModelValidator(
				validationObject,
				exampleObject,
				'test'
			);
			expect(result).toBeTruthy();
		});

		it('should check if send one parameter works', () => {
			const exampleObject = { b: 'shlomo' };
			const result = Model.updateModelValidator(
				validationObject,
				exampleObject,
				'test'
			);
			expect(result).toBeTruthy();
		});

		it('should check if not valid to a required parameter works', () => {
			const exampleObject = { a: 127 };
			try {
				Model.updateModelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: a not string');
			}
		});

		it('should check if not valid to not a required parameter works', () => {
			const exampleObject = { b: 127 };
			try {
				Model.updateModelValidator(validationObject, exampleObject, 'test');
			} catch (err) {
				expect(err.message).toEqual('test: b not string');
			}
		});
	});
});
