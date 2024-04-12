import * as UserSessionModel from '../models/user-session.model';

export const verifyUserSession = async (sid, userId) => {
	try {
		const res = await UserSessionModel.verifyUserSession(sid, userId);
		return res.rows.length > 0;
	} catch (err) {
		throw err;
	}
};
