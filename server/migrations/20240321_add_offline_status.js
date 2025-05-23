/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create new enum type with all values
  pgm.createType('patient_availability_status_new', ['unavailable', 'available', 'do_not_disturb', 'offline']);
  
  // Update column to use new type
  pgm.sql(`
    ALTER TABLE patient 
    ALTER COLUMN availability_status TYPE patient_availability_status_new 
    USING availability_status::text::patient_availability_status_new
  `);

  // Drop old type
  pgm.dropType('patient_availability_status');

  // Rename new type
  pgm.sql('ALTER TYPE patient_availability_status_new RENAME TO patient_availability_status');

  // Update existing records
  pgm.sql(`
    UPDATE patient 
    SET availability_status = 'offline' 
    WHERE availability_status = 'unavailable' 
    AND id IN (
      SELECT id FROM patient 
      WHERE user_id IN (
        SELECT id FROM users WHERE active = false
      )
    )
  `);
};

exports.down = (pgm) => {
  // Create old enum type
  pgm.createType('patient_availability_status_old', ['unavailable', 'available', 'do_not_disturb']);
  
  // Update column to use old type
  pgm.sql(`
    ALTER TABLE patient 
    ALTER COLUMN availability_status TYPE patient_availability_status_old 
    USING availability_status::text::patient_availability_status_old
  `);

  // Drop new type
  pgm.dropType('patient_availability_status');

  // Rename old type
  pgm.sql('ALTER TYPE patient_availability_status_old RENAME TO patient_availability_status');
}; 