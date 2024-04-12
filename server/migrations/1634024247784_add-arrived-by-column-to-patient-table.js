exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addColumns('patient', {
		arrived_by: { type: 'varchar(255)' },
	});
};

exports.down = (pgm) => {
	pgm.dropColumns('patient', 'arrived_by', { ifExist: true });
};
