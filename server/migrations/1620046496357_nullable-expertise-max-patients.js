exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.alterColumn('expertise', 'max_patients', { allowNull: true });
};

exports.down = (pgm) => {
    pgm.alterColumn('expertise', 'max_patients', { notNull: true });
};
