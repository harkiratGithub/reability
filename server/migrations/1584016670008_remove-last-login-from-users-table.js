/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropColumns('users', 'last_login', { ifExist: true });
};

exports.down = (pgm) => {
  pgm.addColumns('users', 'last_login', { ifNotExist: true });
};
