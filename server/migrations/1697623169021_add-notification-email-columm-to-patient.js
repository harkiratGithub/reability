exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addColumns('patient', { notification_email: { type: 'varchar(255)', default: '' } });
};

exports.down = (pgm) => {
	pgm.dropColumns('patient', ['notification_email'], { ifExist: true });
};
