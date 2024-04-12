exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addConstraint('user_filters', 'user_id_unique_key', {
    unique: 'user_id'
  });
};

exports.down = pgm => {
  pgm.dropConstraint('user_filters', 'user_id_unique_key', { ifExists: true });
};
