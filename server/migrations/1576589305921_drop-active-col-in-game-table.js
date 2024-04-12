/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.dropColumns('game', 'active', { ifExist: true });
};

exports.down = pgm => {
  pgm.addColumns('game', 'active', { ifNotExists: true });
};
