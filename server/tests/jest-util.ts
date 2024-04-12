export const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

// see use in users-helper.spec.js - TESTING: create()
export const spyConsole = () => {
	const spy: any = {};

	beforeAll(() => {
		spy.console = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterAll(() => {
		spy.console.mockRestore();
	});

	return spy;
};
