exports.shorthands = undefined;


exports.up = pgm => {
    pgm.addColumns('expertise', { duration: { type: 'integer', notNull: true, default:45 } }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('expertise', ['duration'], { ifExist: true });
};

