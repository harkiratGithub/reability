/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.renameColumn('users', 'last_heart_beat', 'logged_in_at');
  pgm.addColumns('users', { logged_out_at: { type: 'timestamp' } }, { ifNotExists: true });
  pgm.dropTable('session_game',  { ifExists: true });
  pgm.dropTable('session', { ifExists: true });
};

exports.down = pgm => {
};
