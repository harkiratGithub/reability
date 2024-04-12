import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Moment } from 'moment';
import { environment } from '../../../environments/environment';
import { IPatient, ITherapistAvailability, ITreatmentListItem } from '../../../types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AjaxAdmin {
  baseUrl: string;
  constructor(private http: HttpClient) {
    this.baseUrl = environment.production ? '' : environment.serverUrl;
    this.baseUrl += '/admin';
  }

  getActiveTherapists() {
    return this.http.get<any[]>(`${this.baseUrl}/therapist/active`);
  }

  getTherapistsSessions() {
    return this.http.get<any[]>(`${this.baseUrl}/therapist/sessions`);
  }

  createTherapist(therapist) {
    return this.http.post<any>(`${this.baseUrl}/therapist/create`, { therapist });
  }

  editTherapist(therapist, therapistId) {
    return this.http.post<any>(`${this.baseUrl}/therapist/edit`, { therapist, therapistId });
  }

  deleteTherapist(therapistId) {
    return this.http.delete<any>(`${this.baseUrl}/therapist/${therapistId}`);
  }

  getTherapistAvailability = (week: number, year: number, userId: number, therapistId: number) => {
    return this.http.post<any>(`${this.baseUrl}/therapist/users/availability/get`, { week, year, userId, therapistId });
  };
  clearGameDataTable = () => {
    return this.http.post<any>(`${this.baseUrl}/admin/gameData/clear`, {});
  };
  checkPassword = (password: string) => {
    return this.http.post<any>(`${this.baseUrl}/admin/gameData/checkPassword`, { password });
  };

  setTherapistAvailability = (
    therapistAvailability: ITherapistAvailability,
    week: number,
    year: number,
    userId: number,
    fromDate: Moment
  ) => {
    return this.http.post<any>(`${this.baseUrl}/therapist/users/availability/set`, {
      ...therapistAvailability,
      week,
      year,
      userId,
      fromDate,
    });
  };

  deleteTherapistAvailability = (userId: number, week: number, year: number) => {
    return this.http.post<any>(`${this.baseUrl}/therapist/users/availability/delete`, {
      userId,
      week,
      year,
    });
  };

  getActivePatients() {
    return this.http.get<any[]>(`${this.baseUrl}/patient/active`);
  }

  createPatient(patient) {
    return this.http.post<any>(`${this.baseUrl}/patient/create`, { patient });
  }

  createPatientTreatment(patientTreatment) {
    return this.http.post<any>(`${this.baseUrl}/treatment/create`, { patientTreatment });
  }

  editPatientTreatment(patientTreatment) {
    return this.http.post<any>(`${this.baseUrl}/treatment/edit`, { patientTreatment });
  }

  deletePatientTreatment(patientTreatmentId) {
    return this.http.delete<any>(`${this.baseUrl}/treatment/${patientTreatmentId}`);
  }

  editPatient(patient, patientId) {
    return this.http.post<any>(`${this.baseUrl}/patient/edit`, { patient, patientId });
  }

  updatePatient = (patient: IPatient): Observable<IPatient> => {
    return this.http.post<IPatient>(`${this.baseUrl}/patient/update`, patient);
  };

  getActivePatient(patientId) {
    return this.http.get<any>(`${this.baseUrl}/patient/${patientId}`);
  }

  getPatientActiveTreatments(patientId) {
    return this.http.get<any>(`${this.baseUrl}/treatment/${patientId}`);
  }

  getInactivePatients() {
    return this.http.get<any[]>(`${this.baseUrl}/patient/inactive`);
  }

  deletePatient(patientId) {
    return this.http.delete<any>(`${this.baseUrl}/patient/${patientId}`);
  }

  activatePatient(patientId: number) {
    return this.http.post<any>(`${this.baseUrl}/patient/activate`, { patientId });
  }

  resetPatientPassword = (patientId: number, setDefaultPassword: boolean) => {
    return this.http.post<any>(`${this.baseUrl}/patient/resetpassword`, { patientId, setDefaultPassword });
  };

  getAllInstitutes() {
    return this.http.get<any[]>(`${this.baseUrl}/institute`);
  }

  createInstitute(formData) {
    return this.http.post<any>(`${this.baseUrl}/institute/create`, formData);
  }

  editInstitute(formData) {
    return this.http.post<any>(`${this.baseUrl}/institute/edit`, formData);
  }

  deleteInstitute(instituteId) {
    return this.http.delete<any>(`${this.baseUrl}/institute/${instituteId}`);
  }

  getAllProfessions() {
    return this.http.get<any[]>(`${this.baseUrl}/profession`);
  }

  createProfession(formData) {
    return this.http.post<any>(`${this.baseUrl}/profession/create`, formData);
  }

  editProfession(formData) {
    return this.http.post<any>(`${this.baseUrl}/profession/edit`, formData);
  }

  getProfessionSlots(params) {
    return this.http.post<any>(`${this.baseUrl}/profession/offering`, params);
  }

  getAllExpertises() {
    return this.http.get<any[]>(`${this.baseUrl}/expertise`);
  }

  createExpertise(expertise) {
    return this.http.post<any>(`${this.baseUrl}/expertise/create`, { expertise });
  }

  editExpertise(expertise) {
    return this.http.post<any>(`${this.baseUrl}/expertise/edit`, { expertise });
  }

  deleteExpertise(expertiseId) {
    return this.http.delete<any>(`${this.baseUrl}/expertise/${expertiseId}`);
  }

  getPatientSchedule(data) {
    return this.http.post<any>(`${this.baseUrl}/booking/patient`, data);
  }

  getBookingAssignmentOffering(data) {
    return this.http.post<any>(`${this.baseUrl}/booking/offering`, data);
  }

  createBooking(data) {
    return this.http.post<any>(`${this.baseUrl}/booking/create`, data);
  }

  deleteBooking(data) {
    return this.http.post<any>(`${this.baseUrl}/booking/delete`, data);
  }
  editBookingById(booking: Partial<ITreatmentListItem>) {
    return this.http.post<any>(`${this.baseUrl}/booking`, booking);
  }
  deleteBookingById(bookingId: number) {
    return this.http.delete<any>(`${this.baseUrl}/booking/${bookingId}`);
  }

  getFuturePatientBookingStatistics(patientId: number) {
    return this.http.post<any>(`${this.baseUrl}/booking/patientstatistics`, { patientId });
  }

  getAllDepartments() {
    return this.http.get<any[]>(`${this.baseUrl}/department`);
  }

  createDepartment(department) {
    return this.http.post<any>(`${this.baseUrl}/department/create`, { department });
  }

  deleteDepartment(departmentId) {
    return this.http.delete<any>(`${this.baseUrl}/department/${departmentId}`);
  }

  getAllFollowups() {
    return this.http.get<any[]>(`${this.baseUrl}/followup`);
  }
  editFollowup(followup) {
    return this.http.post<any>(`${this.baseUrl}/followup/edit`, { followup });
  }
  deleteFollowup(followupId) {
    return this.http.delete<any>(`${this.baseUrl}/followup/${followupId}`);
  }
  createFollowup(followup) {
    return this.http.post<any>(`${this.baseUrl}/followup/create`, { followup });
  }
  createLogEntry(logEntry) {
    return this.http.post<any>(`${this.baseUrl}/activitylog/create`, logEntry);
  }

  getActiveAdmins() {
    return this.http.get<any[]>(`${this.baseUrl}/admin/active`);
  }

  createAdmin(admin) {
    return this.http.post<any>(`${this.baseUrl}/admin/create`, { admin });
  }

  editAdmin(admin, adminId) {
    return this.http.post<any>(`${this.baseUrl}/admin/edit`, { admin, adminId });
  }

  deleteAdmin(adminId) {
    return this.http.delete<any>(`${this.baseUrl}/admin/${adminId}`);
  }

  getAllLeads() {
    return this.http.get<any[]>(`${this.baseUrl}/lead/active`);
  }

  getLeadRemindersById(leadId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/lead/reminders/${leadId}`);
  }

  editLead(lead) {
    return this.http.post<any>(`${this.baseUrl}/lead/edit`, lead);
  }

  createLead(lead) {
    return this.http.post<any>(`${this.baseUrl}/lead/create`, lead);
  }

  createReminder(reminder) {
    return this.http.post<any>(`${this.baseUrl}/lead/reminder/create`, reminder);
  }

  getUserFilters(userId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/userfilters/${userId}`);
  }

  setUserFilters(filterName, value) {
    return this.http.post<any>(`${this.baseUrl}/userfilters/set`, { filterName, value });
  }

  getAllGames() {
    return this.http.get<any[]>(`${this.baseUrl}/games`);
  }

  getServerLogs() {
    return this.http.get<any[]>(`${this.baseUrl}/serverLogs`);
  }

  createGameData = (gameData) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/gameData/create`, {
        gameData,
      });
    } catch (error) {
      console.error(error);
    }
  };

  updateGameData = (gameData) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/gameData/update`, {
        gameData,
      });
    } catch (error) {
      console.error(error);
    }
  };

  deleteGameData = (gameDataIds) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/gameData/delete`, {
        gameDataIds,
      });
    } catch (error) {
      console.error(error);
    }
  };

  setGameDataStatus = (gameDataIds, active) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/gameData/updatestatus`, {
        gameDataIds,
        active,
      });
    } catch (error) {
      console.error(error);
    }
  };

  getShortGameData = (gameId) => {
    try {
      return this.http.get<any>(`${this.baseUrl}/gameData/get/${gameId}`);
    } catch (error) {
      console.error(error);
    }
  };

  getGameDataByIds = (gameDataIds) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/getbyids`, { gameDataIds });
    } catch (error) {
      console.error(error);
    }
  };

  uploadGameRelatedImage = (file, fileName) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/game/uploadgameimage`, {
        file,
        fileName,
      });
    } catch (error) {
      console.error(error);
    }
  };
}
