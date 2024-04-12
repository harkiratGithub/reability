exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("user_session", {
    sid: "varchar",
    user_id: { type: "integer", references: "users" },
    sess: { type: "json", notNull: true },
    expire: { type: "timestamp(6)", notNull: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("user_session", "session_pkey", { primaryKey: "sid" });
};

exports.down = (pgm) => {
  pgm.dropTable({ name: "user_session" }, { ifExists: true });
};
