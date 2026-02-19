exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('features', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    feature_name: {
      type: 'varchar(255)',
      notNull: true
    },
    created_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
    },
    updated_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
    },
    status: {
      type: 'boolean',
      notNull: true,
      default: false
    }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('features');
};
