exports.shorthands = undefined;


exports.up = pgm => {
  pgm.addColumns('patient', { has_camera: { type: 'boolean', notNull:true, default:true} }, { ifNotExists: true });
};

exports.down = pgm => {
  pgm.dropColumns('patient', ['has_camera'], { ifExist: true });
};

