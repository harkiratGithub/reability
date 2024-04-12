exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable(
		'lead_reminder',
		{
			id: 'id',
			lead_id: { references: 'lead', type: 'integer', onDelete: 'cascade', notNull: true },
			reminder: { type: 'varchar(255)', notNull: true },
			performed_by_user_id: { references: 'users', type: 'integer', notNull: true },
			created_at: {
				type: 'timestamp',
				notNull: true,
				default: pgm.func('current_timestamp'),
			},
		},
		{ ifNotExists: true }
	);
	pgm.createIndex('lead_reminder', 'lead_id');
};

exports.down = (pgm) => {
	pgm.dropIndex('lead_reminder', 'lead_id');
	pgm.dropTable('lead_reminder', { ifExist: true });
};
