/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('therapist_departments', {
        id: 'id',
        therapist_id: { type: 'integer', references: 'therapist', onDelete: 'SET NULL' },
        department_id: {
            type: 'integer',
            references: 'department',
            onDelete: 'SET NULL'
        },
        assigned_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });
};

exports.down = pgm => {
    pgm.dropTable('therapist_departments', { ifExist: true });
};
