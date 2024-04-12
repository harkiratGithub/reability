import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';
import squel from 'squel';
const squelPostgres = squel.useFlavour('postgres');

export const deleteOtherSessionsForUser = (userId) => {
	const query = squelPostgres
		.delete()
		.from(TABLE_NAME.USER_SESSION)
		.where(`CAST (sess -> 'passport' -> 'user' ->> 'id' AS INTEGER) = ?`, userId)
		.toParam();
	return BaseModel.runQuery(query);
};

export const verifyUserSession = (sid: number, userId: number) => {
	const query = squelPostgres
		.select()
		.from(TABLE_NAME.USER_SESSION)
		.where('sid = ?', sid)
		.where(
			`CAST (sess -> 'passport' -> 'user' ->> 'id' AS INTEGER) = ?`,
			userId
		)
		.toParam();
	return BaseModel.runQuery(query);
};

