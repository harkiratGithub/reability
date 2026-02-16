/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.createTable('session_log', {
		id: 'id',
		peer_id: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
		therapist_id: { type: 'integer', references: 'therapist', onDelete: 'SET NULL' },
		patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
		status: { type: 'text', notNull: true },
		created_at: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
	});
};

exports.down = (pgm) => {
	pgm.dropTable('session_log', { ifExists: true });
};
