/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
    pgm.dropColumns("patient", "department_id", { ifExist: true });
};

exports.down = pgm => {
    pgm.addColumns(
        "patient",
        { department_id: { type: "integer", references: "department" } },
        { ifNotExists: true }
    );
};
