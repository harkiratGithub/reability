exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('therapist_expertise', {
    id: 'id',
    therapist_id: {
        type: 'integer',
        references: 'therapist',
        onDelete: 'SET NULL'
      },
    expertise_id: {
      type: 'integer',
      references: 'expertise',
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
    type: {
      type: 'varchar(255)',
      notNull: false
    }
  });
  pgm.createTrigger('therapist_expertise', 'update_time_therapist_expertise', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
  pgm.addConstraint('therapist_expertise', 'therapist_expertise_constraint', { unique: ['therapist_id', 'expertise_id'] });
};

exports.down = pgm => {
  pgm.dropConstraint('therapist_expertise', 'therapist_expertise_constraint', { ifExists: true });
  pgm.dropTrigger('therapist_expertise', 'update_time_therapist_expertise', { ifExist: true });
  pgm.dropTable('therapist_expertise', { ifExist: true });
};
