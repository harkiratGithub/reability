exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('patient_contacts', {
    id: 'id',
    patient_id: {
      type: 'integer',
      references: 'patient',
      onDelete: 'SET NULL',
    },
    full_name: { type: 'varchar(255)' },
    phone: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('patient_contacts', { ifExist: true });
};
