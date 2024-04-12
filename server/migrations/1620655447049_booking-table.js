/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createType('week_day', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

	pgm.createTable('booking', {
		id: 'id',
		therapist_id: {
			type: 'integer',
			references: 'therapist',
			notNull: true,
		},
		patient_treatment_id: {
			type: 'integer',
			references: 'patient_treatment',
			notNull: true,
		},
		year: { type: 'integer', notNull: true },
		week_number: { type: 'integer', notNull: true },
		week_day: { type: 'week_day', notNull: true },
		time: { type: 'real', notNull: true },
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
	});
	pgm.createTrigger('booking', 'update_time_booking', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
	pgm.addConstraint('booking', 'time_valid', { check: 'time >= 0 and time < 24' });
	pgm.addConstraint('booking', 'week_number_valid', { check: 'week_number > 0 and week_number < 54' });
	pgm.addConstraint('booking', 'year_valid', { check: 'year > 2020 and year < 2100' });
};

exports.down = (pgm) => {
	pgm.dropConstraint('booking', 'year_valid', { ifExist: true });
	pgm.dropConstraint('booking', 'week_number_valid', { ifExist: true });
	pgm.dropConstraint('booking', 'time_valid', { ifExist: true });
	pgm.dropTrigger('booking', 'update_time_booking', { ifExist: true });
	pgm.dropTable('booking', { ifExist: true });
	pgm.dropType('week_day', { ifExist: true });
};
