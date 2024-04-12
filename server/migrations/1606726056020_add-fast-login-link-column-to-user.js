exports.shorthands = undefined;


exports.up = pgm => {
    pgm.addColumns('users', { fast_login_link: { type: 'text' } }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('users', ['fast_login_link'], { ifExist: true });
};

