import express from 'express';
import passport from 'passport';
import { permitAccess, permitTherapistAccessToPatient, removeOldSessionAndPeers, verifyRecaptcha } from '../services/middleware';
import * as UserController from '../controllers/user.controller';
import { ROLE } from '../const';
const router = express.Router();

function attachUserTimezone(req, res, next) {
	const { userTimezone } = req.body;
	if (userTimezone) {
	  req.userTimezone = userTimezone;
	}
	next(); // Proceed to the next middleware or route handler
  }

router.post(
	'/login',
	verifyRecaptcha(),
	passport.authenticate('login'),
	attachUserTimezone, 
	removeOldSessionAndPeers(),
	UserController.authenticate
);

router.post(
	'/enable-2fa/:id',
	UserController.enable2FA
);

router.post(
	'/verify-2fa/:id',
	UserController.verify2FA
);

router.put(
	'/re-verify-2fa/:id',
	UserController.reVerify2FA
);

router.get('/users/getUserData', permitAccess(), UserController.authenticate);
router.post('/logout', (req: any, res, next) => {
	try {
		if (req.isAuthenticated()) {
			req.session.destroy();
			req.logout();
		}
		res.status(200).json({ message: 'success!' });
	} catch (err) {
		res.status(401).json({ message: err });
	}
});

router.get('/users/isAuthenticated', (req: any, res: any) => {
	res.json({ isAuthenticated: req.isAuthenticated() });
});

router.post(
	'/users/checkToken',
	verifyRecaptcha(),
	UserController.checkValidToken
);
router.post(
	'/users/changePassword',
	verifyRecaptcha(),
	UserController.changePassword
);
router.post(
	'/users/forgotPassword',
	verifyRecaptcha(),
	UserController.forgotPassword
);
router.post(
	'/users/createFastLoginToken',
	verifyRecaptcha(),
	permitAccess([ROLE.THERAPIST]),
	permitTherapistAccessToPatient(),
	UserController.createFastLoginToken
);
router.post(
	'/fastLogin',
	verifyRecaptcha(),
	passport.authenticate('fastLogin'),
	permitAccess([ROLE.PATIENT]),
	removeOldSessionAndPeers(),
	UserController.authenticate
);

export default router;
