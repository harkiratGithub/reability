/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('therapist_patient', {
    id: 'id',
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    therapist_id: {
      type: 'integer',
      references: 'therapist',
      onDelete: 'SET NULL'
    },
    active: { type: 'boolean', notNull: true, default: true },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('therapist_patient', { ifExist: true });
};
