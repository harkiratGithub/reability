exports.shorthands = undefined;
exports.up = (pgm) => {
    pgm.createTable('rtm', {
    line: { type: 'serial', primaryKey: true }, 
    patient_id: { type: 'integer', notNull: true }, 
    institute_id: { type: 'integer', notNull: true }, 
    data: { type: 'jsonb', notNull: false }, 
    timestamp: {
    type: 'timestamp',
    notNull: true,
    default: pgm.func('current_timestamp'),
    },
    });
    
    pgm.addConstraint('rtm', 'unique_patient_institute', {
    unique: ['patient_id', 'institute_id'],
    }); 
    }
    
    exports.down = (pgm) => {
        pgm.dropTable('rtm', { ifExist: true });
    };