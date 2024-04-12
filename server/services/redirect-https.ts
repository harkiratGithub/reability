export default (req, res, next) => {
	if (
		process.env.NODE_ENV === 'production' ||
		process.env.NODE_ENV === 'staging'
	) {
		if (req.header('x-forwarded-proto') !== 'https') {
			return res.redirect(`https://${req.header('host')}${req.url}`);
		}
	}
	next();
};
