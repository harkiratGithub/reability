/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('institute', {
    id: 'id',
    name: { type: 'varchar(255)', unique: true, notNull: true },
    image_id: {
      type: 'integer',
      references: 'image',
      onDelete: 'SET NULL'
    },
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
  pgm.createTrigger('institute', 'update_time_institute', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('institute', 'update_time_institute', { ifExist: true });
  pgm.dropTable('institute', { ifExist: true });
};
