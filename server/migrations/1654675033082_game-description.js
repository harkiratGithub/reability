exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.addColumns('game', { description: { type: 'varchar(255)', notNull: false } }, { ifNotExists: true });
	pgm.sql(`UPDATE game SET description = 'Make as many squats as you can in the allocated time' WHERE name = 'squat'`);
	pgm.sql(`UPDATE game SET description = 'Use your hands to find pairs of identical cards' WHERE name = 'memory'`);
	pgm.sql(
		`UPDATE game SET description = 'Use your hands to touch the moving objects as fast as possible' WHERE name = 'puzzle'`
	);
	pgm.sql(`UPDATE game SET description = 'Use your hands to touch the objects on the screen' WHERE name = 'kp'`);
	pgm.sql(
		`UPDATE game SET description = 'Use the mouse to make way for the red piece out of the puzzle' WHERE name = 'rush'`
	);
	pgm.sql(`UPDATE game SET description = 'Follow the instructions in the video clips' WHERE name = 'studio'`);
	pgm.sql(`UPDATE game SET description = 'Practice your vocal intensity' WHERE name = 'voice'`);
	pgm.sql(
		`UPDATE game SET description = 'Capture 80% of the board area while avoiding the monsters' WHERE name = 'xonix'`
	);
	pgm.sql(
		`UPDATE game SET description = 'Use your hands to clear 80% of the board area as quickly as possible' WHERE name = 'wipe'`
	);
	pgm.sql(
		`UPDATE game SET description = 'Use one of your hands to point the elephant trunk to pick fruits, leaves, and rings in the right order' WHERE name = 'elephant'`
	);
	pgm.sql(`UPDATE game SET description = 'Use the mouse to complete written assignments' WHERE name = 'whiteboard'`);
};

exports.down = (pgm) => {
	pgm.dropColumns('game', ['description'], { ifExist: true });
};
