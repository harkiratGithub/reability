/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('therapist_session', {
    id: 'id',
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    therapist_id: { type: 'integer', references: 'therapist', onDelete: 'SET NULL' },
    start_time: {
      type: 'timestamp',
      notNull: true
    },
    end_time: {
      type: 'timestamp',
      notNull: true
    }
  });

  pgm.createTable('game_session', {
    id: 'id',
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    game_id: { type: 'integer', references: 'game', onDelete: 'SET NULL' },
    game_settings_id: {
      type: 'integer',
      references: 'game_settings',
      onDelete: 'SET NULL'
    },
    game_score: { type: 'integer' },
    game_summary: { type: 'jsonb', notNull: 'true', default: '{}' },
    therapist_session_id: {
      type: 'integer',
      references: 'therapist_session',
      onDelete: 'SET NULL'
    },
    start_time: {
      type: 'timestamp',
      notNull: true
    },
    end_time: {
      type: 'timestamp'
    },
    session_feedback: { type: 'jsonb', notNull: 'true', default: '{}' },
  });
};

exports.down = pgm => {
  pgm.dropTable('session_game', { ifExists: true });
  pgm.dropTable('session', { ifExists: true });
};
