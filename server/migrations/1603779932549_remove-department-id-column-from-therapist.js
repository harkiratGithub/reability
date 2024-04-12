/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
    pgm.dropColumns("therapist", "department_id", { ifExist: true });
};

exports.down = pgm => {
    pgm.addColumns(
        "therapist",
        { department_id: { type: "integer", references: "department" } },
        { ifNotExists: true }
    );
};
