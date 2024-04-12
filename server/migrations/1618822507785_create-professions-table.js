exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('profession', {
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
    },
    active: {
        type: 'boolean',
        notNull: true,
        default: true
      }
  });
  pgm.createTrigger('profession', 'update_time_profession', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('profession', 'update_time_profession', { ifExist: true });
  pgm.dropTable('profession', { ifExist: true });
};
