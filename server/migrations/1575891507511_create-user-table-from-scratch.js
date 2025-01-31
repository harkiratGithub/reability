/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
	// user is saved word in postgres
	pgm.createTable('users', {
		id: 'id',
		user_name: { type: 'varchar(255)', unique: true, notNull: true },
		password: { type: 'varchar(255)', notNull: true },
		status: { type: 'log_type', notNull: true, default: 'logged_out' },
		last_login: { type: 'timestamp' },
		role: { type: 'role', notNull: true },
		active: { type: 'boolean', notNull: true, default: true },
		created_at: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
		updated_at: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
		is_two_factor_enabled: { type: 'boolean', notNull: true, default: false },
		two_facor_secret: { type: 'varchar(255)', notNull: false },
		date_agreed_terms: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
		user_last_login: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
	});
	pgm.createTrigger('users', 'update_time_user', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
};

exports.down = (pgm) => {
	pgm.dropTrigger('users', 'update_time_user', { ifExist: true });
	pgm.dropTable('users', { ifExist: true });
};
