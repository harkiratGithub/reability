exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('availability', {
    id: 'id',
    user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
    },
    week: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    year: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    availability: {
      type: 'json',
      notNull: true,
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
  });
  pgm.createTrigger('availability', 'update_time_availability', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW',
  });
  pgm.addConstraint('availability', 'week_constraint', {
    check: 'week BETWEEN 0 AND 52',
  });
  pgm.addConstraint('availability', 'year_constraint', {
    check: 'year BETWEEN 2021 AND 2400 OR year = 0',
  });
  pgm.addConstraint('availability', 'availability_constraint', { unique: ['user_id', 'week', 'year'] });
};

exports.down = (pgm) => {
  pgm.dropConstraint('availability', 'week_constraint', { ifExists: true });
  pgm.dropConstraint('availability', 'year_constraint', { ifExists: true });
  pgm.dropConstraint('availability', 'availability_constraint', { ifExists: true });
  pgm.dropTrigger('availability', 'update_time_availability', { ifExist: true });
  pgm.dropTable('availability', { ifExist: true });
};
