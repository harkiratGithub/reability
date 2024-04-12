/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.createType("new_role", [
    "admin",
    "therapist",
    "patient",
    "video_patient",
  ]);
  pgm.alterColumn("users", "role", {
    type: "text",
    using: `role::text::new_role`,
  });
  pgm.dropType("role");
  pgm.createType("role", ["admin", "therapist", "patient", "video_patient"]);
  pgm.alterColumn("users", "role", {
    type: "role",
    using: `role::text::role`,
  });
  pgm.dropType("new_role");
};
