/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('session', {
    id: 'id',
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    therapist_id: { type: 'integer', references: 'therapist', onDelete: 'SET NULL' },
    patient_start_time: {
      type: 'timestamp',
      notNull: true
    },
    patient_end_time: {
      type: 'timestamp'
    },
    therapist_start_time: {
      type: 'timestamp'
    },
    therapist_end_time: {
      type: 'timestamp'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('session', { ifExist: true });
};
