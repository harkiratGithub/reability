/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('department', 'department_name_key', {ifExists: true});
};

exports.down = (pgm) => {
  pgm.addConstraint('department', 'department_name_key', {unique: ['name']});
};
