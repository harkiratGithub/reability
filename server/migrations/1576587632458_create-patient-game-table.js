/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('patient_game', {
    id: 'id',
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    game_id: {
      type: 'integer',
      references: 'game',
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
  pgm.dropTable('patient_game', { ifExist: true });
};
