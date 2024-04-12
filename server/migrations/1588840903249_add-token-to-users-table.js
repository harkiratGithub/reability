exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns('users', { token: { type: 'text' } }, { ifNotExists: true });
  pgm.addColumns('users', { token_timestamp: { type: 'timestamp' } }, { ifNotExists: true });
};

exports.down = pgm => {
  pgm.dropColumns('users', ['token', 'token_timestamp'], { ifExist: true });
};
