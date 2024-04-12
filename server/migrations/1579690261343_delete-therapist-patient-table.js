/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  pgm.dropTable('therapist_patient', { ifExists: true });
};

exports.down = pgm => {};
