/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('game_metadata', {
		id: 'id',
		video_name: { type: 'varchar(255)', onDelete: 'SET NULL' },
		video_index: { type: 'integer', onDelete: 'SET NULL' },
		game_id: { type: 'integer', references: 'game', onDelete: 'SET NULL' },
		settings: { type: 'jsonb', notNull: 'true', default: '{}' },
		landmarks: { type: 'jsonb', notNull: 'true', default: '{}' },
		landmarks_pointer: { type: 'jsonb', notNull: 'true', default: '{}' },
		landmarks_line_pointer: { type: 'jsonb', notNull: 'true', default: '{}' },
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
	});
	pgm.createTrigger('game_metadata', 'update_time_game_metadata', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
};

exports.down = (pgm) => {
	pgm.dropTrigger('game_metadata', 'update_time_game_metadata', { ifExist: true });
	pgm.dropTable('game_metadata', { ifExist: true });
};
