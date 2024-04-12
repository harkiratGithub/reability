import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as AuthTokenStrategy } from 'passport-auth-token';

import * as EncryptHelper from './encrypt.helper';
import * as UserModel from '../models/users.model';
import { ROLE } from '../const';
import { checkFastLoginToken } from '../helpers/users.helper';

const passportConfig = (passport: any) => {
	passport.serializeUser((user, done) => {
		done(null, user);
	});

	passport.deserializeUser((user, done) => {
		done(undefined, user);
	});

	passport.use(
		'login',
		new LocalStrategy(async (userName, password, done) => {
			try {
				const users = await UserModel.findByUsername(userName);
				if (!users[0]) {
					return done(null, false);
				}
				const [user] = users;
				if (!user.active) {
					return done(null, false);
				}
				if (!EncryptHelper.comparePassword(user.password, password)) {
					return done(null, false);
				}
				const userObject = {
					id: user.id,
					role: user.role,
					username: user.user_name,
					isTherapist: user.role === ROLE.THERAPIST,
					peerId: user.id.toString(),
				};
				if (user.role === ROLE.ADMIN) {
					return done(null, userObject);
				}
				const userDetails = await UserModel.getUserDetails(user.id);
				userObject[`${user.role === ROLE.THERAPIST ? 'therapist' : 'patient'}Id`] = userDetails[0].id;
				return done(null, userObject);
			} catch (err) {
				done(err);
			}
		})
	);

	passport.use(
		'fastLogin',
		new AuthTokenStrategy(async (token, done) => {
			try {
				const users = await UserModel.findByFastLoginToken(token);
				if (!users[0]) {
					return done(null, false);
				}
				if (users.length > 1) {
					return done(null, false);
				}
				const [user] = users;
				if (!user.active) {
					return done(null, false);
				}
				if (user.fast_login_token !== token) {
					return done(null, false);
				}
				await checkFastLoginToken(token);

				const userObject = {
					id: user.id,
					role: user.role,
					username: user.user_name,
					isTherapist: user.role === ROLE.THERAPIST,
					peerId: user.id.toString(),
				};
				if (user.role === ROLE.ADMIN) {
					return done(null, userObject);
				}
				const userDetails = await UserModel.getUserDetails(user.id);
				userObject[`${user.role === ROLE.THERAPIST ? 'therapist' : 'patient'}Id`] = userDetails[0].id;
				return done(null, userObject);
			} catch (err) {
				done(err);
			}
		})
	);
};

export default passportConfig;
