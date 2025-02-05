/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('session_game', {
    id: 'id',
    session_id: { type: 'integer', references: 'session', onDelete: 'SET NULL' },
    game_id: { type: 'integer', references: 'game', onDelete: 'SET NULL' },
    game_settings_id: {
      type: 'integer',
      references: 'game_settings',
      onDelete: 'SET NULL'
    },
    game_score: { type: 'integer' },
    game_summary: { type: 'jsonb', notNull: 'true', default: '{}' },
    started_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    ended_at: {
      type: 'timestamp'
    },
    session_feedback: { type: 'jsonb', notNull: 'true', default: '{}' },
  });
};

exports.down = pgm => {
  pgm.dropTable('session_game', { ifExist: true });
};
