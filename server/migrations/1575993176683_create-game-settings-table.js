/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('game_settings', {
    id: 'id',
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    game_id: { type: 'integer', references: 'game', onDelete: 'SET NULL' },
    settings: { type: 'jsonb', notNull: 'true', default: '{}' },

    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
  pgm.createTrigger('game_settings', 'update_time_game_settings', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('game_settings', 'update_time_game_settings', { ifExist: true });
  pgm.dropTable('game_settings', { ifExist: true });
};
