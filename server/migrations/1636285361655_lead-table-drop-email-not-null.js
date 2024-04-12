exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.alterColumn('lead', 'email', { notNull: false });
	pgm.addColumns('lead', {
		referral: { type: 'varchar(255)' },
	});
};

exports.down = (pgm) => {
	pgm.alterColumn('lead', 'email', { notNull: true });
	pgm.dropColumns('lead', 'referral', { ifExist: true });
};
