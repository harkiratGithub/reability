/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('patient_game_metadata', {
		id: 'id',
		video_name: { type: 'integer', onDelete: 'SET NULL' },
		game_id: { type: 'integer', references: 'game', onDelete: 'SET NULL' },
		patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
		settings: { type: 'jsonb', notNull: 'true', default: '{}' },
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
	pgm.createTrigger('patient_game_metadata', 'update_time_patient_game_metadata', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
};

exports.down = (pgm) => {
	pgm.dropTrigger('patient_game_metadata', 'update_time_patient_game_metadata', { ifExist: true });
	pgm.dropTable('patient_game_metadata', { ifExist: true });
};
