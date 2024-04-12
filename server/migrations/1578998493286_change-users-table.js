/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.dropColumns('users', 'status', { ifExist: true });
  pgm.addColumns('users', { last_heart_beat: { type: 'timestamp' } }, { ifNotExists: true });
};

exports.down = pgm => {
  pgm.addColumns('users', 'status', { ifNotExists: true });
  pgm.dropColumns('users', 'last_heart_beat', { ifExist: true });
};
