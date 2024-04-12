exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('patient', { disabled_skeleton: { type: 'boolean', notNull: true, default: true } }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('patient', 'disabled_skeleton', { ifExist: true });
};