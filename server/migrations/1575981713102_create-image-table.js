/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('image', {
    id: 'id',
    key: { type: 'text', unique: true, notNull: true },
    url: { type: 'text', unique: true, notNull: true }
  });
};

exports.down = pgm => {
  pgm.dropTable('image', { ifExist: true });
};
