exports.shorthands = undefined;


exports.up = pgm => {
    pgm.addColumns('users', { fast_login_token: { type: 'text' } }, { ifNotExists: true });
    pgm.addColumns('users', { fast_login_token_timestamp: { type: 'timestamp' } }, { ifNotExists: true });
  };
  
  exports.down = pgm => {
    pgm.dropColumns('users', ['fast_login_token', 'fast_login_token_timestamp'], { ifExist: true });
  };
  
