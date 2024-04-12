exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createType('payer_types', ['Private', 'HMO', 'MOD', 'Other','<Empty>']);
  pgm.createTable('patient_treatment', {
    id: 'id',
    patient_id: {
        type: 'integer',
        references: 'patient',
        onDelete: 'SET NULL'
      },
    expertise_id: {
        type: 'integer',
        references: 'expertise',
        onDelete: 'SET NULL'
      },
    payer: {
      type: 'payer_types',
      default: '<Empty>',
      onDelete: 'SET NULL'
    },
    times_per_week: {
      type: 'integer',
      notNull: true,
      default: 1
    },
    max_patients: {
        type: 'integer',
        notNull: true,
        default: 1
      },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    active: {
        type: 'boolean',
        notNull: true,
        default: true
      }
  });
  pgm.createTrigger('patient_treatment', 'update_time_patient-treatment', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_timestamp',
    level: 'ROW'
  });
};

exports.down = pgm => {
  pgm.dropTrigger('patient_treatment', 'update_time_patient-treatment', { ifExist: true });
  pgm.dropTable('patient_treatment', { ifExist: true });
  pgm.dropType('payer_types');
};
