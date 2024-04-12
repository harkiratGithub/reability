exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.addConstraint('therapist_departments', 'therapist_departments_uniq_constraint', { unique: ['therapist_id', 'department_id'] });
};

exports.down = (pgm) => {

};
