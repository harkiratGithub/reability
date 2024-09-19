import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Moment } from 'moment';
import _ from 'lodash';

import { environment } from '../../../environments/environment';
import { User } from '../../common/models/user';
import { IPatient, ITherapistAvailability, ITreatmentListItem } from '../../../types';

@Injectable()
export class AjaxService {
  baseUrl: string;
  signalingServerUrl: string;
  latestUserGameData: [];

  constructor(private http: HttpClient) {
    this.baseUrl = environment.production ? '' : environment.serverUrl;
    this.signalingServerUrl = environment.signalingServerUrl;
  }
  // common routes
  getIceServers = () => {
    try {
      return this.http.get<any[]>(`/ice_servers`);
    } catch (err) {
      console.error(err);
    }
  };

  login = (username, password, captchaToken) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/login`, {
        username,
        password,
        captchaToken,
      });
    } catch (err) {
      console.error(err);
    }
  };

  logout = () => {
    return this.http.post<any>(`${this.baseUrl}/logout`, {});
  };

  checkIsAuthenticate = () => {
    return this.http.get<any>(`${this.baseUrl}/users/isAuthenticated`, {});
  };

  getUserData = () => {
    return this.http.get<any>(`${this.baseUrl}/users/getUserData`, {});
  };

  sendHeartBeat = (onTherapistSession, onGameSession) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/users/sendHeartBeat`, {
          onTherapistSession,
          onGameSession,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  checkValidEmailToken = (token, captchaToken) => {
    return this.http.post<any>(`${this.baseUrl}/users/checkToken`, {
      token,
      captchaToken,
    });
  };

  createFastLoginToken = (
    patientId,
    userId: number,
    emailOrPhone: string,
    dateTime: string,
    link_type: string,
    captchaToken
  ) => {
    return this.http.post<any>(`${this.baseUrl}/users/createFastLoginToken`, {
      patientId,
      userId,
      emailOrPhone,
      dateTime,
      link_type,
      captchaToken,
    });
  };

  fastLogin = (token, captchaToken) => {
    return this.http.post<any>(`${this.baseUrl}/fastLogin`, {
      token,
      captchaToken,
    });
  };

  changePassword = (token, password, captchaToken) => {
    return this.http.post<any>(`${this.baseUrl}/users/changePassword`, {
      token,
      password,
      captchaToken,
    });
  };

  forgotPassword = (username, captchaToken) => {
    return this.http.post<any>(`${this.baseUrl}/users/forgotPassword`, {
      username,
      captchaToken,
    });
  };

  // this route is exception, it's for patient, but therapist use it also
  getValidGames = (id) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/validGames`, {
        patientId: id,
      });
    } catch (err) {
      console.error(err);
    }
  };

  getAllGames() {
    return this.http.get<any[]>(`${this.baseUrl}/therapist/games`);
  }

  addGameToPatient = (patientId, gameId) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/therapist/addGameToPatient`, {
          patientId,
          gameId,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  removeGameFromPatient = (patientId, gameId) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/therapist/removeGameFromPatient`, {
          patientId,
          gameId,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  // therapist routes
  getAll() {
    return this.http.post<User[]>(`${this.baseUrl}/therapist/users/getAll`, {});
  }

  updateStartSessionWithPatient = (userId) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/therapist/sessions/therapistStartTime`, {
          userId,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  getOpenPeers = () => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/users/openPeers`, {});
    } catch (err) {
      console.error(err);
    }
  };

  sendEmailAfterConnection = (patient, therapist) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/users/sendEmail`, { patient, therapist });
    } catch (err) {
      console.error(err);
    }
  };

  getPatientActivities = (startTime, endTime) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/getPatientList`, {
        startTime,
        endTime,
      });
    } catch (err) {
      console.error(err);
    }
  };

  setTherapistAvailability = (
    therapistAvailability: ITherapistAvailability,
    week: number,
    year: number,
    userId: number,
    fromDate: Moment
  ) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/users/availability/set`, {
        ...therapistAvailability,
        week,
        year,
        userId,
        fromDate,
      });
    } catch (err) {
      console.error(err);
    }
  };

  deleteTherapistAvailability = (userId: number, week: number, year: number) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/users/availability/delete`, {
        userId,
        week,
        year,
      });
    } catch (err) {
      console.error(err);
    }
  };

  getTherapistAvailability = (week: number, year: number, userId: number, therapistId: number) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/users/availability/get`, {
        week,
        year,
        userId,
        therapistId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // patient routes
  getGameSettingsForPatient = (gameId, patientId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/getGameSettings`, {
        gameId,
        patientId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // patient routes
  startGameSession = (gameId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/gameSession/startGameSession`, {
        gameId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  updateGameSummary = (gameSummary) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/gameSession/updateSession`, {
        gameSummary,
      });
    } catch (err) {
      console.error(err);
    }
  };

  updateGameFeedback = (gameFeedback) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/gameSession/updateSession`, {
        gameFeedback,
      });
    } catch (err) {
      console.error(err);
    }
  };

  saveGameSettings = (gameId, settings) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/patient/gameSettings/saveNewGameSettings`, {
          gameId,
          settings,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  saveGameSettingsFromTherapist = (patientId, gameId, settings) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/therapist/gameSettings/saveNewGameSettings`, {
          patientId,
          gameId,
          settings,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  getConnectedPeers = () => {
    try {
      return this.http.get<any[]>(`${this.signalingServerUrl}/peerjs/getConnectedPeers`);
    } catch (err) {
      console.error(err);
    }
  };

  disconnectConnectedPeers = (peerId) => {
    try {
      return this.http.post<any>(`${this.signalingServerUrl}/peerjs/disconnectConnectedPeers`, {
        peerId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  getPatientEmailAndPhone = (patientId, userId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/getPatientContactData`, {
        patientId,
        userId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  updatePatientCameraAvailability = (patientId, hasCamera) => {
    try {
      return this.http
        .post<any>(`${this.baseUrl}/patient/cameraAvailability`, {
          patientId,
          hasCamera,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  updatePatient = (patient: IPatient): Observable<IPatient> => {
    try {
      return this.http.post<IPatient>(`${this.baseUrl}/therapist/patient`, patient);
    } catch (err) {
      console.error(err);
    }
  };
  deleteBookingById = (bookingId: number) => {
    try {
      return this.http.delete<any>(`${this.baseUrl}/therapist/booking/${bookingId}`);
    } catch (err) {
      console.error(err);
    }
  };
  editBookingById = (booking: Partial<ITreatmentListItem>) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/booking/`, booking);
    } catch (err) {
      console.error(err);
    }
  };

  uploadGameRelatedImage = (file) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/gameactivities/uploadgamerelatedimage`, {
        file,
      });
    } catch (error) {
      console.error(error);
    }
  };

  uploadGameRelatedImageForTherapist = (file) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/gameactivities/uploadgamerelatedimage`, {
        file,
      });
    } catch (error) {
      console.error(error);
    }
  };

  createUserGameData = (userGameData) => {
    if (_.isEqual(this.latestUserGameData, userGameData)) {
      console.log('data is trying to duplicate');
      return;
    }
    this.latestUserGameData = userGameData;
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/userGameData/create`, {
        userGameData,
      });
    } catch (error) {
      console.error(error);
    }
  };

  updateUserGameData = (userGameData, isTherapist) => {
    const role = isTherapist ? 'therapist' : 'patient';
    try {
      return this.http.put<any>(`${this.baseUrl}/${role}/userGameData/update`, userGameData);
    } catch (error) {
      console.error(error);
    }
  };

  deleteUserGameData = (userGameDataIds, isTherapist) => {
    const role = isTherapist ? 'therapist' : 'patient';
    try {
      return this.http.put<any>(`${this.baseUrl}/${role}/userGameData/delete`, {
        userGameDataIds,
      });
    } catch (error) {
      console.error(error);
    }
  };

  setUserGameDataStatus = (userGameDataIds, active) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/therapist/userGameData/updatestatus`, {
        userGameDataIds,
        active,
      });
    } catch (error) {
      console.error(error);
    }
  };

  changeUserGameDataDrawer = (userGameDataIds, drawer) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/therapist/userGameData/changedrawer`, {
        userGameDataIds,
        drawer,
      });
    } catch (error) {
      console.error(error);
    }
  };

  getUserGameData = (gameId, userId, isTherapist) => {
    const role = isTherapist ? 'therapist' : 'patient';
    try {
      return this.http.get<any>(`${this.baseUrl}/${role}/userGameData/get/${gameId}/${userId}`);
    } catch (error) {
      console.error(error);
    }
  };

  createGameData = (gameData) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/gameData/create`, {
        gameData,
      });
    } catch (error) {
      console.error(error);
    }
  };

  updateGameData = (gameData) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/therapist/gameData/update`, {
        gameData,
      });
    } catch (error) {
      console.error(error);
    }
  };

  sendLogToServer = (data) => {
    const role = data.isTherapist ? 'therapist' : 'patient';
    try {
      return this.http.post<any>(`${this.baseUrl}/${role}/addServerLog`, {
        data,
      });
    } catch (error) {
      console.error(error);
    }
  };

  deleteGameData = (gameDataIds) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/therapist/gameData/delete`, {
        gameDataIds,
      });
    } catch (error) {
      console.error(error);
    }
  };

  setGameDataStatus = (gameDataIds, active) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/therapist/gameData/updatestatus`, {
        gameDataIds,
        active,
      });
    } catch (error) {
      console.error(error);
    }
  };

  getShortGameData = (gameId) => {
    try {
      return this.http.get<any>(`${this.baseUrl}/therapist/gameData/get/${gameId}`);
    } catch (error) {
      console.error(error);
    }
  };

  getGameDataByIds = (gameDataIds) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/gameData/getbyids`, { gameDataIds });
    } catch (error) {
      console.error(error);
    }
  };
}
