/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
	// Step 1: Create new enum type
	pgm.createType('patient_availability_status_new', ['unavailable', 'available', 'do_not_disturb', 'offline']);

	// Step 2: Drop default (if any), change column type using cast
	pgm.sql(`
		ALTER TABLE patient 
		ALTER COLUMN availability_status DROP DEFAULT,
		ALTER COLUMN availability_status TYPE patient_availability_status_new 
		USING availability_status::text::patient_availability_status_new
	`);

	// Step 3: Drop old enum type
	pgm.dropType('patient_availability_status');

	// Step 4: Rename new enum to original name
	pgm.sql(`ALTER TYPE patient_availability_status_new RENAME TO patient_availability_status`);

	// Step 5: Update existing records
	pgm.sql(`
		UPDATE patient 
		SET availability_status = 'offline' 
		WHERE availability_status = 'unavailable' 
		AND user_id IN (
			SELECT id FROM users WHERE active = false
		)
	`);
};

exports.down = (pgm) => {
	// Step 1: Create old enum type
	pgm.createType('patient_availability_status_old', ['unavailable', 'available', 'do_not_disturb']);

	// Step 2: Drop default (if any), change column type using cast
	pgm.sql(`
		ALTER TABLE patient 
		ALTER COLUMN availability_status DROP DEFAULT,
		ALTER COLUMN availability_status TYPE patient_availability_status_old 
		USING availability_status::text::patient_availability_status_old
	`);

	// Step 3: Drop new enum type
	pgm.dropType('patient_availability_status');

	// Step 4: Rename old type back
	pgm.sql(`ALTER TYPE patient_availability_status_old RENAME TO patient_availability_status`);
};
