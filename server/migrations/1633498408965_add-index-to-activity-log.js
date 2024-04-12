exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createIndex('activity_log', 'user_id');
};

exports.down = (pgm) => {
	pgm.dropIndex('activity_log', 'user_id');
};
