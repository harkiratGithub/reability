exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('lead', {
		id: 'id',
		patient_id: { references: 'patient', type: 'integer', },
		first_name: { type: 'varchar(255)', notNull: true },
		last_name: { type: 'varchar(255)', notNull: true },
		phone: { type: 'varchar(255)', notNull: true },
		email: { type: 'varchar(255)', notNull: true },
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
  { ifNotExists: true });
	pgm.createTrigger('lead', 'update_time_lead', {
		when: 'BEFORE',
		operation: 'UPDATE',
		function: 'update_timestamp',
		level: 'ROW',
	});
	pgm.createIndex('lead', 'id');
};

exports.down = (pgm) => {
	pgm.dropIndex('lead', 'id');
	pgm.dropTrigger('lead', 'update_time_lead', { ifExist: true });
	pgm.dropTable('lead', { ifExist: true });
};
