exports.shorthands = undefined;

exports.up = pgm => {
  pgm.dropColumns('therapist', 'email', { ifExist: true });
  pgm.addColumns('users', { email: { type: 'varchar(255)', notNull: true, default: '' } });
};

exports.down = pgm => {
  pgm.addColumns(
    'therapist',
    { email: { type: 'varchar(255)', unique: true, notNull: true } },
    { ifNotExists: true }
  );
  pgm.dropColumns('users', 'email', { ifExist: true });
};
