exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.renameColumn('patient', 'arrived_by', 'referral');
};

exports.down = (pgm) => {
	pgm.renameColumn('patient', 'referral', 'arrived_by');
};
