import * as UserModel from '../models/users.model';
import * as ServerLogModel from '../models/server-log.model';

export const sendLogToServer = async (req, res, next) => {
	try {
		const { connectedUserId, isTherapist, peerId, ...serverLog } = req.body.data;
		if (connectedUserId) {
			const connectedUser: any = await UserModel.findById(connectedUserId);
			const key = connectedUser[0].role + '_id';
			serverLog[key] = connectedUserId;
		}
		await ServerLogModel.createServerLog(serverLog);
		res.json({ status: 'OK' });
	} catch (error) {
		next(error);
	}
};

export const getServerLogs = async (req, res, next) => {
	try {
		const result = await ServerLogModel.getServerLogs();
		res.json(result);
	} catch (error) {
		next(error);
	}
};
