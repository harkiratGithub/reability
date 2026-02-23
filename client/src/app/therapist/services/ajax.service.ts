import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { Moment } from 'moment';
import _ from 'lodash';
import { HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { User } from '../../common/models/user';
import { FeedbackQuestion, IPatient, ITherapistAvailability, ITreatmentListItem } from '../../../types';

@Injectable()
export class AjaxService {
  baseUrl: string;
  signalingServerUrl: string;
  latestUserGameData: [];

  // Simple in-memory cache + in-flight deduplication for validGames
  private validGamesCache = new Map<string, { ts: number; data: any }>();
  private validGamesInflight = new Map<string, Observable<any>>();
  private lastValidGamesCallAt = new Map<string, number>();
  private readonly VALID_GAMES_TTL_MS = 300_000; // 5m cache
  private readonly VALID_GAMES_MIN_INTERVAL_MS = 2000; // 2s min interval per patient
  private floodWindowStart = 0;
  private floodIdsInWindow = new Set<string>();
  private readonly FLOOD_WINDOW_MS = 1000; // 1s window
  private readonly FLOOD_MAX_DISTINCT_IDS = 15; // if >15 distinct ids in 1s → short-circuit

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

  login = (username, password, captchaToken, userTimezone) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/login`, {
        username,
        password,
        captchaToken,
        userTimezone,
      });
    } catch (err) {
      console.error(err);
    }
  };

  enable2FA = (id, data) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/enable-2fa/${id}`, {
        data,
      });
    } catch (err) {
      console.error(err);
    }
  };

  verify2FA = (id, code) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/verify-2fa/${id}`, {
        token: code,
      });
    } catch (err) {
      console.error(err);
    }
  };

  reVerify2FA = (id) => {
    try {
      return this.http.put<any>(`${this.baseUrl}/re-verify-2fa/${id}`, null);
    } catch (err) {
      console.error(err);
    }
  };

  logout = () => {
    return this.http.post<any>(`${this.baseUrl}/logout`, {});
  };

  getVideoFiles = () => {
    return this.http.get<string[]>(`${this.baseUrl}/api/videos`);
  }

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
      if (id === null || id === undefined) {
        return of([]);
      }
      const key = String(id);
      const now = Date.now();

      // Serve fresh-enough cache
      const cached = this.validGamesCache.get(key);
      if (cached && now - cached.ts < this.VALID_GAMES_TTL_MS) {
        return of(cached.data);
      }

      // Coalesce concurrent requests
      const inflight = this.validGamesInflight.get(key);
      if (inflight) {
        return inflight;
      }

      // Throttle bursts within a small window using cache if present (even if stale)
      const lastAt = this.lastValidGamesCallAt.get(key) || 0;
      if (now - lastAt < this.VALID_GAMES_MIN_INTERVAL_MS && cached) {
        return of(cached.data);
      }
      this.lastValidGamesCallAt.set(key, now);

      // Global flood protection across distinct patient IDs
      if (now - this.floodWindowStart > this.FLOOD_WINDOW_MS) {
        this.floodWindowStart = now;
        this.floodIdsInWindow.clear();
      }
      this.floodIdsInWindow.add(key);
      if (this.floodIdsInWindow.size > this.FLOOD_MAX_DISTINCT_IDS) {
        // Too many distinct ids requested at once → return cache or empty to prevent API storm
        if (cached) {
          return of(cached.data);
        }
        return of([]);
      }

      const req$ = this.http
        .post<any>(`${this.baseUrl}/patient/validGames`, { patientId: id })
        .pipe(
          tap((data) => {
            this.validGamesCache.set(key, { ts: Date.now(), data });
          }),
          finalize(() => {
            this.validGamesInflight.delete(key);
          }),
          shareReplay(1)
        );
      this.validGamesInflight.set(key, req$);
      return req$;
    } catch (err) {
      console.error(err);
    }
  };

  getAllGames() {
    return this.http.get<any[]>(`${this.baseUrl}/therapist/games`);
  }

  getAllEndGames() {
    return this.http.get<any[]>(`${this.baseUrl}/patient/games`);
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

  updateStartSessionWithPatient = (userId, type = null) => {
    try {
      this.http
        .post<any>(`${this.baseUrl}/therapist/sessions/therapistStartTime`, {
          userId,
          type,
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

  getPatientEndActivities = (startTime, endTime) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/getPatientDataList`, {
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

  getGameSettings = (gameId, patientId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/getGameSettings`, {
        gameId,
        patientId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  getGameMetaData = (videoName) => {
    return this.http.get<any>(`${this.baseUrl}/patient/gameMetaData/get/${videoName}`);
  };

  savePatientMetaData = (data) => {
    return this.http.post<any>(`${this.baseUrl}/patient/metaData/create`, data);
  };

  // patient RTM routes
  sendPatientPainScale = (patientId, painValue, patient_note, userTimezone) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/rtmSession`, { patientId, painValue, patient_note, userTimezone });
    } catch (err) {
      console.error(err);
    }
  };

  sendTermsConditions = (userId, dateAgreedTerms) => {
    try {
      return this.http.patch<any>(`${this.baseUrl}/patient/termsConditions`, {
        id: userId,
        date_agreed_terms: dateAgreedTerms,
      });
    } catch (err) {
      console.error(err);
    }
  };

  sendRtmTherapistSession = (patientId, timestamp, data) => {
    try {
      this.http.post<any>(`${this.baseUrl}/therapist/rtmSession`, { patientId, timestamp, data }).subscribe(() => { });
    } catch (err) {
      console.error(err, 'message');
    }
  };

  sendRtmTherapistSessions = (patientId, data, timestamp, userTimezone) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/rtmSession`, { patientId, data, timestamp, userTimezone });
    } catch (err) {
      console.error(err, 'message');
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

  updateGameSummary = ({gameSummary,token}) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/gameSession/updateSession`, {
        gameSummary,token,
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

  /*saveGameSettingsFromTherapist = (patientId, gameId, settings) => {
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
  };*/

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

  updatePatientMobileAvailability = (patientId, hasMobile) => {
    try {
      return this.http
        .post<any>(`${this.baseUrl}/patient/mobileAvailability`, {
          patientId,
          hasMobile,
        })
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  updatePatientAvailabilityStatus = (patientId: number, availabilityStatus: string) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/availabilityStatus`, {
        patientId,
        availabilityStatus,
      });
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

  getFeedbackQuestions(): Observable<FeedbackQuestion[]> {
    return this.http.get<FeedbackQuestion[]>(`${this.baseUrl}/patient/feedback/questions`);
  }

  // patient create routes from therapist end
  getAllInstitutes() {
    return this.http.get<any[]>(`${this.baseUrl}/therapist/institute`);
  }

  getAllDepartments() {
    return this.http.get<any[]>(`${this.baseUrl}/therapist/department`);
  }

  createPatient(patient) {
    return this.http.post<any>(`${this.baseUrl}/therapist/patient/create`, { patient });
  }
  // therapist rtm report
  getAllRtmReport(params: { month?: string; year?: string } = {}) {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]!);
      }
    });
    const url = `${this.baseUrl}/therapist/rtm-details`;
    return this.http.get<any>(url, { params: httpParams });
  }

  getActivePatient = (patientId) => {
    try {
      return this.http.get<any>(`${this.baseUrl}/patient/users/${patientId}`);
    } catch (error) {
      console.error(error);
    }
  };

  sendEmailAfterLogin = (patient) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/users/sendEmail`, { patient });
    } catch (err) {
      console.error(err);
    }
  };


  getRustDeskId = (patientId) => {
    try {
      return this.http.get<any>(`${this.baseUrl}/therapist/get-rustdesk-id/${patientId}`);
    } catch (error) {
      console.error(error);
    }
  };

  getpatientRustDeskId = (patientId) => {
    try {
      return this.http.get<any>(`${this.baseUrl}/patient/get-rustdesk-id/${patientId}`);
    } catch (error) {
      console.error(error);
    }
  };

  saveRustDeskId = (patientId, rustdeskId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/save-rustdesk-id`, {
        patientId,
        rustdeskId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  getLastTherapistSessionStatus = (patientId: number): Observable<any> => {
    try {
      return this.http.get<any>(`${this.baseUrl}/therapist/sessions/lastStatus/${patientId}`);
    } catch (err) {
      console.error(err);
    }
  };

  uploadCallAudioSession(file: File, patientId: number, therapistId: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('patient_id', String(patientId));
    formData.append('therapist_id', String(therapistId));  
    return this.http.post<any>(`${this.baseUrl}/patient/gameactivities/uploadcallaudiofile`, formData);
  }

  getLastCallSummary = (patientId: number, therapistId: number) =>{
    try {
      return this.http.get<any>(`${this.baseUrl}/therapist/get-last-call-summary/${patientId}/${therapistId}`);
    } catch (err) {
      console.error(err);
    }
  }

  getDailyCallSummary = (patientId: number, therapistId: number , date: string) =>{
    try {
      return this.http.get<any>(`${this.baseUrl}/therapist/get-daily-call-summary/${patientId}/${therapistId}/${date}`);
    } catch (err) {
      console.error(err);
    }
  }

  saveGameSettingsFromTherapist = (
    patientId,
    gameId,
    settings?: any,    
    compSetting?: any   
  ) => {
    try {
      const payload: any = { patientId, gameId };  
      if (settings !== undefined) {
        payload.settings = settings;
      }  
      if (compSetting !== undefined) {
        payload.compSetting = compSetting;
      }  
     return  this.http.post<any>(`${this.baseUrl}/therapist/gameSettings/saveNewGameSettings`, payload)
        .subscribe(() => { });
    } catch (err) {
      console.error(err);
    }
  };



  addCompensationSettings = (patientId,therapistId,allGames,compSettings) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/compensation/add`, {
        patientId,therapistId,allGames,compSettings
      });
    } catch (err) {
      console.error(err);
    }
  };

  getCompSettings = (gameId, patientId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/getCompSettings`, {
        gameId,
        patientId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  getCompSettingsFromPatient = (gameId, patientId) => {
    try {
      return this.http.post<any>(`${this.baseUrl}/patient/getCompSettings`, {
        gameId,
        patientId,
      });
    } catch (err) {
      console.error(err);
    }
  };
  
  getCompThresholdValue(): Observable<{ compThresholds: any }> {
    try {
      return this.http.get<{ compThresholds: any }>(`${this.baseUrl}/patient/getCompThreshold`);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
 
  getScoreData = (patientId: number, gameId: number, fromDate: string, toDate: string): Observable<any> => {
    try {
      return this.http.post<any>(`${this.baseUrl}/therapist/getScoreData`, {
        patientId,
        gameId,
        fromDate,
        toDate,
      });
    } catch (err) {
      console.error('Error fetching score data:', err);
      throw err;
    }
  };
  clearRingingStatus(patientId: number) {
    try {
       return this.http.post<any>(`${this.baseUrl}/patient/clearRinging`, { patientId });
    } catch (err) {
      console.error(err);
    } 
  }
  therapistClearRingingStatus(patientId: number) {
    try {
       return this.http.post<any>(`${this.baseUrl}/therapist/clearRinging`, { patientId });
    } catch (err) {
      console.error(err);
    } 
  }
  getFeatureFlag(id: string, role: string) {
    const apiRole = role === 'therapist' ? 'therapist' : 'patient';
    try {
      return this.http.get<any>(`${this.baseUrl}/${apiRole}/getFeatureFlag/${id}/${role}`);
    } catch (err) {
      console.error(err);
    } 
  }
}
