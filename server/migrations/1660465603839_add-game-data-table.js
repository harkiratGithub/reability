exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable(
		'game_data',
		{
			id: 'id',
			game_id: {
				type: 'integer',
				references: 'game',
				onDelete: 'SET NULL',
			},
			worksheet: { type: 'varchar(255)', notNull: true },
			tags: { type: 'jsonb', notNull: 'true', default: '{}' },
			data: { type: 'jsonb', notNull: 'true', default: '{}' },
			active: { type: 'boolean', notNull: true, default: true },
			created_at: {
				type: 'timestamp',
				notNull: true,
				default: pgm.func('current_timestamp'),
			},
			updated_at: {
				type: 'timestamp',
				notNull: true,
				default: pgm.func('current_timestamp'),
			},
		},
		{ ifNotExists: true }
	);
	pgm.createTrigger('game_data', 'update_time_game_data', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
	pgm.createIndex('game_data', 'id');
};

exports.down = (pgm) => {
	pgm.dropIndex('game_data', 'id');
	pgm.dropTrigger('game_data', 'update_time_game_data', { ifExist: true });
	pgm.dropTable('game_data', { ifExist: true });
};
