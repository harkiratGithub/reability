exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addColumns(
		'game_data',
		{ target_answer: { type: 'jsonb', notNull: 'true', default: '{}' } },
		{ ifNotExists: true }
	);
};

exports.down = (pgm) => {
	pgm.dropColumns('game_data', ['target_answer'], { ifExist: true });
};
