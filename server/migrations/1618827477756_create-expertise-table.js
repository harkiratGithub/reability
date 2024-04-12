exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('expertise', {
    id: 'id',
    name: { type: 'varchar(255)', unique: true, notNull: true },
    profession_id: {
      type: 'integer',
      references: 'profession',
      onDelete: 'SET NULL'
    },
    max_patients: {
        type: 'integer',
        notNull: true,
        default: 1
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
  pgm.createTrigger('expertise', 'update_time_expertise', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
  pgm.addConstraint('expertise', 'expertise_constraint', { unique: ['name', 'profession_id'] });
};

exports.down = pgm => {
  pgm.dropConstraint('expertise', 'expertise_constraint', { ifExists: true });
  pgm.dropTrigger('expertise', 'update_time_expertise', { ifExist: true });
  pgm.dropTable('expertise', { ifExist: true });
};
