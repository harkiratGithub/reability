import logger from './logger.service';
import { ERROR_NAME } from '../const';

export default (err, req, res, next) => {

	if (typeof err === 'string') {
		let message;
		switch (err) {
			case ERROR_NAME.PERMISSION:
				message = 'user not have permission';
				break;
			case ERROR_NAME.THERAPIST_PERMISSION_NOT_VALID:
				message = 'therapist not have permission to this patient';
				break;
			default:
				message = err;
		}
		logger.error('error handler: ', message);
		// custom application error
		return res.status(400).json({ message });
	}

	// default to 500 server error
	logger.error('error handler: ', err);
	return res.status(500).json({ message: err.message });
};
