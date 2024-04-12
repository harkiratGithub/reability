import * as BaseModel from '../../services/BaseModel.service';
import * as MockFunction from '../mock/mockFunction';
import { TABLE_NAME, ROLE, PEERS_STATUS } from '../../const';
import * as EncryptHelper from '../../services/encrypt.helper';

import * as UsersHelper from '../../helpers/users.helper';
import * as UsersModel from '../../models/users.model';
import * as GameSessionHelper from '../../helpers/game-session.helper';
import * as TherapistSessionHelper from '../../helpers/therapist-session.helper';

import moment from 'moment';
import MockDate from 'mockdate';
import { find } from 'lodash';
import { spyConsole } from '../jest-util';
import { gilMock, oriMock, adminMock, guyMock } from '../mock/mockUsers';

describe('TEST USER HELPER', () => {
	beforeEach(async () => await BaseModel.clearTables());
	afterEach(async () => await BaseModel.clearTables());

	describe('TESTING: onLogIn()', () => {
		spyConsole();
		it('check if we get user authenticate on patient', async () => {
			await MockFunction.testSeedDatabase();
			const user: any = await UsersHelper.onLogIn(gilMock);
			expect(user.id).toEqual(2);
			expect(user.username).toEqual('gil');
			expect(user.firstName).toEqual('gil');
			expect(user.lastName).toEqual('bbb');
			expect(user.isTherapist).toEqual(false);
			expect(user.role).toEqual(ROLE.PATIENT);
			expect(user.peerId).toEqual('2');
			expect(user.validGames).toHaveLength(1);
		});

		it('check if we get user authenticate on therapist', async () => {
			await MockFunction.testSeedDatabase();
			const user: any = await UsersHelper.onLogIn(oriMock);
			expect(user.id).toEqual(1);
			expect(user.username).toEqual('ori');
			expect(user.firstName).toEqual('ori');
			expect(user.lastName).toEqual('glick');
			expect(user.isTherapist).toEqual(true);
			expect(user.role).toEqual(ROLE.THERAPIST);
			expect(user.peerId).toEqual('1');
		});

		it('check if we get user authenticate on admin', async () => {
			await MockFunction.testSeedDatabase();
			const user = await UsersHelper.onLogIn(adminMock);
			expect(user.id).toEqual(12);
			expect(user.username).toEqual('admin');
			expect(user.role).toEqual(ROLE.ADMIN);
		});
	});

	describe('TESTING: getPatientsByTherapist()', () => {
		it('check if the adopter works', async () => {
			await MockFunction.testSeedDatabase();
			const users = await UsersHelper.getPatientsByTherapist(1);
			const user = find(users, (u) => u.username === 'gil');
			expect(user.username).toEqual('gil');
			expect(user.firstName).toEqual('gil');
			expect(user.lastName).toEqual('bbb');
			expect(user.isTherapist).toEqual(false);
			expect(user.role).toEqual(ROLE.PATIENT);
			expect(user.peerId).toEqual('2');
		});
	});

	describe('TESTING: updateUserUsage()', () => {
		it('check if it update time', async (done) => {
			await MockFunction.testSeedDatabase();
			const userReturn = await UsersHelper.onLogIn(gilMock);
			let usersTable = await BaseModel.getAllTable(TABLE_NAME.USER);
			const user = find(usersTable, (u) => u.id === Number(userReturn.peerId));
			setTimeout(async () => {
				await UsersHelper.updateUserUsage(user.id);
				usersTable = await BaseModel.getAllTable(TABLE_NAME.USER);
				const userAfterUpdate = find(
					usersTable,
					(u) => u.id === Number(userReturn.peerId)
				);
				expect(
					moment(user.logged_out_at).isBefore(
						moment(userAfterUpdate.logged_out_at)
					)
				).toBeTruthy();
				done();
			}, 1000);
		});
	});

	describe('TESTING: updateHeartBeat()', () => {
		it('check if it update', async () => {
			await MockFunction.testSeedDatabase();
			MockDate.set(1434319925275);
			const userReturn = await UsersHelper.onLogIn(gilMock);
			await UsersHelper.updateHeartBeat(Number(userReturn.peerId));
			MockDate.set(1434319926275);
			await GameSessionHelper.createGameSession(Number(userReturn.peerId), 1);
			MockDate.set(1434319927275);
			await UsersHelper.updateHeartBeat(Number(userReturn.peerId), false, true);
			MockDate.set(1434319928275);

			const userDetails = await UsersModel.getUserDetails(
				Number(userReturn.peerId)
			);
			let gameSession = await BaseModel.getAllTable(TABLE_NAME.GAME_SESSION);
			expect(gameSession).toHaveLength(1);
			const firstSession = gameSession[0];

			expect(firstSession.patient_id).toEqual(userDetails[0].id);
			expect(firstSession.game_id).toEqual(1);
			expect(
				moment(firstSession.start_time).isBefore(moment(firstSession.end_time))
			).toBeTruthy();

			await TherapistSessionHelper.createTherapistSession(userDetails[0].id, 1);
			MockDate.set(1434319929275);
			await UsersHelper.updateHeartBeat(Number(userReturn.peerId), true, true);
			MockDate.set(1434319930275);

			gameSession = await BaseModel.getAllTable(TABLE_NAME.GAME_SESSION);
			expect(gameSession).toHaveLength(1);
			const secondSession = gameSession[0];
			const therapistSession = await BaseModel.getAllTable(
				TABLE_NAME.THERAPIST_SESSION
			);
			expect(therapistSession).toHaveLength(1);
			const firstTherapistSession = therapistSession[0];

			expect(
				moment(firstSession.end_time).isBefore(moment(secondSession.end_time))
			).toBeTruthy();
			expect(secondSession.therapist_session_id).toEqual(
				firstTherapistSession.id
			);
			MockDate.set(1434319931275);
			await UsersHelper.updateHeartBeat(Number(userReturn.peerId), true, false);
			gameSession = await BaseModel.getAllTable(TABLE_NAME.GAME_SESSION);
			expect(gameSession).toHaveLength(1);
			const thirdSession = gameSession[0];
			// game not opened - not update the end time again
			expect(
				moment(secondSession.end_time).isSame(moment(thirdSession.end_time))
			).toBeTruthy();
			MockDate.reset();
		});
	});

	describe('TESTING: getOpenPeers()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());

		it('check if gil user is connected', async () => {
			await MockFunction.testSeedDatabase();
			const therapistId = 1;
			const gilUser = await UsersHelper.onLogIn(gilMock);
			await TherapistSessionHelper.createTherapistSession(
				Number(gilUser.peerId),
				therapistId
			);
			await UsersHelper.updateHeartBeat(Number(gilUser.peerId), true, false);
			const openPeers = await UsersHelper.getOpenPeers(therapistId);
			const gilPeer = find(
				openPeers,
				(p) => p.user_id === Number(gilUser.peerId)
			);
			expect(gilPeer.peerStatus).toEqual(PEERS_STATUS.CONNECTED);
		});

		it('check if gil user is busy session taken by therapist id 1', async () => {
			await MockFunction.testSeedDatabase();
			const therapistId = 3;
			const gilUser = await UsersHelper.onLogIn(gilMock);
			await TherapistSessionHelper.createTherapistSession(
				Number(gilUser.peerId),
				1
			);
			await UsersHelper.updateHeartBeat(Number(gilUser.peerId), true, false);
			const openPeers = await UsersHelper.getOpenPeers(therapistId);
			const gilPeer = find(
				openPeers,
				(p) => p.user_id === Number(gilUser.peerId)
			);
			expect(gilPeer.peerStatus).toEqual(PEERS_STATUS.BUSY);
		});

		it('check if gil user is logged out', async () => {
			await MockFunction.testSeedDatabase();
			MockDate.set(1434319925275);
			const therapistId = 1;
			const gilUser = await UsersHelper.onLogIn(gilMock);
			await TherapistSessionHelper.createTherapistSession(
				Number(gilUser.peerId),
				therapistId
			);
			await UsersHelper.updateHeartBeat(Number(gilUser.peerId), true, false);
			MockDate.set(1434319946275);
			const openPeers = await UsersHelper.getOpenPeers(therapistId);
			const gilPeer = find(
				openPeers,
				(p) => p.user_id === Number(gilUser.peerId)
			);
			expect(gilPeer.peerStatus).toEqual(PEERS_STATUS.LOGGED_OUT);
			MockDate.reset();
		});

		it('check if gil user is logged in', async () => {
			await MockFunction.testSeedDatabase();
			const therapistId = 1;
			MockDate.set(1434319925275);
			const gilUser = await UsersHelper.onLogIn(gilMock);
			await UsersHelper.updateHeartBeat(Number(gilUser.peerId), false, false);
			MockDate.set(1434319930275);
			const openPeers = await UsersHelper.getOpenPeers(therapistId);
			const gilPeer = find(
				openPeers,
				(p) => p.user_id === Number(gilUser.peerId)
			);
			expect(gilPeer.peerStatus).toEqual(PEERS_STATUS.AVAILABLE);
			MockDate.reset();
		});

		it('check if gil busy and guy logged in', async () => {
			await MockFunction.testSeedDatabase();
			const therapistId = 1;
			MockDate.set(1434319925275);
			const gilUser = await UsersHelper.onLogIn(gilMock);
			const guyUser = await UsersHelper.onLogIn(guyMock);
			await TherapistSessionHelper.createTherapistSession(
				Number(gilUser.peerId),
				therapistId
			);
			await UsersHelper.updateHeartBeat(Number(gilUser.peerId), true, false);
			await UsersHelper.updateHeartBeat(Number(guyUser.peerId), false, false);
			MockDate.set(1434319930275);
			const openPeers = await UsersHelper.getOpenPeers(therapistId);
			const gilPeer = find(
				openPeers,
				(p) => p.user_id === Number(gilUser.peerId)
			);
			const guyPeer = find(
				openPeers,
				(p) => p.user_id === Number(guyUser.peerId)
			);
			expect(gilPeer.peerStatus).toEqual(PEERS_STATUS.CONNECTED);
			expect(guyPeer.peerStatus).toEqual(PEERS_STATUS.AVAILABLE);
			MockDate.reset();
		});
	});

	describe('TESTING: create()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		const spy = spyConsole();
		it('check if it create user', async () => {
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};

			const newUser = await UsersHelper.create(userData);
			// check the email
			expect(spy.console.mock.calls).toHaveLength(1);
			expect(spy.console.mock.calls[0][0].to).toEqual('a@a.com');
			expect(spy.console.mock.calls[0][0].from).toEqual('test@example.com');
			expect(spy.console.mock.calls[0][0].subject).toEqual('ReAbility');
			expect(spy.console.mock.calls[0][0].html).toContain(
				'Welcome to ReAbility system. Please'
			);

			// check DB encrypted
			expect(newUser.email).toEqual('2154a9fa2b8e5843266f228b32383f20');
			expect(newUser.user_name.length).toEqual(6);
		});
	});

	describe('TESTING: checkEmailToken()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		spyConsole();
		it('check if all works good', async () => {
			// // freeze time
			MockDate.set(1434319925275);
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			const newUser = await UsersHelper.create(userData);
			expect(newUser).toBeTruthy();
			const checkUser = await UsersHelper.checkEmailToken(newUser.token);
			expect(checkUser.id).toEqual(newUser.id);
			MockDate.reset();
		});
		it('check if all works good - after 59 minutes`', async () => {
			// // freeze time
			MockDate.set(1434323465275);
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			const newUser = await UsersHelper.create(userData);
			MockDate.set(1434323585275);
			const checkUser = await UsersHelper.checkEmailToken(newUser.token);
			expect(checkUser.id).toEqual(newUser.id);
			MockDate.reset();
		});
		it('check if token now found', async () => {
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			await UsersHelper.create(userData);
			try {
				await UsersHelper.checkEmailToken('blabla');
			} catch (error) {
				expect(error.message).toEqual('Error: token not valid');
			}
		});
		it('check if time have passed - after 61 minutes', async () => {
			MockDate.set(1434319925275);
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			const newUser = await UsersHelper.create(userData);
			MockDate.set(1434323585275);
			try {
				await UsersHelper.checkEmailToken(newUser.token);
			} catch (error) {
				expect(error.message).toEqual('Error: token expired');
			} finally {
				MockDate.reset();
			}
		});
	});

	describe('TESTING: changePassword()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		spyConsole();
		it('check if change password work as expected', async () => {
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			const newUser = await UsersHelper.create(userData);
			const password = 'AAbb1234';
			await UsersHelper.changePassword(newUser.token, password);
			const checkUser = await UsersModel.findByUsername(
				newUser.user_name,
			);
			expect(
				EncryptHelper.comparePassword(checkUser[0].password, password)
			).toBeTruthy();
			expect(checkUser[0].id).toEqual(newUser.id);
		});

		it('check if weak password not change password', async () => {
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			let newUser = await UsersHelper.create(userData);
			const password = 'AAbb1234';
			const weakPassword = '1234';
			newUser = await UsersModel.updateById(newUser.id, {
				...newUser,
				password: EncryptHelper.hashPassword(password),
			});
			try {
				await UsersHelper.changePassword(newUser.token, weakPassword);
			} catch (err) {
				expect(err.message).toEqual('Error: password not strength');
			}
			const checkUser = await UsersModel.findByUsername(
				newUser.user_name
			);
			expect(
				EncryptHelper.comparePassword(checkUser[0].password, weakPassword)
			).toBeFalsy();
			expect(checkUser[0].id).toEqual(newUser.id);
		});
	});

	describe('TESTING: forgotPassword()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		const spy = spyConsole();
		it('check if all works good', async () => {
			const userData = {
				email: 'a@a.com',
				role: ROLE.THERAPIST,
			};
			const newUser = await UsersHelper.create(userData);
			await UsersHelper.forgotPassword(newUser.user_name);
			const userAfterForgotPassword = await UsersModel.findByUsername(
				newUser.user_name
			);
			// check the email
			expect(spy.console.mock.calls).toHaveLength(2);
			expect(spy.console.mock.calls[1][0].to).toEqual('a@a.com');
			expect(spy.console.mock.calls[1][0].from).toEqual('test@example.com');
			expect(spy.console.mock.calls[1][0].subject).toEqual('ReAbility');
			expect(spy.console.mock.calls[1][0].html).toContain(
				'Welcome to ReAbility system. Please'
			);
			expect(spy.console.mock.calls[1][0].html).toContain(
				userAfterForgotPassword[0].token
			);
		});

		it('check if weak password not change password', async () => {
			try {
				await UsersHelper.forgotPassword('BB1234');
			} catch (err) {
				expect(err.message).toEqual('Error: username not valid');
			}
		});
	});

	describe('TESTING: generateUniqUsername()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		it('check if all works good', async () => {
			const username = await UsersHelper.generateUniqUsername();
			const isUpperCase = (string) => /^[A-Z]*$/.test(string);
			const isNumber = (string) => /^[0-9]*$/.test(string);
			const firstTwoLetters = username.slice(0, 2);
			const lastDigits = username.slice(2);
			expect(username).toHaveLength(6);
			expect(isUpperCase(firstTwoLetters)).toBeTruthy();
			expect(isNumber(lastDigits)).toBeTruthy();
		});
	});

	////////////////////////////////////////

	describe('TESTING: createFastLoginToken()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		const spy = spyConsole();
		it('check if all works good - email', async () => {
			// // freeze time
			MockDate.set(1434319925275); // Mon Jun 15 2015 01:12:05 GMT+0300 | Sun, 14 Jun 2015 22:12:05 GMT
			const userData = {
				email: 'b@a.com',
				role: ROLE.PATIENT,
			};
			const newUser = await UsersHelper.create(userData);
			expect(newUser).toBeTruthy();
			await UsersHelper.createFastLoginToken(newUser.id, "test@test.com");
			
			const userWithToken = await UsersModel.findById(newUser.id);
			expect(userWithToken[0].fast_login_token).toBeTruthy();
			expect(userWithToken[0].fast_login_token_timestamp).toEqual('2015-06-14 22:12:05')

			// check the email
			expect(spy.console.mock.calls).toHaveLength(2);
			expect(spy.console.mock.calls[0][0].to).toEqual('b@a.com');
			expect(spy.console.mock.calls[0][0].from).toEqual('test@example.com');
			expect(spy.console.mock.calls[0][0].subject).toEqual('ReAbility');
			expect(spy.console.mock.calls[0][0].html).toContain(
				'Welcome to ReAbility system. Please'
			);
			MockDate.reset();
		});
		it('check if all works good - phone', async () => {
			// // freeze time
			MockDate.set(1434319925275); // Mon Jun 15 2015 01:12:05 GMT+0300 | Sun, 14 Jun 2015 22:12:05 GMT
			const userData = {
				email: 'c@a.com',
				role: ROLE.PATIENT,
			};
			const newUser = await UsersHelper.create(userData);
			expect(newUser).toBeTruthy();
			await UsersHelper.createFastLoginToken(newUser.id, "0541231231");
			
			const userWithToken = await UsersModel.findById(newUser.id);
			expect(userWithToken[0].fast_login_token).toBeTruthy();
			expect(userWithToken[0].fast_login_token_timestamp).toEqual('2015-06-14 22:12:05')

			// check the email
			expect(spy.console.mock.calls).toHaveLength(4);
			expect(spy.console.mock.calls[3][0].to).toEqual('0541231231');
			expect(spy.console.mock.calls[3][0].from).toEqual('972546630011');
			expect(spy.console.mock.calls[3][0].text).toContain('Welcome to ReAbility system. Please click here');
			MockDate.reset();
		});
	});

	describe('TESTING: checkFastLoginToken()', () => {
		beforeEach(async () => await BaseModel.clearTables());
		afterEach(async () => await BaseModel.clearTables());
		const spy = spyConsole();
		it('check if all works good - email', async () => {
			// // freeze time
			MockDate.set(1434319925275); // Mon Jun 15 2015 01:12:05 GMT+0300 | Sun, 14 Jun 2015 22:12:05 GMT
			const userData = {
				email: 'b@a.com',
				role: ROLE.PATIENT,
			};
			const newUser = await UsersHelper.create(userData);
			expect(newUser).toBeTruthy();
			await UsersHelper.createFastLoginToken(newUser.id, "test@test.com");
			
			const userWithToken = await UsersModel.findById(newUser.id);
			expect(userWithToken[0].fast_login_token).toBeTruthy();
			expect(userWithToken[0].fast_login_token_timestamp).toEqual('2015-06-14 22:12:05')

			const checkedUserWithToken = await UsersHelper.checkFastLoginToken(userWithToken[0].fast_login_token);
			expect(userWithToken[0].fast_login_token).toEqual(checkedUserWithToken.fast_login_token);
			//1434323525000
			MockDate.reset();
		});
		it('check if all works good - phone', async () => {
			// // freeze time
			MockDate.set(1434319925275); // Mon Jun 15 2015 01:12:05 GMT+0300 | Sun, 14 Jun 2015 22:12:05 GMT
			const userData = {
				email: 'c@a.com',
				role: ROLE.PATIENT,
			};
			const newUser = await UsersHelper.create(userData);
			expect(newUser).toBeTruthy();
			await UsersHelper.createFastLoginToken(newUser.id, "0541231231");
			
			const userWithToken = await UsersModel.findById(newUser.id);
			expect(userWithToken[0].fast_login_token).toBeTruthy();
			expect(userWithToken[0].fast_login_token_timestamp).toEqual('2015-06-14 22:12:05')

			const checkedUserWithToken = await UsersHelper.checkFastLoginToken(userWithToken[0].fast_login_token);
			expect(userWithToken[0].fast_login_token).toEqual(checkedUserWithToken.fast_login_token);

			MockDate.reset();
		});

		it('Error token expired', async () => {
			// // freeze time
			MockDate.set(1434319925275); // Mon Jun 15 2015 01:12:05 GMT+0300 | Sun, 14 Jun 2015 22:12:05 GMT
			const userData = {
				email: 'b@a.com',
				role: ROLE.PATIENT,
			};
			const newUser = await UsersHelper.create(userData);
			expect(newUser).toBeTruthy();
			await UsersHelper.createFastLoginToken(newUser.id, "test@test.com");
			
			const userWithToken = await UsersModel.findById(newUser.id);
			expect(userWithToken[0].fast_login_token).toBeTruthy();
			expect(userWithToken[0].fast_login_token_timestamp).toEqual('2015-06-14 22:12:05')

			MockDate.set(1434323525001); // 1434323525000 - 1 hour from 1434319925275

			try {
				const checkedUserWithToken = await UsersHelper.checkFastLoginToken(userWithToken[0].fast_login_token);
			} catch (err) {
				expect(err.message).toEqual('Error: token expired');
			}

			//1434323525000
			MockDate.reset();
		});
	});
});
