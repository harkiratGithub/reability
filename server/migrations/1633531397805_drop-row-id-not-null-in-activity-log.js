exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('activity_log', 'row_id', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('activity_log', 'row_id', { notNull: true });
};
