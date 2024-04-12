/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType("gender_type", ["male", "female"]);
  pgm.createType("log_type", ["logged_in", "logged_out"]);
  pgm.createType("role", ["admin", "therapist", "patient"]);
  pgm.createFunction(
    "update_timestamp",
    [],
    { returns: "TRIGGER", language: "plpgsql", replace: "CREATE OR REPLACE" },
    `BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;`
  );
};

exports.down = (pgm) => {
  pgm.dropFunction("update_timestamp", [], { ifExists: true });
  pgm.dropType("gender_type");
  pgm.dropType("log_type");
};
