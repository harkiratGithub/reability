import * as GameSessionController from '../controllers/game-session.controller';
import * as GameSettingsController from '../controllers/game-settings.controller';
import * as PatientController from '../controllers/patient.controller';
import * as GameActivitiesController from '../controllers/game-activities.controller';
import * as UserGameDataController from '../controllers/user-game-data.controller';
import * as ServerLogController from '../controllers/server-log.controller';

import express from 'express';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/gameSession/startGameSession', GameSessionController.startGameSession);
router.post('/gameSession/updateSession', GameSessionController.endGameSession);
router.post('/gameSettings/saveNewGameSettings', GameSettingsController.saveNewSettings);

router.post('/cameraAvailability', PatientController.updatePatientCameraAvailability);

router.post(
	'/gameactivities/uploadgamerelatedimage',
	upload.single('file'),
	GameActivitiesController.addUploadedGameRelatedImage
);

router.post('/userGameData/create', UserGameDataController.createUserGameData);
router.put('/userGameData/update', UserGameDataController.editUserGameData);
router.get('/userGameData/get/:gameId/:userId', UserGameDataController.getUserGameData);
router.put('/userGameData/delete', UserGameDataController.deleteUserGameData);

router.post('/addServerLog', ServerLogController.sendLogToServer);
router.get('/feedback/questions', PatientController.getFeedbackQuestions);

export default router;
