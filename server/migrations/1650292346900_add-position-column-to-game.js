exports.shorthands = undefined;


exports.up = pgm => {
    pgm.addColumns('game', { position: { type: 'integer', notNull: true, default:1000 } }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('game', ['position'], { ifExist: true });
};

