/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addConstraint('booking', 'patient_booking_constraint', {
		unique: ['patient_treatment_id', 'year', 'week_number', 'week_day', 'time'],
	});
};

exports.down = (pgm) => {
	pgm.dropConstraint('booking', 'patient_booking_constraint', { ifExists: true });
};
