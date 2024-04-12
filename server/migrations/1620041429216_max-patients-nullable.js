exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.alterColumn('patient_treatment', 'max_patients', { allowNull: true });
};

exports.down = (pgm) => {
    pgm.alterColumn('patient_treatment', 'max_patients', { notNull: true });
};
