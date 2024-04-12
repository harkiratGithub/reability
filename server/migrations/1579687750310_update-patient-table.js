/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.alterColumn('patient', 'last_name', { allowNull: true });
  pgm.dropConstraint('patient', 'patient_identity_number_key', { ifExists: true });
};

exports.down = pgm => {
  pgm.alterColumn('patient', 'last_name', { notNull: true });
  pgm.addConstraint('patient', 'patient_identity_number_key', {
    unique: 'identity_number'
  });
};
