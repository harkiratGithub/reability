exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('admin', {
		id: 'id',
		first_name: { type: 'varchar(255)', notNull: true },
		last_name: { type: 'varchar(255)', notNull: true },
		phone: { type: 'varchar(255)' },
		user_id: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
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
		active: { type: 'boolean', notNull: true, default: true },
	});
	pgm.createTrigger('admin', 'update_time_admin', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
};

exports.down = (pgm) => {
	pgm.dropTrigger('admin', 'update_time_admin', { ifExist: true });
	pgm.dropTable('admin', { ifExist: true });
};
