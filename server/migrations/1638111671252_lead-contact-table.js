exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('lead_contacts', {
    id: 'id',
    lead_id: {
      type: 'integer',
      references: 'lead',
      onDelete: 'SET NULL',
    },
    full_name: { type: 'varchar(255)' },
    phone: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('lead_contacts', { ifExist: true });
};
