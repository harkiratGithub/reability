exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createType('severity_types', ['High', 'Medium', 'Low'], { ifNotExists: true });
	pgm.createTable('server_log', {
		id: 'id',
		error_type: {
			type: 'varchar(255)',
		},
		description: {
			type: 'text',
		},
		severity: {
			type: 'severity_types',
		},
		game_id: {
			type: 'integer',
			references: 'game',
		},
		reported_by_user_id: {
			type: 'integer',
			references: 'users',
		},
		patient_id: {
			type: 'integer',
			references: 'patient',
		},
		therapist_id: {
			type: 'integer',
			references: 'therapist',
		},
		created_at: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
	});
};

exports.down = (pgm) => {
	pgm.dropTable('server_log', { ifExist: true });
	pgm.dropType('severity_types');
};
