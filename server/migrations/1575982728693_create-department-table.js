/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('department', {
    id: 'id',
    name: { type: 'varchar(255)', unique: true, notNull: true },
    institute_id: {
      type: 'integer',
      references: 'institute',
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
  pgm.createTrigger('department', 'update_time_department', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
  pgm.addConstraint('department', 'department_constraint', { unique: ['name', 'institute_id'] });
};

exports.down = pgm => {
  pgm.dropConstraint('department', 'department_constraint', { ifExists: true });
  pgm.dropTrigger('department', 'update_time_department', { ifExist: true });
  pgm.dropTable('department', { ifExist: true });
};
