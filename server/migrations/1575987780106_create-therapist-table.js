/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('therapist', {
    id: 'id',
    first_name: { type: 'varchar(255)', notNull: true },
    last_name: { type: 'varchar(255)', notNull: true },
    identity_number: { type: 'varchar(255)', unique: true },
    phone: { type: 'varchar(255)' },
    email: { type: 'varchar(255)', unique: true, notNull: true },
    department_id: {
      type: 'integer',
      references: 'department',
      onDelete: 'SET NULL'
    },
    user_id: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
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
  pgm.createTrigger('therapist', 'update_time_therapist', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('therapist', 'update_time_therapist', { ifExist: true });
  pgm.dropTable('therapist', { ifExist: true });
};
