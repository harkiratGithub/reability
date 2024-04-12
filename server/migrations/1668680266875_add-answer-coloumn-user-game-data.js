exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addColumns(
		'user_game_data',
		{ answer: { type: 'jsonb', notNull: 'true', default: '{}' } },
		{ ifNotExists: true }
	);
};

exports.down = (pgm) => {
	pgm.dropColumns('user_game_data', ['answer'], { ifExist: true });
};
