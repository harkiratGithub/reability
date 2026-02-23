import moment from 'moment';
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { reduce, chain, filter, groupBy, capitalize, startsWith, head ,orderBy} from 'lodash';
import * as util from '../../../backoffice/backoffice-util';
import {
  GeneralModalData,
  GENERAL_MODAL_CONTENT,
  GENERAL_MODAL_STYLE,
  OuterModalInterface,
} from './../../../common/general-modal/general-modal.component';
import { AppActions } from 'src/app/app.actions';
import { getLast7DaysFrom, addTwoDurationTimeTogether, getSecondsFromTimeString } from '../../../common/date-util';
import { AuthenticationService } from 'src/app/common/services/authentication.service';
import { AjaxService } from '../../services/ajax.service';
import { PeersStatus, PATIENT_LOG_STORAGE_KEY } from '../../../../constants';
import { ConfiguratorModalComponent } from '../configurator-modal/configurator-modal.component';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { setAudioStreamsToComponent } from '../../../common/utils';
import { IGame, IPatientLog } from '../../../../types';
import { RTM_MODAL_CONTENT, RTM_MODAL_STYLE, RTMModalData } from 'src/app/common/rtm-modal/rtm-modal.component';
import * as consts from '../../../backoffice/backoffice-constants';
interface IListItem {
  id: number;
  name: string;
  institute_id?: number;
  profession_id?: number;
}

import {
  SHOW_RTM_MODAL_CONTENT,
  SHOW_RTM_MODAL_STYLE,
  SHOWRTMModalComponent,
  SHOWRTMModalData,
} from 'src/app/common/show-rtm-modal/rtm-modal.component';

@Component({
  selector: 'app-patient-patient-list-component',
  templateUrl: './patient_list.component.html',
  styleUrls: ['./patient_list.component.scss'],
})
export class PatientListComponent implements OnInit, OnDestroy {
  @Input() audioStreams: MediaStream[];
  lastWeekActivityArray = [];
  therapistId = -1;
  loggedIn = -1;
  loggedOut = -1;
  currentDay = 0;
  patientList = [];
  patientListFiltered = [];
  gamesNames: string[] = [];
  patientListGrouped: any = [];
  intervalId = undefined;
  patientLog: IPatientLog[] = [];
  selectedPatientId: string = '';
  filterFunc: (data: [], text: string) => void;
  peersStatusConst = PeersStatus;
  headerMessage = 'For game settings, click on one of the icons:';
  allGames: IGame[];
  minDurationToShowOnTooltip = 30;
  shownLogs = {};
  isCopiedToClipboard: boolean = false;
  isLogModalOpen: boolean = false;
  selectedGame: any = {};
  selectedGameIndex: number = 0;
  parsedInstitutes = [];
  tabs = consts.tabsData;
  parsedDepartments = [];
  @Input() allInstitutes;
  @Input() allDepartments;
  currentView = consts.mode.view;
  isPatientViewEnable: boolean = false;
  currentTabIndex = consts.Tabs.patients;
  isPatientData: boolean = false;

  constructor(
    public dialog: MatDialog,
    private ajax: AjaxService,
    public appActions: AppActions,
    private recaptchaV3Service: ReCaptchaV3Service,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit() {
    this.therapistId = this.authenticationService.currentUserValue.id;
    this.filterFunc = this.filterByName;
    this.onWeeklyActivityClicked();
    const audioContainerElement = document.getElementById('audio-container');
    setAudioStreamsToComponent(audioContainerElement, this.audioStreams);
    this.ajax.getAllGames().subscribe((allGames) => {
      this.allGames = allGames;
      this.gamesNames = this.allGames?.map((game) => game?.name);
      this.allGames?.map((game) => this.getGameIcon(game));
    });
    this.loadInstitutes();
    this.loadDepartments();
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  toggleGame(game: { id: number }, patient: { allGames: { isValid: any }[]; id: any }) {
    const gameIndex = this.allGames.findIndex((obj) => obj.id == game.id);
    patient.allGames[gameIndex].isValid = !patient.allGames[gameIndex].isValid;
    if (!patient.allGames[gameIndex].isValid) {
      this.ajax.removeGameFromPatient(patient.id, game.id);
    } else {
      this.ajax.addGameToPatient(patient.id, game.id);
    }
  }

  getPatientActivities = () => {
    this.ajax
      .getPatientActivities(this.lastWeekActivityArray[0], this.lastWeekActivityArray[6])
      .subscribe((patients) => {
        this.ajax.getConnectedPeers().subscribe((peerUsers) => {
          patients.map((patient: { status: string; user_id: { toString: () => any } }) => {
            if (
              patient.status === this.peersStatusConst.AVAILABLE &&
              !peerUsers.find((peerUser) => peerUser.id === patient.user_id.toString())
            ) {
              patient.status = this.peersStatusConst.LOGGED_OUT;
            }
          });
          this.patientList = this.buildPatientActivities(patients);
          this.patientList.forEach((patient) => {
            patient.log = '';
            for (let game of this.gamesNames) {
              const storageKey = localStorage.getItem(patient.userId + '_' + game + PATIENT_LOG_STORAGE_KEY);
              if (storageKey) {
                patient.log += game.toUpperCase() + '\n' + storageKey + '\n' + '\n';
              }
            }
          });
          this.patientListGrouped = groupBy(this.patientList, (p) => p.status);
          this.patientListFiltered = this.patientList;
        });
      });
  };

  getKeys(object: any): string[] {
    // console.log('Keys: ', object ? Object.keys(object) : []);
    return object ? Object.keys(object) : [];
  }

  hasValidProperties(object: any): boolean {
    // console.log("Property: ", object, Object.values(object));
    return Object.values(object).some((value) => value !== null && value !== undefined && typeof value !== 'object');
  }

  setFilteredData = (filteredData: any[]) => (this.patientListFiltered = filteredData);

  filterByName = (data: any[], filterText: string) => {
    if (!filterText) {
      this.setFilteredData(data);
      return;
    }
    const lowerCaseFilter = filterText.toLowerCase();
    const filteredData = filter(
      data,
      (element) =>
        element?.fullName?.toLowerCase().includes(lowerCaseFilter) ||
        element?.userName?.toLowerCase().includes(lowerCaseFilter)
    );
    this.setFilteredData(filteredData);
  };

  checkIfSettingModalOpened = (patient: { id: any }) => {
    if (this.patientList.length > 0) {
      const patientFound = this.patientList.find((currPatient) => currPatient.id === patient.id);
      return patientFound ? patientFound.settingMenuOpen || false : false;
    }
    return false;
  };
/*
  buildPatientActivities = (patientList: any) => {
    const patients = chain(patientList)
      .groupBy('id')
      .mapValues((items) => ({
        id: items[0].id,
        fullName: items[0].full_name,
        userName: items[0].user_name,
        status: items[0].status,
        lastLogin: items[0].logged_in_at,
        created_at: items[0].created_at,
        // gameSummaries: items
        //   ?.filter((item) => Object.keys(item?.game_summary || {})?.length)
        //   ?.map((item) => ({ start_time: item.start_time, game_summary: item?.game_summary }))
        //   ?.sort((a, b) => new Date(b?.start_time)?.getTime() - new Date(a?.start_time)?.getTime()),
        gameSummary: head(
          items
            ?.filter((item) => Object.keys(item?.game_summary || {})?.length)
            ?.map((item) => ({
              start_time: item.start_time,
              game_summary: item?.game_summary,
              session_feedback: item?.session_feedback,
            }))
            ?.sort((a, b) => new Date(b?.start_time)?.getTime() - new Date(a?.start_time)?.getTime())
        )?.game_summary,
        lastWeekActivity: [],
        settingMenuOpen: this.checkIfSettingModalOpened(items[0]),
        userId: items[0].user_id,
        phone: items[0].phone,
        contacts: items[0].contacts,
        therapistSessionId: items[0].therapist_session_id,
        isRTM: items[0].isRTM,
      }))
      .values()
      .uniqBy('id')
      .orderBy([(p) => (p.status === 'online' ? 1 : 0), (p) => new Date(p.lastLogin)], ['desc', 'desc'])
      //.orderBy(
       // [
        //  (p) => (p.status === 'online' ? 1 : 0), // Online patients first
        //  (p) => (p.created_at ? new Date(p.created_at) : new Date(p.lastLogin)), // Sort by created_at if no lastLogin        
        //  (p) => (p.lastLogin ? 1 : 0),           // Patients with a lastLogin next
       // ],
       // ['desc', 'desc', 'desc'] // Descending for online status, descending for lastLogin existence, ascending by date
       // )
      .value();
    patients.forEach((patient) => {
      for (let i = 0; i < this.lastWeekActivityArray.length; i++) {
        const checkActivity = filter(
          patientList,
          (element) =>
            element &&
            element.start_time &&
            element.start_time.includes(this.lastWeekActivityArray[i]) &&
            element.id === patient.id
        );
        const sumActivity = reduce(
          checkActivity,
          (acc, a) => {
            if (!a.duration) {
              return acc;
            }

            acc.duration = addTwoDurationTimeTogether(acc.duration, a.duration);
            acc.withTherapistSession = (a && a.therapist_session_id) || acc.withTherapistSession;

            const seconds = getSecondsFromTimeString(a.duration);
            if (seconds < this.minDurationToShowOnTooltip) {
              return acc;
            }

            if (!this?.allGames || this?.allGames.length === 0) {
              return acc;
            }

            const game = this?.allGames.find((game) => game.id === a.game_id);
            if (!game) {
              return acc;
            }
            const gameSummary = a.game_summary;
            const sessionFeedback = a.session_feedback;
            const gameName = game ? game.name : a.game_id.toString();
            const gameDuration = acc.gamesDuration.find((gameDuration) => gameDuration.gameName === gameName);
            if (gameDuration) {
              gameDuration.duration = addTwoDurationTimeTogether(gameDuration.duration, a.duration);
            } else {
              acc.gamesDuration.push({ gameName, duration: a.duration, gameSummary, sessionFeedback });
            }
            return acc;
          },
          { duration: '00:00:00', withTherapistSession: false, gamesDuration: [] }
        );

        sumActivity.duration = sumActivity.duration === '00:00:00' ? '' : sumActivity.duration;
        patient.lastWeekActivity[i] = sumActivity;
      }
      this.getPatientRecentGameActivity(patient);
    });

    return patients;
  };*/

  buildPatientActivities = (patientList: any) => {
    const patients = chain(patientList)
      .groupBy('id')
      .mapValues((items) => ({
        id: items[0].id,
        fullName: items[0].full_name,
        userName: items[0].user_name,
        status: items[0].status,
        lastLogin: items[0].logged_in_at,
        created_at: items[0].created_at,
  
        gameSummary: head(
          items
            ?.filter((item) => Object.keys(item?.game_summary || {})?.length)
            ?.map((item) => ({
              start_time: item.start_time,
              game_summary: item?.game_summary,
              session_feedback: item?.session_feedback,
            }))
            ?.sort((a, b) => new Date(b?.start_time)?.getTime() - new Date(a?.start_time)?.getTime())
        )?.game_summary,
  
        lastWeekActivity: [],
        settingMenuOpen: this.checkIfSettingModalOpened(items[0]),
        userId: items[0].user_id,
        phone: items[0].phone,
        contacts: items[0].contacts,
        therapistSessionId: items[0].therapist_session_id,
        isRTM: items[0].isRTM,
      }))
      .values()
      .uniqBy('id')
      .orderBy([(p) => (p.status === 'online' ? 1 : 0), (p) => new Date(p.lastLogin)], ['desc', 'desc'])
      .value();
  
    patients.forEach((patient) => {
      for (let i = 0; i < this.lastWeekActivityArray.length; i++) {
  
        const checkActivity = filter(
          patientList,
          (element) =>
            element &&
            element.start_time &&
            element.start_time.includes(this.lastWeekActivityArray[i]) &&
            element.id === patient.id
        );
  
        const sumActivity = reduce(
          checkActivity,
          (acc, a) => {
            // ✅ PARSE game_summary JSON if needed
            let summary = a.game_summary;
            if (typeof summary === 'string') {
              try {
                summary = JSON.parse(summary);
              } catch {}
            }
            
            if (Number(a.therapist_id) === Number(this.therapistId)) {
              console.log("====matching =======",a.therapist_id,acc);
              //return acc; 
            }
            // ✅ THERAPIST FILTER (IMPORTANT)
            if (Number(a.therapist_id) !== Number(this.therapistId)) {
              console.log("====skipping =======",a.therapist_id,acc);
              return acc; 
            }

            // ✅ GET LAST CLEAR TIME
            const clearKey = `LAST_CLEAR_${this.therapistId}_${patient.userId}`;
            const clearDataRaw = localStorage.getItem(clearKey);

            if (clearDataRaw) {
              try {               
                const clearData = JSON.parse(clearDataRaw);
                console.log("====lastdeletedtime====",clearData.deletedAt);
                const deletedAt = new Date(clearData.deletedAt).getTime();
                const dbTime = a.start_time;
                const utcFormatted = dbTime.replace(' ', 'T') + 'Z';
                const activityTime = new Date(utcFormatted).getTime();
                console.log("===deletedAt===",deletedAt);
                console.log("===activityTime===",activityTime);
                if (activityTime <= deletedAt) {
                  //return acc;
                }

              } catch (e) {
                console.log('Error parsing clear data');
              }
            }

            if (!a.duration) {
              return acc;
            }
  
            acc.duration = addTwoDurationTimeTogether(acc.duration, a.duration);
            acc.withTherapistSession = (a && a.therapist_session_id) || acc.withTherapistSession;
  
            const seconds = getSecondsFromTimeString(a.duration);
            if (seconds < this.minDurationToShowOnTooltip) {
              return acc;
            }  
            if (!this?.allGames || this?.allGames.length === 0) {
              return acc;
            }  
            const game = this?.allGames.find((game) => game.id === a.game_id);
            if (!game) {
              return acc;
            }  
            const gameName = game ? game.name : a.game_id.toString();
            const sessionFeedback = a.session_feedback;
            const gameSummary = summary;  
            const gameDuration = acc.gamesDuration.find((g) => g.gameName === gameName);
            if (gameDuration) {
              gameDuration.duration = addTwoDurationTimeTogether(gameDuration.duration, a.duration);
            } else {
              acc.gamesDuration.push({
                gameName,
                duration: a.duration,
                gameSummary,
                sessionFeedback,
                start_time: a.start_time
              });
            }
  
            return acc;
          },
          { duration: '00:00:00', withTherapistSession: false, gamesDuration: [] }
        );
  
        sumActivity.duration = sumActivity.duration === '00:00:00' ? '' : sumActivity.duration;
        patient.lastWeekActivity[i] = sumActivity;
      }
  
      this.getPatientRecentGameActivity(patient);
    });
  
    return patients;
  };
  
  convertDbUtcToLocal(dbTime: string): string {
    const utcString = dbTime.replace(' ', 'T') + 'Z';
    const date = new Date(utcString);
  
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  getPeerStatusColor = (status: any) => {
    switch (status) {
      case this.peersStatusConst.AVAILABLE:
        return '#2EFFD0';
      case this.peersStatusConst.CONNECTED:
        return '#2CAB70';
      case this.peersStatusConst.BUSY:
        return '#E53935';
      case this.peersStatusConst.LOGGED_OUT:
        return '#89A8BF';
      case this.peersStatusConst.DISABLED:
        return '#000000';
    }
  };

  onWeeklyActivityClicked = (side = undefined) => {
    switch (side) {
      case 'left':
        this.currentDay -= 7;
        break;
      case 'right':
        this.currentDay += 7;
        if (this.currentDay > 0) {
          this.currentDay = 0;
          // the week didn't change, so no need to send request to the server
          return;
        }
        break;
      default:
        this.currentDay = 0;
        break;
    }
    this.lastWeekActivityArray = getLast7DaysFrom(this.currentDay);
    this.getPatientActivities();
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.getPatientActivities();
    }, 600000);
  };

  getGameIcon = (game: IGame) => {
    const currGame = game;
    currGame.path = `/assets/game-icons-patient-list/${game.name}.png`;
    currGame.url = this.getUrlGame(game.url);
  };

  getUrlGame(url: string) {
    return url + 'index.html';
  }

  getPatientRecentGameActivity = (patient: {
    id: any;
    fullName?: any;
    userName?: any;
    status?: any;
    lastLogin?: any;
    gameSummary?: any;
    lastWeekActivity: any;
    settingMenuOpen?: any;
    userId?: any;
    phone?: any;
    contacts?: any;
    therapistSessionId?: any;
    games?: any;
    allGames?: any;
    gameIds?: any;
  }) => {
    this.ajax.getValidGames(patient.id).subscribe((games) => {
      patient.games = games;
      const validGameIds = games.map((game: { id: any }) => game.id);
      patient.allGames = this?.allGames?.map((game) => {
        const isValid = validGameIds?.includes(game.id);
        return { ...game, isValid };
      });
      patient.gameIds = [];
      patient.lastWeekActivity.map((activity: { game_id: any }) => {
        if (activity.game_id && !patient.gameIds.find((game: { id: any }) => game.id === activity.game_id)) {
          patient.gameIds.push({
            id: activity.game_id,
          });
        }
      });
      // icon & which games have configorator need to come from server
      // patient.games = patient.games.filter(game => game.name === 'studio');
      patient.games.map((game: any) => this.getGameIcon(game));
      // when more games filter be availble sort by activity (game, index) => game.id === patient.gameIds[index]
    });
  };

  togglePatientSettingMenu = (patient: { settingMenuOpen: boolean }) => {
    patient.settingMenuOpen = !patient.settingMenuOpen;
  };

  openGameConfiguration = (game: any, patient: any) => {
    const dialogRef = this.dialog.open(ConfiguratorModalComponent, {
      data: {
        game,
        patient,
      },
    });
  };

  sendFastLoginLink = (patient: { id: any; userId: number }) => {
    const modalData: GeneralModalData = {
      modalStyle: GENERAL_MODAL_STYLE.WHITE,
      content: GENERAL_MODAL_CONTENT.SEND_FAST_LOGIN,
      patient,
      approveCallback: async (modalValues: OuterModalInterface) => {
        this.recaptchaV3Service.execute('check_token').subscribe(async (captchaToken) => {
          await this.ajax
            .createFastLoginToken(
              patient.id,
              patient.userId,
              modalValues.dataFromInnerForm.innerModalValue.email_or_phone,
              modalValues.dataFromInnerForm.innerModalValue.date_time,
              modalValues.dataFromInnerForm.innerModalValue.link_type,
              captchaToken
            )
            .toPromise()
            .then((res) => {
              modalValues.dataFromInnerForm.innerModalValue.date_time
                ? this.appActions.setMessageGeneralModal(
                    'The message will be sent at ' +
                      moment
                        .unix(Number.parseInt(modalValues.dataFromInnerForm.innerModalValue.date_time))
                        .format('DD/MM/YYYY HH:mm')
                  )
                : this.appActions.setMessageGeneralModal('The message was sent');
            })
            .catch((err) => {
              this.appActions.setMessageGeneralModal('an error occurred. Please try again later');
              console.log('error ? ', err);
            });
        });
      },
      header: 'Send login link',
    };
    this.appActions.openGeneralModal(modalData);
  };

  addRTMMinutes = (patient: { id: any; userId: number }) => {
    const modalData: RTMModalData = {
      modalStyle: RTM_MODAL_STYLE.WHITE,
      content: RTM_MODAL_CONTENT.SEND_FAST_LOGIN,
      patient,
      approveCallback: async (modalValues: OuterModalInterface) => {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timestamp = modalValues.dataFromInnerForm.innerModalValue.date_time;
        const payload = {
          therapist_id: this.therapistId,
          note: modalValues.dataFromInnerForm.innerModalValue.note,
          minutes_spent: modalValues.dataFromInnerForm.innerModalValue.minutes_spent,
          review_activity: modalValues.dataFromInnerForm.innerModalValue.review_activity,
          reminder_to_exercise: null,
          therapist_session_minutes: null,
        };
        await this.ajax
          .sendRtmTherapistSessions(patient.id, payload, timestamp,userTimezone)
          .toPromise()
          .then((res) => {
            const successMessage = timestamp
              ? 'Manual Time track has been recorded on ' +
                moment(timestamp)
                  .set({ hour: moment().hour(), minute: moment().minute(), second: moment().second() })
                  .format('DD/MM/YYYY HH:mm')
              : 'Manual Time track has been recorded';
            this.appActions.setMessageRTMModal(successMessage);
          })
          .catch((err) => {
            this.appActions.setMessageRTMModal(err || 'Error occurred. Please try again later');
            console.error('Error:', err);
          });
      },
      header: 'Add Manual Time Track',
    };
    this.appActions.openRTMModal(modalData);
  };

  showRTMMinutes = (patient: { id: any; userId: number }) => {
    const modalData: SHOWRTMModalData = {
      modalStyle: SHOW_RTM_MODAL_STYLE.WHITE,
      content: SHOW_RTM_MODAL_CONTENT.SHOW_RTM,
      patient,
      approveCallback: async (modalValues: OuterModalInterface) => {
        await this.ajax
          .getAllRtmReport({ month: String(moment().month() + 1), year: String(moment().year()) })
          .toPromise()
          .then((response) => {
            if (response?.data?.allData?.length && response?.data?.cumulativeData?.length) {
              const { allData, cumulativeData } = response.data;
              const transformedRows = util.transformRtm(allData, cumulativeData);
              modalValues.rows = transformedRows;
            }
          })
          .catch((err) => {
            console.error('Error fetching RTM Report:', err);
          });
      },
      header: 'RTM Patient Track Report',
    };
    this.appActions.showOpenRTMModal(modalData);
  };

  getActivityTooltipText = (activity: { duration: string; gamesDuration: any }) => {
    if (!activity.duration) {
      return '';
    }

    const header = `Total : ${this.getFormattedTimeForTooltip(activity.duration)}\n`;
    return reduce(
      activity.gamesDuration,
      (text: string, gameDuration) => {
        return (
          text + capitalize(`${gameDuration.gameName} : ${this.getFormattedTimeForTooltip(gameDuration.duration)}\n`)
        );
      },
      header
    );
  };

  getFormattedTimeForTooltip = (time: string) => {
    if (!startsWith(time, '00:')) {
      return time;
    }
    return time.substring(3);
  };

  showContactDetails = (contact: any) => {
    return `${contact.full_name}: ${contact.phone}`;
  };

 /* openLogModal = (patientId: any) => {
    this.isLogModalOpen = true;
    this.shownLogs[patientId] = true;
    this.selectedPatientId = patientId;

    const selectedPatient = this.patientListFiltered.find((patient) => patient.userId === patientId);

    const gameMap = new Map<string, any[]>(); 
    console.log("========selectedpatient========",selectedPatient); 
    console.log("==========currenttherapist========",this.therapistId);
    if (selectedPatient && selectedPatient.lastWeekActivity) {
      selectedPatient.lastWeekActivity.forEach((activity: { gamesDuration: any[] }) => {
        activity.gamesDuration.forEach(
          (game: { gameName: string; duration: any; gameSummary: any; sessionFeedback: { questions: any } }) => {
            if (!gameMap.has(game.gameName)) {
              gameMap.set(game.gameName, []);
            }
            gameMap.get(game?.gameName)?.push({
              duration: game?.duration,
              gameSummary: game?.gameSummary,
              sessionFeedback: game?.sessionFeedback?.questions,
            });
          }
        );
      });
    }

    this.patientLog = Array.from(gameMap.entries()).map(([gameName, sessions]) => {
      sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestSession = sessions[0];
      const remainingSessions = sessions.slice(1);
      console.log('patientLog: ,', this.patientLog);
      return {
        gameName,
        latestSession,
        remainingSessions,
        showMore: false,
      };
    });
  };*/

  openLogModal = (patientId: any) => {
    this.isLogModalOpen = true;
    this.shownLogs[patientId] = true;
    this.selectedPatientId = patientId;
    const selectedPatient = this.patientListFiltered.find(
      (patient) => patient.userId === patientId
    );  
    const gameMap = new Map<string, any[]>();  
    console.log("Selected Patient:", selectedPatient);
    console.log("Current Therapist ID:", this.therapistId); 
    const clearKey = `LAST_CLEAR_${this.therapistId}_${patientId}`;
    let deletedAt = null;    
    const clearDataRaw = localStorage.getItem(clearKey);
    if (clearDataRaw) {
      const clearData = JSON.parse(clearDataRaw);
      deletedAt = new Date(clearData.deletedAt).getTime();
    }
    if (selectedPatient && selectedPatient.lastWeekActivity) {
      selectedPatient.lastWeekActivity.forEach((activity: { gamesDuration: any[] }) => {  
        activity.gamesDuration.forEach((game: any) => {  
          let activityTime = null;
          if (game.start_time) {
            const utcFormatted = game.start_time.replace(' ', 'T') + 'Z';
            activityTime = new Date(utcFormatted).getTime();
          }
          
          // ✅ Skip only old summaries
          if (deletedAt && activityTime && activityTime <= deletedAt) {
            return;
          }
          

          // therapist filter
          const therapistIdFromGame = Number(game?.gameSummary?.therapist_id);
          if (therapistIdFromGame !== Number(this.therapistId)) {
           // return;
          }  
          // ✅ Clone summary to avoid mutating original object
          const filteredSummary = game?.gameSummary
            ? JSON.parse(JSON.stringify(game?.gameSummary))
            : null;
  
          // ✅ Remove checkpoints array
          if (filteredSummary?.CheckpointsArray) {
            delete filteredSummary.CheckpointsArray;
          }  
          if (!gameMap.has(game.gameName)) {
            gameMap.set(game.gameName, []);
          }  
          gameMap.get(game.gameName)?.push({
            duration: game?.duration,
            gameSummary: filteredSummary, // ✅ cleaned summary
            sessionFeedback: game?.sessionFeedback?.questions,
            date: game?.date || filteredSummary?.date
          });
  
        });
  
      });
    }
    this.patientLog = Array.from(gameMap.entries()).map(([gameName, sessions]) => {
      sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());  
      const latestSession = sessions[0];
      const remainingSessions = sessions.slice(1);  
      return {
        gameName,
        latestSession,
        remainingSessions,
        showMore: false,
      };
    });  
    console.log("Filtered patientLog:", this.patientLog);
  };
  

  objectKeys = Object.keys;

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getTotalDuration(games: any[]): string {
    let totalSeconds = 0;

    games.forEach((game) => {
      const latestSession = game.latestSession;
      if (latestSession && latestSession.duration) {
        const [hours, minutes, seconds] = latestSession.duration.split(':').map(Number);
        totalSeconds += hours * 3600 + minutes * 60 + seconds;
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  closeModal = () => {
    this.isLogModalOpen = false;
    this.selectedPatientId = '';
  };

  // async copyToClipboard() {
  //   try {
  //     if (!this.patientLog || !this.patientLog.length) {
  //       console.log('No game session logs available to copy.');
  //       return;
  //     }
  //     const formattedLogs = this.patientLog?.map((game) => {
  //       const gameName = `Game Name: ${game?.gameName[0].toUpperCase() + game?.gameName.slice(1)}`;
  //       const duration = `Duration: ${game?.latestSession?.duration || ''}`;
  //       let summary = '';
  //       if (game.latestSession?.gameSummary) {
  //         summary += `Total Squats: ${
  //           game.latestSession.gameSummary.totalSquats !== undefined &&
  //           game.latestSession.gameSummary.totalSquats !== null
  //             ? game.latestSession.gameSummary.totalSquats
  //             : ''
  //         }\n`;
  //         summary += `Squats Per Set: ${game.latestSession.gameSummary.squatsPerSet?.join(', ') || ''}\n`;
  //         summary += `Game Time (seconds): ${
  //           game.latestSession?.gameSummary?.gameTimeSeconds !== undefined &&
  //           game.latestSession.gameSummary.gameTimeSeconds !== null
  //             ? game.latestSession.gameSummary.gameTimeSeconds
  //             : ''
  //         }\n`;
  //       } else {
  //         summary += 'No game summary available\n';
  //       }

  //       let feedback = '';
  //       if (game.latestSession?.sessionFeedback?.questions?.length) {
  //         feedback += 'Session Feedback:\n';
  //         game.latestSession.sessionFeedback.questions.forEach((question: any) => {
  //           feedback += `${question.question}: ${question.answer || ''}\n`;
  //         });
  //       }
  //       // else {
  //       //   feedback += 'No session feedback available\n';
  //       // }
  //       return `${gameName}\n${duration}\n${summary}${feedback}`;
  //     });
  //     console.log("==formated log===",formattedLogs );
  //     const formattedLog = formattedLogs.join('\n|** Game Logs **|\n\n');
  //     await navigator.clipboard.writeText(formattedLog);
  //     this.isLogModalOpen = false;
  //     this.isCopiedToClipboard = true;
  //   } catch (e) {
  //     console.log('Failed to copy log to clipboard:', e);
  //   }
  // }

  // async copyToClipboard() {
  //   try {
  //     if (!this.patientLog || !this.patientLog.length) {
  //       console.log('No game session logs available to copy.');
  //       return;
  //     }
  
  //     const formattedLogs = this.patientLog.map((game) => {
  //       let formattedGame = '';
  
  //       // Dynamically handle top-level keys for each game
  //       Object.keys(game).forEach((key) => {
  //         const value = game[key];
  //         if (value !== null && value !== undefined && typeof value !== 'object') {
  //           formattedGame += `${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`; // Format key for readability
  //         }
  //       });
  
  //       // Handle latestSession if it exists
  //       if (game.latestSession) {
  //         formattedGame += `Latest Session:\n`;
  
  //         Object.keys(game.latestSession).forEach((key) => {
  //           const value = game.latestSession[key];
  //           if (value !== null && value !== undefined && typeof value !== 'object') {
  //             formattedGame += `  ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //           }
  //         });
  
  //         // Handle gameSummary within latestSession
  //         if (game.latestSession.gameSummary) {
  //           formattedGame += `  Game Summary:\n`;
  //           Object.keys(game.latestSession.gameSummary).forEach((key) => {
  //             const value = game.latestSession.gameSummary[key];
  //             if (value !== null && value !== undefined) {
  //               formattedGame += `    ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //             }
  //           });
  //         }
  
  //         // Handle sessionFeedback within latestSession
  //         if (game.latestSession.sessionFeedback?.questions?.length) {
  //           formattedGame += `  Session Feedback:\n`;
  //           game.latestSession.sessionFeedback.questions.forEach((question: any) => {
  //             if (question.answer !== null && question.answer !== undefined) {
  //               formattedGame += `    ${question.question}: ${question.answer}\n`;
  //             }
  //           });
  //         }
  //       }
  
  //       // Handle remainingSessions if they exist
  //       if (game.remainingSessions?.length) {
  //         formattedGame += `Remaining Sessions:\n`;
  //         game.remainingSessions.forEach((session, index) => {
  //           formattedGame += `  Session ${index + 1}:\n`;
  //           Object.keys(session).forEach((key) => {
  //             const value = session[key];
  //             if (value !== null && value !== undefined && typeof value !== 'object') {
  //               formattedGame += `    ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //             }
  //           });
  
  //           // Handle gameSummary within each remaining session
  //           if (session.gameSummary) {
  //             formattedGame += `    Game Summary:\n`;
  //             Object.keys(session.gameSummary).forEach((key) => {
  //               const value = session.gameSummary[key];
  //               if (value !== null && value !== undefined) {
  //                 formattedGame += `      ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //               }
  //             });
  //           }
  //         });
  //       }
  
  //       return formattedGame;
  //     });
  
  //     const formattedLog = formattedLogs.join('\n|** Game Logs **|\n\n');
  //     console.log('==Formatted Log==', formattedLog);
  
  //     await navigator.clipboard.writeText(formattedLog);
  //     this.isLogModalOpen = false;
  //     this.isCopiedToClipboard = true;
  
  //     console.log('Logs successfully copied to clipboard.');
  //   } catch (e) {
  //     console.error('Failed to copy log to clipboard:', e.message || e);
  //   }
  // }
  
  // async copyToClipboard() {
  //   try {
  //     if (!this.patientLog || !this.patientLog.length) {
  //       console.log('No game session logs available to copy.');
  //       return;
  //     }
  
  //     const formattedLogs = this.patientLog.map((game) => {
  //       let formattedGame = '';
  
  //       // Dynamically handle top-level keys for each game
  //       Object.keys(game).forEach((key) => {
  //         const value = game[key];
  //         if (value !== null && value !== undefined && typeof value !== 'object') {
  //           formattedGame += `${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`; // Format key for readability
  //         }
  //       });
  
  //       // Handle latestSession if it exists
  //       if (game.latestSession) {
  //         formattedGame += `Latest Session:\n`;
  
  //         Object.keys(game.latestSession).forEach((key) => {
  //           const value = game.latestSession[key];
  //           if (value !== null && value !== undefined && typeof value !== 'object') {
  //             formattedGame += `  ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //           }
  //         });
  
  //         // Handle gameSummary within latestSession
  //         if (game.latestSession.gameSummary) {
  //           formattedGame += `  Game Summary:\n`;
  //           Object.keys(game.latestSession.gameSummary).forEach((key) => {
  //             const value = game.latestSession.gameSummary[key];
  //             if (value !== null && value !== undefined) {
  //               formattedGame += `    ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //             }
  //           });
  //         }
  
  //         // Handle sessionFeedback within latestSession
  //         if (game.latestSession.sessionFeedback?.questions?.length) {
  //           formattedGame += `  Session Feedback:\n`;
  //           game.latestSession.sessionFeedback.questions.forEach((question: any) => {
  //             if (question.answer !== null && question.answer !== undefined) {
  //               formattedGame += `    ${question.question}: ${question.answer}\n`;
  //             }
  //           });
  //         }
  //       }
  
  //       // Handle remainingSessions if they exist
  //       if (game.remainingSessions?.length) {
  //         formattedGame += `Remaining Sessions:\n`;
  //         game.remainingSessions.forEach((session, index) => {
  //           formattedGame += `  Session ${index + 1}:\n`;
  //           Object.keys(session).forEach((key) => {
  //             const value = session[key];
  //             if (value !== null && value !== undefined && typeof value !== 'object') {
  //               formattedGame += `    ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //             }
  //           });
  
  //           // Handle gameSummary within each remaining session
  //           if (session.gameSummary) {
  //             formattedGame += `    Game Summary:\n`;
  //             Object.keys(session.gameSummary).forEach((key) => {
  //               const value = session.gameSummary[key];
  //               if (value !== null && value !== undefined) {
  //                 formattedGame += `      ${key.replace(/([A-Z])/g, ' $1')}: ${value}\n`;
  //               }
  //             });
  //           }
  //         });
  //       }
  
  //       return formattedGame;
  //     });
  
  //     const formattedLog = formattedLogs.join('\n|** Game Logs **|\n\n');
  //     console.log('==Formatted Log==', formattedLog);
  
  //     await navigator.clipboard.writeText(formattedLog);
  //     this.isLogModalOpen = false;
  //     this.isCopiedToClipboard = true;
  
  //     console.log('Logs successfully copied to clipboard.');
  //   } catch (e) {
  //     console.error('Failed to copy log to clipboard:', e.message || e);
  //   }
  // }
  
  // async copyToClipboard() {
  //   try {
  //     if (!this.patientLog || !this.patientLog.length) {
  //       return;
  //     }
  
  //     const toTitleCase = (str: string): string => {
  //       return str
  //         .replace(/([A-Z])/g, ' $1') 
  //         .toLowerCase()
  //         .replace(/\b\w/g, (char) => char.toUpperCase());
  //     };
  
  //     const formattedLogs = this.patientLog.map((game) => {
  //       let formattedGame = '';

  //       Object.keys(game)
  //         .filter((key) => key !== 'showMore') 
  //         .forEach((key) => {
  //           const value = game[key];
  //           if (value !== null && value !== undefined && typeof value !== 'object') {
  //             formattedGame += `${toTitleCase(key)}: ${value}\n`;
  //           }
  //         });
  
  //       if (game.latestSession) {
  //         formattedGame += `Latest Session:\n`;
  
  //         Object.keys(game.latestSession)
  //           .filter((key) => key !== 'showMore')
  //           .forEach((key) => {
  //             const value = game.latestSession[key];
  //             if (value !== null && value !== undefined && typeof value !== 'object') {
  //               formattedGame += `  ${toTitleCase(key)}: ${value}\n`;
  //             }
  //           });

  //         if (game.latestSession.gameSummary) {
  //           formattedGame += `  Game Summary:\n`;
  //           Object.keys(game.latestSession.gameSummary)
  //             .filter((key) => key !== 'showMore')
  //             .forEach((key) => {
  //               const value = game.latestSession.gameSummary[key];
  //               if (value !== null && value !== undefined) {
  //                 formattedGame += `    ${toTitleCase(key)}: ${value}\n`;
  //               }
  //             });
  //         }
  //       }
  
  //       if (game.remainingSessions?.length) {
  //         formattedGame += `Remaining Sessions:\n`;
  //         game.remainingSessions.forEach((session, index) => {
  //           formattedGame += `  Session ${index + 1}:\n`;
  //           Object.keys(session)
  //             .filter((key) => key !== 'showMore') 
  //             .forEach((key) => {
  //               const value = session[key];
  //               if (value !== null && value !== undefined && typeof value !== 'object') {
  //                 formattedGame += `    ${toTitleCase(key)}: ${value}\n`;
  //               }
  //             });

  //           if (session.gameSummary) {
  //             formattedGame += `    Game Summary:\n`;
  //             Object.keys(session.gameSummary)
  //               .filter((key) => key !== 'showMore') 
  //               .forEach((key) => {
  //                 const value = session.gameSummary[key];
  //                 if (value !== null && value !== undefined) {
  //                   formattedGame += `      ${toTitleCase(key)}: ${value}\n`;
  //                 }
  //               });
  //           }
  //         });
  //       }
  
  //       return formattedGame;
  //     });
  
  //     const formattedLog = formattedLogs.join('\n|** Game Logs **|\n\n');
  //     console.log('==Formatted Log==', formattedLog);
  
  //     await navigator.clipboard.writeText(formattedLog);
  //     this.isLogModalOpen = false;
  //     this.isCopiedToClipboard = true;
  
  //     console.log('Logs successfully copied to clipboard.');
  //   } catch (e) {
  //     console.error('Failed to copy log to clipboard:', e.message || e);
  //   }
  // }

  /*async copyToClipboard() {
    try {
      if (!this.patientLog || !this.patientLog.length) {
        return;
      }
  
      const toTitleCase = (str: string): string => {
        return str
          .replace(/([A-Z])/g, ' $1') 
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());
      };
  
      const formattedLogs = this.patientLog.map((game) => {
        let formattedGame = '';
  
        Object.keys(game)
          .filter((key) => key !== 'showMore') 
          .forEach((key) => {
            const value = game[key];
            if (value !== null && value !== undefined && typeof value !== 'object') {
              formattedGame += `${toTitleCase(key)}: ${value}\n`;
            }
          });
  
        if (game.latestSession) {
          //formattedGame += `Latest Session:\n`;
          formattedGame += `\n`;
          Object.keys(game.latestSession)
            .filter((key) => key !== 'showMore')
            .forEach((key) => {
              const value = game.latestSession[key];
              if (value !== null && value !== undefined && typeof value !== 'object') {
                formattedGame += `  ${toTitleCase(key)}: ${value}\n`;
              }
            });
  
          if (
            game.latestSession.gameSummary &&
            Object.keys(game.latestSession.gameSummary).some(
              (key) =>
                game.latestSession.gameSummary[key] !== null &&
                game.latestSession.gameSummary[key] !== undefined
            )
          ) {
            formattedGame += `  Game Summary:\n`;
            Object.keys(game.latestSession.gameSummary)
              .filter((key) => key !== 'showMore')
              .forEach((key) => {
                const value = game.latestSession.gameSummary[key];
                if (value !== null && value !== undefined) {
                  formattedGame += `    ${toTitleCase(key)}: ${value}\n`;
                }
              });
          }
        }
  
        if (game.remainingSessions?.length) {
          formattedGame += `Remaining Sessions:\n`;
          game.remainingSessions.forEach((session, index) => {
            formattedGame += `  Session ${index + 1}:\n`;
  
            Object.keys(session)
              .filter((key) => key !== 'showMore') 
              .forEach((key) => {
                const value = session[key];
                if (value !== null && value !== undefined && typeof value !== 'object') {
                  formattedGame += `    ${toTitleCase(key)}: ${value}\n`;
                }
              });
  
            if (
              session.gameSummary &&
              Object.keys(session.gameSummary).some(
                (key) =>
                  session.gameSummary[key] !== null &&
                  session.gameSummary[key] !== undefined
              )
            ) {
              formattedGame += `    Game Summary:\n`;
              Object.keys(session.gameSummary)
                .filter((key) => key !== 'showMore')
                .forEach((key) => {
                  const value = session.gameSummary[key];
                  if (value !== null && value !== undefined) {
                    formattedGame += `      ${toTitleCase(key)}: ${value}\n`;
                  }
                });
            }
          });
        }
  
        return formattedGame;
      });
  
     // const formattedLog = formattedLogs.join('\n|** Game Logs **|\n\n');
      const formattedLog = formattedLogs.join('\n\n');
      console.log('==Formatted Log==', formattedLog);
  
      await navigator.clipboard.writeText(formattedLog);
      this.isLogModalOpen = false;
      this.isCopiedToClipboard = true;
  
      console.log('Logs successfully copied to clipboard.');
    } catch (e) {
      console.error('Failed to copy log to clipboard:', e.message || e);
    }
  }*/

    async copyToClipboard() {
      try {
        if (!this.patientLog || !this.patientLog.length) {
          return;
        }
    
        const toTitleCase = (str: string): string => {
          return str
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .replace(/^game\s/i, ''); // ✅ Remove "Game " prefix
        };
    
        const formatValue = (key: string, value: any) => {

          // Only format real date fields
          if (
            typeof value === 'string' &&
            ['date', 'createdAt', 'updatedAt', 'sessionDate'].includes(key)
          ) {
            return new Date(value).toLocaleString();
          }
        
          return value;
        };
        
    
        const formattedLogs = this.patientLog.map((game) => {
          let formattedGame = '';
    
          // Game Level Data
          Object.keys(game)
            .filter((key) => key !== 'showMore' && key !== 'latestSession')
            .forEach((key) => {
              const value = game[key];
              if (value !== null && value !== undefined && typeof value !== 'object') {
                formattedGame += `${toTitleCase(key)}: ${formatValue(key, value)}\n`;
              }
            });
    
          // ✅ Latest Session (WITHOUT printing "Latest Session:" row)
          if (game.latestSession) {
            Object.keys(game.latestSession)
              .filter((key) => key !== 'showMore' && key !== 'gameSummary')
              .forEach((key) => {
                const value = game.latestSession[key];
                if (value !== null && value !== undefined && typeof value !== 'object') {
                  formattedGame += `${toTitleCase(key)}: ${formatValue(key, value)}\n`;
                }
              });
    
            if (
              game.latestSession.gameSummary &&
              Object.keys(game.latestSession.gameSummary).some(
                (key) =>
                  game.latestSession.gameSummary[key] !== null &&
                  game.latestSession.gameSummary[key] !== undefined
              )
            ) {
              Object.keys(game.latestSession.gameSummary)
                .filter((key) => key !== 'showMore')
                .forEach((key) => {
                  const value = game.latestSession.gameSummary[key];
                  if (value !== null && value !== undefined) {
                    formattedGame += `${toTitleCase(key)}: ${formatValue(key, value)}\n`;
                  }
                });
            }
          }
    
          // Remaining Sessions
          if (game.remainingSessions?.length) {
            game.remainingSessions.forEach((session) => {
              Object.keys(session)
                .filter((key) => key !== 'showMore' && key !== 'gameSummary')
                .forEach((key) => {
                  const value = session[key];
                  if (value !== null && value !== undefined && typeof value !== 'object') {
                    formattedGame += `${toTitleCase(key)}: ${formatValue(key, value)}\n`;
                  }
                });
    
              if (
                session.gameSummary &&
                Object.keys(session.gameSummary).some(
                  (key) =>
                    session.gameSummary[key] !== null &&
                    session.gameSummary[key] !== undefined
                )
              ) {
                Object.keys(session.gameSummary)
                  .filter((key) => key !== 'showMore')
                  .forEach((key) => {
                    const value = session.gameSummary[key];
                    if (value !== null && value !== undefined) {
                      formattedGame += `${toTitleCase(key)}: ${formatValue(key, value)}\n`;
                    }
                  });
              }
            });
          }
    
          return formattedGame;
        });
    
        // ✅ Removed |** Game Logs **|
        const formattedLog = formattedLogs.join('\n\n');
    
        console.log('==Formatted Log==', formattedLog);
    
        await navigator.clipboard.writeText(formattedLog);
        this.isLogModalOpen = false;
        this.isCopiedToClipboard = true;
    
        console.log('Logs successfully copied to clipboard.');
      } catch (e) {
        console.error('Failed to copy log to clipboard:', e.message || e);
      }
    }
    
  closeEraseLogModal = () => {
    this.isCopiedToClipboard = false;
  };

 /* deletePatientLog = () => {
    const patient = this.patientListFiltered.find((patient: any) => patient.userId == this.selectedPatientId);
    patient.log = '';
    for (let game of this.gamesNames) {
      console.log("====before remove===",this.selectedPatientId + '_' + game + PATIENT_LOG_STORAGE_KEY);
      localStorage.removeItem(this.selectedPatientId + '_' + game + PATIENT_LOG_STORAGE_KEY);
    }
    this.closeEraseLogModal();
  };*/

  deletePatientLog = () => {
    //const now = new Date().toISOString();  
    const utcString = new Date().toISOString();
    const clearKey = `LAST_CLEAR_${this.therapistId}_${this.selectedPatientId}`;  
    // ✅ Save erase info properly as JSON
    localStorage.setItem(clearKey, JSON.stringify({
      therapistId: this.therapistId,
      patientId: this.selectedPatientId,
      deletedAt: utcString
    }));  
    const patient = this.patientListFiltered.find(
      (patient: any) => patient.userId == this.selectedPatientId
    );  
    if (patient) {
      patient.log = '';
    }  
    for (let game of this.gamesNames) {
      localStorage.removeItem(
        this.selectedPatientId + '_' + game + PATIENT_LOG_STORAGE_KEY
      );
    }  
     // ✅ Re-fetch & rebuild patient list
    this.getPatientActivities();
    this.closeEraseLogModal();
  };
  

  prevGame() {
    if (this.selectedGameIndex > 0) {
      this.selectedGameIndex--;
      this.selectedGame = this.patientLog[this.selectedGameIndex];
    }
  }

  nextGame() {
    if (this.selectedGameIndex < this.patientLog.length - 1) {
      this.selectedGameIndex++;
      this.selectedGame = this.patientLog[this.selectedGameIndex];
    }
  }

  // getFeedbackTooltipText = (feedbacks:any) => {
  //   console.log("feedbacks ", feedbacks);
  //   const quesfeedbacks = feedbacks?.lastWeekActivity
  //     .map((activity: { gamesDuration: { sessionFeedback: any }[] }) => {
  //       const feedback = activity.gamesDuration?.find((gameDuration) => gameDuration.sessionFeedback)?.sessionFeedback;
  //       if (feedback && feedback.questions) {
  //         return feedback.questions.map((q) => `* ${q.question}:  ${q.answer || 'No answer provided'}`).join('\n');
  //       }
  //       return '';
  //     })
  //     .filter((text) => text)
  //     .join('\n');
  //   return quesfeedbacks;
  // };

  getFeedbackTooltipText = (feedbacks: { lastWeekActivity: any[] }) => {
    const convertToSeconds = (timeStr: {
      split: (arg0: string) => {
        (): any;
        new (): any;
        map: { (arg0: NumberConstructor): [any, any, any]; new (): any };
      };
    }) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
    };
    const convertToTimeFormat = (totalSeconds: number) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
        2,
        '0'
      )}`;
    };
    const options = [
      { value: 'Very Poor', label: '😡', tooltip: 'Angry' },
      { value: 'Unsatisfied', label: '🙁', tooltip: 'Slightly Frowning' },
      { value: 'Neutral', label: '😐', tooltip: 'Neutral' },
      { value: 'Somewhat Satisfied', label: '😊', tooltip: 'Smiling with Eyes' },
      { value: 'Satisfied', label: '😁', tooltip: 'Beaming with Smiling Eyes' },
    ];
    let totalTimeInSeconds = 0;
    const quesfeedbacks = feedbacks?.lastWeekActivity
      .map((activity: { duration: any; gamesDuration: any[] }) => {
        if (activity.duration) {
          totalTimeInSeconds += convertToSeconds(activity.duration);
        }
        const gameFeedbacks = activity.gamesDuration
          ?.map((gameDuration: { sessionFeedback: any; duration: any; gameName: string }) => {
            const feedback = gameDuration.sessionFeedback;
            const gameDurationText = gameDuration.duration ? ` (${gameDuration.duration})` : '';
            if (feedback && feedback.questions) {
              const feedbackText = feedback.questions
                .map((q: { question: any; answer: string }) => {
                  return `* ${q.question}: ${
                    options?.find((o) => o?.value == q.answer)?.label || 'No answer provided'
                  }`;
                })
                .join('\n');

              return `\n* ${gameDuration.gameName.toUpperCase()}${gameDurationText}\n\n${feedbackText}`;
            }
            return '';
          })
          .filter((text: any) => text)
          .join('\n');

        if (gameFeedbacks) {
          return `${gameFeedbacks}`;
        }
        return '';
      })
      .filter((text: any) => text)
      .join('\n');

    const totalDurationFormatted = convertToTimeFormat(totalTimeInSeconds);
    return totalTimeInSeconds > 0 ? `* Total Time: ${totalDurationFormatted}\n${quesfeedbacks}` : quesfeedbacks;
  };

  onClickNew() {
    this.setCurrentView(consts.mode.create);
    this.isPatientViewEnable = true;
    this.isPatientData = true;
  }

  setCurrentView(view) {
    this.currentView = view;
  }

  isViewMode() {
    return this.currentView === consts.mode.view;
  }

  getCurrentTab() {
    return this.tabs[this.currentTabIndex];
  }

  loadInstitutes(): void {
    this.ajax.getAllInstitutes().subscribe((data) => {
      this.allInstitutes = data;
      this.parsedInstitutes = this.parseInstitutes(data);
    });
  }

  loadDepartments(): void {
    this.ajax.getAllDepartments().subscribe((data) => {
      this.allDepartments = data;
      this.parsedDepartments = this.parseDepartments(data);
    });
  }

  parseInstitutes(data: any[]): IListItem[] {
    const uniqueInstitutesMap = new Map<number, IListItem>();
    data.forEach((institute) => {
      if (!uniqueInstitutesMap.has(institute.id)) {
        uniqueInstitutesMap.set(institute.id, {
          id: institute.id,
          name: institute.institute_name,
        });
      }
    });
    return Array.from(uniqueInstitutesMap.values());
  }

  parseDepartments(data: any[]): IListItem[] {
    return (
      data?.map((department) => ({
        id: department?.id,
        name: department?.name,
        institute_id: department?.institute_id,
      })) || []
    );
  }

  onReturnFromAddEdit() {
    this.isPatientViewEnable = false;
    this.getPatientActivities();
    // const currentUrl = this.router.url;
    // this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
    //   this.router.navigate([currentUrl]);
    // });
  }
}
