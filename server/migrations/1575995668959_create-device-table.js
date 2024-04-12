/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('device', {
    id: 'id',
    d_id: { type: 'integer', notNull: 'true' },
    patient_id: { type: 'integer', references: 'patient', onDelete: 'SET NULL' },
    model: { type: 'varchar(255)', unique: true, notNull: true },
    token: { type: 'varchar(255)', unique: true, notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('device', { ifExist: true });
};
