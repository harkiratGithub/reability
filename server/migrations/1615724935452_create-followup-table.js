exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("followup", {
    id: "id",
    patient_id: {
      type: "integer",
      references: "patient",
      onDelete: "SET NULL",
    },
    therapist_id: {
      type: "integer",
      references: "therapist",
      onDelete: "SET NULL",
    },
    date: {
      type: "date",
      notNull: true,
    },
    description: { type: "varchar(80)", notNull: true },
    done: { type: "boolean", notNull: true, default: false },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("followup", { ifExist: true });
};
