/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('patient', {
    id: 'id',
    first_name: { type: 'varchar(255)', notNull: true },
    last_name: { type: 'varchar(255)', notNull: true },
    identity_number: { type: 'varchar(255)', unique: true },
    phone: { type: 'varchar(255)' },
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
  pgm.createTrigger('patient', 'update_time_patient', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('patient', 'update_time_patient', { ifExist: true });
  pgm.dropTable('patient', { ifExist: true });
};
