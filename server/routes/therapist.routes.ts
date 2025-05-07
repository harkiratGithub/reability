import * as UserController from '../controllers/user.controller';
import * as therapistSessionController from '../controllers/therapist-session.controller';
import * as PatientController from '../controllers/patient.controller';
import * as RtmController from '../controllers/rtm.controller';
import * as GameSettingsController from '../controllers/game-settings.controller';
import * as AvailabilityController from '../controllers/availability.controller';
import { permitTherapistAccessToPatient } from '../services/middleware';
import * as BookingController from '../controllers/booking.controller';
import * as GameActivitiesController from '../controllers/game-activities.controller';
import * as UserGameDataController from '../controllers/user-game-data.controller';
import * as GameDataController from '../controllers/game-data.controller';
import * as ServerLogController from '../controllers/server-log.controller';
import * as InstituteController from '../controllers/institute.controller';
import * as DepartmentController from '../controllers/department.controller';
import * as RustdeskController from '../controllers/rustdesk.controller';
import express from 'express';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/users/getAll', UserController.getAllPatientForTherapist);
router.post('/sessions/therapistStartTime', therapistSessionController.createTherapistPatientSession);
router.post('/users/openPeers', UserController.getPeersStatus);
router.post('/users/sendEmail', UserController.sendEmailAfterConnection);
router.post('/getPatientList', PatientController.getPatientListActivities);
router.post('/getGameSettings', permitTherapistAccessToPatient(), GameSettingsController.getGameSettingsForPatient);
router.post(
	'/gameSettings/saveNewGameSettings',
	permitTherapistAccessToPatient(),
	GameSettingsController.saveNewSettingsFromTherapist
);
router.post('/addGameToPatient', permitTherapistAccessToPatient(), GameSettingsController.addGameToPatient);
router.post('/removeGameFromPatient', permitTherapistAccessToPatient(), GameSettingsController.removeGameFromPatient);

router.post('/getPatientContactData', permitTherapistAccessToPatient(), UserController.getUserContactData);

router.post('/users/availability/set', AvailabilityController.setAvailability);
router.post('/users/availability/get', AvailabilityController.getTherapistSchedule);
router.post('/users/availability/delete', AvailabilityController.deleteUserAvailability);

router.post('/patient', PatientController.updatePatient);

router.delete('/booking/:id', BookingController.deletePatientBookingById);
router.post('/booking', BookingController.editPatientBookingById);

router.post(
	'/gameactivities/uploadgamerelatedimage',
	upload.single('file'),
	GameActivitiesController.addUploadedGameRelatedImage
);

router.post('/userGameData/create', UserGameDataController.createUserGameData);
router.put('/userGameData/update', UserGameDataController.editUserGameData);
router.put('/userGameData/delete', UserGameDataController.deleteUserGameData);
router.put('/userGameData/updatestatus', UserGameDataController.updateUserGameDataStatus);
router.put('/userGameData/changedrawer', UserGameDataController.changeUserGameDataDrawer);
router.get('/userGameData/get/:gameId/:userId', UserGameDataController.getUserGameData);

router.post('/gameData/create', GameDataController.createGameData);
router.put('/gameData/update', GameDataController.editGameData);
router.put('/gameData/delete', GameDataController.deleteGameData);
router.put('/gameData/updatestatus', GameDataController.updateGameDataStatus);
router.get('/gameData/get/:gameId', GameDataController.getShortGameData);
router.post('/gameData/getbyids', GameDataController.getGameDataByIds);

router.get('/games', GameDataController.getAllGames);

router.post('/addServerLog', ServerLogController.sendLogToServer);
router.post('/rtmSession', RtmController.updateTherapistRTMSession);

// patient create routes
router.get('/institute', InstituteController.getAllInstitutes);
router.get('/department', DepartmentController.getAllTherapistDepartment);
router.post('/patient/create', PatientController.createPatient);
// rtm therapist routes
router.get('/rtm-details', PatientController.getAllRTMDetails);
router.get('/get-rustdesk-session/:therapistId', RustdeskController.getRustDeskSessions);
router.post('/register-client', RustdeskController.registerClient);
router.get('/get-rustdesk-id/:role', RustdeskController.fetchRustDeskID);
router.get('/get-session/patient', RustdeskController.getRustDeskSessions);
router.post('/create-session', RustdeskController.createRustDeskSession);

export default router;
