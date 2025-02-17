export default (() => {
	let db;

	function createDbPool() {
		const { Pool } = require('pg');
		require('dotenv').config();
		let pool;
		console.log(process.env.NODE_ENV);

		if (
			process.env.NODE_ENV === 'production' ||
			process.env.NODE_ENV === 'staging'
		) {
			pool = new Pool({
				ssl: true,
				connectionString: process.env.DATABASE_URL,
			});
		} else if (process.env.NODE_ENV === 'development') {
			pool = new Pool({
				user: process.env.USERNAME_DEV,
				host: process.env.HOST_DEV,
				password: process.env.PASSWORD_DEV,
				database: process.env.DB_DEV,
				ssl: true,
			});
		} else if (process.env.NODE_ENV === 'test') {
			pool = new Pool({
				user: process.env.USERNAME_TEST,
				host: process.env.HOST_TEST,
				password: process.env.PASSWORD_TEST,
				database: process.env.DB_TEST,
			});
		} else {
			throw new Error(
				'No node environment recognized. Please add NODE_ENV entry in your .env file'
			);
		}
		// https://stackoverflow.com/questions/20712291/use-node-postgres-to-get-postgres-timestamp-without-timezone-in-utc
		overrideTimestamp();
		return pool;
	}

	function getInstance() {
		if (!db) {
			db = createDbPool();
		}
		return db;
	}

	function overrideTimestamp() {
		const types = require('pg').types;
		types.setTypeParser(1114, function (stringValue) {
			return stringValue;
		});
	}

	return {
		getDataBase: getInstance,
	};
})();
