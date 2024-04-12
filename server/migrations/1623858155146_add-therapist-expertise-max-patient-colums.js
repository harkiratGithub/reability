exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addColumns('therapist_expertise', {
		max_patients: { type: 'integer', notNull: false },
	});
};

exports.down = (pgm) => {
	pgm.dropColumns('therapist_expertise', 'max_patients', { ifExist: true });
};
