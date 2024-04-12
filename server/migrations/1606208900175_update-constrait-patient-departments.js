exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.addConstraint('patient_departments', 'patient_departments_uniq_constraint', { unique: ['patient_id', 'department_id'] });
};

exports.down = (pgm) => {

};
