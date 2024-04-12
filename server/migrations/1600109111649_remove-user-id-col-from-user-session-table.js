exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropColumns("user_session", "user_id", { ifExist: true });
};

exports.down = (pgm) => {
  pgm.addColumns(
    "user_session",
    { user_id: { type: "integer", references: "users" }},
    { ifNotExists: true }
  );
};
