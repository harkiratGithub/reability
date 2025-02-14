exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('user_filters', {
		id: 'id',
		user_id: {
			type: 'integer',
			references: 'users',
			notNull: true,
			onDelete: 'CASCADE',
		},
		department_ids: { type: 'integer[]' },
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
		institute_ids: { type: 'integer[]' },

	});

	pgm.createTrigger('user_filters', 'update_time_user_filter', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
	pgm.createIndex('user_filters', 'user_id');
};

exports.down = (pgm) => {
	pgm.dropIndex('user_filters', 'user_id');
	pgm.dropTrigger('user_filters', 'update_time_user_filter', { ifExist: true });
	pgm.dropTable('user_filters', { ifExist: true });
};
