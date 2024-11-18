import * as InstituteController from '../controllers/institute.controller';
import * as DepartmentController from '../controllers/department.controller';
import * as TherapistController from '../controllers/therapist.controller';
import * as PatientController from '../controllers/patient.controller';
import * as FollowupController from '../controllers/followup.controller';
import * as ProfessionController from '../controllers/profession.controller';
import * as ExpertiseController from '../controllers/expertise.controller';
import * as PatientTreatmentController from '../controllers/patient-treatmeant.controller';
import * as BookingController from '../controllers/booking.controller';
import * as AvailabilityController from '../controllers/availability.controller';
import * as ActivityLogController from '../controllers/activity-log.controller';
import * as AdminController from '../controllers/admin.controller';
import * as LeadController from '../controllers/lead.controller';
import * as UserFiltersController from '../controllers/user-filters.controller';
import * as GameDataController from '../controllers/game-data.controller';
import * as GameActivitiesController from '../controllers/game-activities.controller';
import * as ServerLogController from '../controllers/server-log.controller';

import multer from 'multer';
import express from 'express';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// institute routes
router.post('/institute/create', upload.single('file'), InstituteController.createInstitute);
router.post('/institute/edit', upload.single('file'), InstituteController.editInstitute);
router.delete('/institute/:id', InstituteController.deleteInstitute);
router.get('/institute', InstituteController.getAll);

// department routes
router.post('/department/create', DepartmentController.createDepartment);
router.delete('/department/:id', DepartmentController.deleteDepartment);
router.get('/department', DepartmentController.getAll);

// profession routes
router.post('/profession/create', upload.single('file'), ProfessionController.createProfession);
router.post('/profession/edit', upload.single('file'), ProfessionController.editProfession);
router.get('/profession', ProfessionController.getAll);
router.post('/profession/offering', ProfessionController.getProfessionSlots);

// expertise routes
router.post('/expertise/create', ExpertiseController.createExpertise);
router.post('/expertise/edit', ExpertiseController.editExpertise);
router.delete('/expertise/:id', ExpertiseController.deleteExpertise);
router.get('/expertise', ExpertiseController.getAll);

// patient routes
router.post('/patient/create', PatientController.createPatient);
router.post('/patient/edit', PatientController.editPatient);
router.post('/patient/update', PatientController.updatePatient);
router.delete('/patient/:id', PatientController.deletePatient);
router.get('/patient/active', PatientController.getAllActive);
router.post('/patient/resetpassword', PatientController.resetPassword);
router.get('/patient/inactive', PatientController.getAllInactive);
router.post('/patient/activate', PatientController.activatePatient);
router.get('/patient/:id', PatientController.getActive);

// therapist routes
router.post('/therapist/create', TherapistController.createTherapist);
router.post('/therapist/edit', TherapistController.editTherapist);
router.delete('/therapist/:id', TherapistController.deleteTherapist);
router.get('/therapist/active', TherapistController.getAllActive);
router.get('/therapist/sessions', TherapistController.getTherapistsSessions);
router.post('/therapist/users/availability/get', AvailabilityController.getTherapistSchedule);
router.post('/therapist/users/availability/set', AvailabilityController.setAvailability);
router.post('/therapist/users/availability/delete', AvailabilityController.deleteUserAvailability);

// followups routes
router.post('/followup/create', FollowupController.createFollowup);
router.get('/followup', FollowupController.getAll);
router.post('/followup/edit', FollowupController.editFollowup);
router.delete('/followup/:id', FollowupController.deleteFollowup);

// patient treatments routes
router.post('/treatment/create', PatientTreatmentController.createPatientTreatment);
router.post('/treatment/edit', PatientTreatmentController.editPatientTreatment);
router.get('/treatment/:patientId', PatientTreatmentController.getPatientActiveTreatments);
router.delete('/treatment/:id', PatientTreatmentController.deletePatientTreatment);

// booking routes
router.post('/booking/patientstatistics', BookingController.getFuturePatientBookingStatistics);
router.post('/booking/patient', BookingController.getPatientSchedule);
router.post('/booking/offering', ExpertiseController.getAllExpertiseSlots);
router.post('/booking/create', BookingController.assignPatientTreatment);
router.post('/booking/delete', BookingController.deletePatientBooking);
router.delete('/booking/:id', BookingController.deletePatientBookingById);
router.post('/booking', BookingController.editPatientBookingById);

// activity log routes
router.post('/activitylog/create', ActivityLogController.createActivityLogEntry);

// admin routes
router.post('/admin/create', AdminController.createAdmin);
router.post('/admin/edit', AdminController.editAdmin);
router.delete('/admin/:id', AdminController.deleteAdmin);
router.get('/admin/active', AdminController.getAllActive);
router.post('/admin/gameData/clear', GameDataController.clearGameData);
router.post('/admin/gameData/checkPassword', GameDataController.checkPassword);
router.post('/game/uploadgameimage', GameActivitiesController.addAdminRelatedImage);

// lead routes
router.post('/lead/create', LeadController.createLeadAndReminder);
router.post('/lead/reminder/create', LeadController.createReminder);
router.post('/lead/edit', LeadController.editLead);
router.get('/lead/active', LeadController.getAll);
router.get('/lead/reminders/:leadId', LeadController.getRemindersById);

// rtm routes
router.get('/rtm-details', PatientController.getAllRTMDetails);
// router.get('/rtm-details-send', PatientController.sendAllRTMDetails);

// user filters route
router.post('/userfilters/set', UserFiltersController.setUserFilter);
router.get('/userfilters/:userId', UserFiltersController.getUserFilters);

router.get('/games', GameDataController.getAllGames);
router.post('/gameData/create', GameDataController.createGameData);
router.put('/gameData/update', GameDataController.editGameData);
router.put('/gameData/delete', GameDataController.deleteGameData);
router.put('/gameData/updatestatus', GameDataController.updateGameDataStatus);
router.get('/gameData/get/:gameId', GameDataController.getShortGameData);
router.post('/gameData/getbyids', GameDataController.getGameDataByIds);

router.get('/serverLogs', ServerLogController.getServerLogs);

export default router;
