exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createType('therapist_types', ['Regular', 'Manager']);
	pgm.addColumns('therapist', { therapist_type: { type: 'therapist_types', default: 'Regular' } });
};

exports.down = (pgm) => {
	pgm.dropColumns('therapist', ['therapist_type'], { ifExist: true });
	pgm.dropType('therapist_types');
};
