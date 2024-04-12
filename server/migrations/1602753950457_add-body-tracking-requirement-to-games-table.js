exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('game', { body_track_required: { type: 'boolean' } }, { ifNotExists: false });
};

exports.down = pgm => {
    pgm.dropColumns('game', ['body_track_required'], { ifExist: false });
};
