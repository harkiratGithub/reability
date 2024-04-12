/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('patient_departments', {
        id: 'id',
        patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
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
    pgm.dropTable('patient_departments', { ifExist: true });
};
