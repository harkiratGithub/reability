exports.shorthands = undefined;

exports.up = (pgm) => {
	pgm.dropConstraint('image', 'image_url_key', { ifExists: true });
};

exports.down = (pgm) => {
	pgm.addConstraint('image', 'image_url_key', { unique: 'url' });
};
