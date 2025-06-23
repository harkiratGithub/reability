require('newrelic');
import dotenv from 'dotenv';
import rootpath from 'rootpath';

dotenv.config();
rootpath();

import session from 'express-session';
import pgConnect from 'connect-pg-simple';
import passport from 'passport';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import nocache from 'nocache';
import https from 'https';
import path from 'path';
import bodyParser from 'body-parser';

import DbService from './services/db.service';
import errorHandler from './services/error-handler';
import redirectToHTTPS from './services/redirect-https';
import { isHerokuDomain, permitAccess, permitTherapistAccessToPatient } from './services/middleware';
import setupPassport from './services/passport';

import AuthRouter from './routes/auth.routes';
import AdminRouter from './routes/admin.routes';
import TherapistRouter from './routes/therapist.routes';
import PatientRouter from './routes/patient.routes';

import * as UserController from './controllers/user.controller';
import * as PatientController from './controllers/patient.controller';
import * as twilioController from './controllers/twilio.controller';
import * as LoggerController from './controllers/logger.controller';
import * as LeadController from './controllers/lead.controller';
import * as xirsysController from './controllers/xirsys.controller';
import { ROLE } from './const';

import helmet from 'helmet';
const app = express();
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.disable('x-powered-by');
let server;
if (process.env.NODE_ENV === 'development') {
	server = https
		.createServer(
			{
				key: fs.readFileSync('server.key'),
				cert: fs.readFileSync('server.cert'),
			},
			app
		)
		.listen(process.env.PORT || 8080, () => {
			console.log('Example app listening on port 8080! Go to https://localhost:8080/');
		});
} else {
	server = app.listen(process.env.PORT || 8080);
}

const PgSession = pgConnect(session);

app.use(nocache());
app.use(isHerokuDomain);
app.use(redirectToHTTPS);
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(
	session({
		secret: process.env.SECRET_KEY_SESSION,
		proxy: process.env.NODE_ENV !== 'development',
		cookie: {
			maxAge: 8 * 60 * 60 * 1000, // 8 hours
			secure: true,
			sameSite: true,
			domain: process.env.DOMAIN,
		},
		store: new PgSession({
			pool: DbService.getDataBase(),
			tableName: 'user_session',
		}),
		saveUninitialized: false,
		resave: false,
	})
);
setupPassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', express.static(path.join(__dirname, '/../client/dist/reability/')));
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + '/../client/dist/reability/index.html'));
});

app.use('/', AuthRouter);

// common
app.post('/users/sendHeartBeat', permitAccess(), UserController.updateHeartBeat);
app.post('/patient/validGames', permitAccess(), permitTherapistAccessToPatient(), PatientController.getValidGames);
app.get('/ice_servers', permitAccess(), xirsysController.getIceServers);
app.post('/users/authenticate_user', UserController.authenticatePeerjsUser);
// routes by roles
app.use('/patient', permitAccess([ROLE.PATIENT, ROLE.VIDEO_PATIENT]), PatientRouter);
app.use('/therapist', permitAccess([ROLE.THERAPIST]), TherapistRouter);
app.use('/admin', permitAccess([ROLE.ADMIN]), AdminRouter);

// logger
app.use('/logger/logs', LoggerController.handleLogs);
app.use(errorHandler);

// API
// app.use('/api/registration', LeadController.createLeadFromAPI);
