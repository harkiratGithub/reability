exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createType('patient_availability_status', ['unavailable', 'available', 'do_not_disturb', 'offline']);
  pgm.addColumns('patient', {
    availability_status: {
      type: 'patient_availability_status',
      notNull: true,
      default: 'unavailable'
    }
  });
};

exports.down = pgm => {
  pgm.dropColumns('patient', ['availability_status']);
  pgm.dropType('patient_availability_status');
}; 