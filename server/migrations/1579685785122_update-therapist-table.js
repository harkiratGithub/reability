/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.alterColumn('therapist', 'last_name', { allowNull: true });
  pgm.dropConstraint('therapist', 'therapist_identity_number_key', { ifExists: true });
};

exports.down = pgm => {
  pgm.alterColumn('therapist', 'last_name', { notNull: true });
  pgm.addConstraint('therapist', 'therapist_identity_number_key', {
    unique: 'identity_number'
  });
};
