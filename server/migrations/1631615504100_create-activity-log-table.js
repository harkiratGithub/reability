exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('activity_log', {
		id: 'id',
		user_id: { references: 'users', type: 'integer', notNull: true },
		action: { type: 'varchar(255)', notNull: true },
		table_name: { type: 'varchar(255)', notNull: true },
		row_id: { type: 'integer', notNull: true },
		performed_by_user_id: { references: 'users', type: 'integer', notNull: true },
		old_values: { type: 'json' },
		new_values: { type: 'json' },
		remarks: { type: 'varchar(255)' },
		created_at: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
	});
	pgm.addConstraint('activity_log', 'action_check', { check: "action IN ('Update' , 'Delete' , 'Create')" });
};

exports.down = (pgm) => {
	pgm.dropConstraint('activity_log', 'action_check', { ifExist: true });
	pgm.dropTable('activity_log', { ifExist: true });
};
