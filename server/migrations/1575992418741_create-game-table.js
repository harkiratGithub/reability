/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('game', {
    id: 'id',
    name: { type: 'varchar(255)', unique: true, notNull: true },
    url: { type: 'varchar(255)', unique: true, notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
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
  pgm.createTrigger('game', 'update_time_game', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('game', 'update_time_game', { ifExist: true });
  pgm.dropTable('game', { ifExist: true });
};
