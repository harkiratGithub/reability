/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'institute',
    { active: { type: 'boolean', notNull: true, default: true } },
    { ifNotExists: true }
  );
  pgm.addColumns(
    'department',
    { active: { type: 'boolean', notNull: true, default: true } },
    { ifNotExists: true }
  );
  pgm.addColumns(
    'therapist',
    { active: { type: 'boolean', notNull: true, default: true } },
    { ifNotExists: true }
  );
  pgm.addColumns(
    'patient',
    { active: { type: 'boolean', notNull: true, default: true } },
    { ifNotExists: true }
  );
};

exports.down = pgm => {
  pgm.dropColumns('institute', 'active', { ifExist: true });
  pgm.dropColumns('department', 'active', { ifExist: true });
  pgm.dropColumns('therapist', 'active', { ifExist: true });
  pgm.dropColumns('patient', 'active', { ifExist: true });
};
