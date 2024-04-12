exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable(
		'user_game_data',
		{
			id: 'id',
			game_id: {
				type: 'integer',
				references: 'game',
				onDelete: 'SET NULL',
			},
			user_id: {
				type: 'integer',
				references: 'users',
				onDelete: 'SET NULL',
			},
			subject: { type: 'varchar(255)', notNull: true },
			drawer: { type: 'varchar(255)', notNull: true },
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
	pgm.createTrigger('user_game_data', 'update_time_user_game_data', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
	pgm.createIndex('user_game_data', 'id');
};

exports.down = (pgm) => {
	pgm.dropIndex('user_game_data', 'id');
	pgm.dropTrigger('user_game_data', 'update_time_user_game_data', { ifExist: true });
	pgm.dropTable('user_game_data', { ifExist: true });
};
