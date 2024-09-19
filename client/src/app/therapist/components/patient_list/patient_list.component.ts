import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { reduce, chain, filter, groupBy, capitalize, startsWith, head } from 'lodash';
import moment from 'moment';

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
  patientLog: string[] = [];
  selectedPatientId: string = '';
  filterFunc: (data: [], text: string) => void;
  peersStatusConst = PeersStatus;
  headerMessage = 'For game settings, click on one of the icons:';
  allGames: IGame[];
  minDurationToShowOnTooltip = 30;
  shownLogs = {};
  isCopiedToClipboard: boolean = false;
  isLogModalOpen: boolean = false;

  constructor(
    private ajax: AjaxService,
    private authenticationService: AuthenticationService,
    public dialog: MatDialog,
    public appActions: AppActions,
    private recaptchaV3Service: ReCaptchaV3Service
  ) {}
  ngOnInit() {
    this.therapistId = this.authenticationService.currentUserValue.id;
    this.filterFunc = this.filterByName;
    this.onWeeklyActivityClicked();
    const audioContainerElement = document.getElementById('audio-container');
    setAudioStreamsToComponent(audioContainerElement, this.audioStreams);
    this.ajax.getAllGames().subscribe((allGames) => {
      this.allGames = allGames;
      this.gamesNames = this.allGames.map((game) => game.name);
      this.allGames.map((game) => this.getGameIcon(game));
    });
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  toggleGame(game, patient) {
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
          patients.map((patient) => {
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

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  setFilteredData = (filteredData) => (this.patientListFiltered = filteredData);

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

  checkIfSettingModalOpened = (patient) => {
    if (this.patientList.length > 0) {
      const patientFound = this.patientList.find((currPatient) => currPatient.id === patient.id);
      return patientFound ? patientFound.settingMenuOpen || false : false;
    }
    return false;
  };

  buildPatientActivities = (patientList) => {
    const patients = chain(patientList)
      .groupBy('id')
      .mapValues((items) => ({
        id: items[0].id,
        fullName: items[0].full_name,
        userName: items[0].user_name,
        status: items[0].status,
        lastLogin: items[0].logged_in_at,
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
            if (!a.duration) {
              return acc;
            }

            acc.duration = addTwoDurationTimeTogether(acc.duration, a.duration);
            acc.withTherapistSession = (a && a.therapist_session_id) || acc.withTherapistSession;

            const seconds = getSecondsFromTimeString(a.duration);
            if (seconds < this.minDurationToShowOnTooltip) {
              return acc;
            }

            if (!this.allGames || this.allGames.length === 0) {
              console.error('No games available in this.allGames');
              return acc;
            }

            const game = this.allGames.find((game) => game.id === a.game_id);
            if (!game) {
              console.warn(`Game not found for game_id: ${a.game_id}`);
              return acc;
            }
            const gameSummary = a.game_summary;
            const sessionFeedback = a.session_feedback;
            console.log(
              `Game: ${game.name}, Duration: ${a.duration}, Summary: ${JSON.stringify(
                gameSummary
              )} and FeedBack:: ${JSON.stringify(sessionFeedback)}`
            );
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
  };

  getPeerStatusColor = (status) => {
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
  getGameIcon = (game) => {
    const currGame = game;
    currGame.path = `/assets/game-icons-patient-list/${game.name}.png`;
    currGame.url = this.getUrlGame(game.url);
  };

  getUrlGame(url) {
    return url + 'index.html';
  }

  getPatientRecentGameActivity = (patient) => {
    this.ajax.getValidGames(patient.id).subscribe((games) => {
      patient.games = games;
      const validGameIds = games.map((game) => game.id);
      patient.allGames = this.allGames.map((game) => {
        const isValid = validGameIds.includes(game.id);
        return { ...game, isValid };
      });
      patient.gameIds = [];
      patient.lastWeekActivity.map((activity) => {
        if (activity.game_id && !patient.gameIds.find((game) => game.id === activity.game_id)) {
          patient.gameIds.push({
            id: activity.game_id,
          });
        }
      });
      // icon & which games have configorator need to come from server
      // patient.games = patient.games.filter(game => game.name === 'studio');
      patient.games.map((game) => this.getGameIcon(game));
      // when more games filter be availble sort by activity (game, index) => game.id === patient.gameIds[index]
    });
  };

  togglePatientSettingMenu = (patient) => {
    patient.settingMenuOpen = !patient.settingMenuOpen;
  };

  openGameConfiguration = (game, patient) => {
    const dialogRef = this.dialog.open(ConfiguratorModalComponent, {
      data: {
        game,
        patient,
      },
    });
  };

  sendFastLoginLink = (patient) => {
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

  getActivityTooltipText = (activity) => {
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

  openLogModal = (patientId: any) => {
    this.isLogModalOpen = true;
    this.shownLogs[patientId] = true;
    this.selectedPatientId = patientId;
    const selectedPatient = this.patientListFiltered.find((patient) => patient.userId == patientId);

    const gameSummaryData: any[] = [];
    const gameNameToLatestGame: { [key: string]: any } = {};

    // Iterate over the lastWeekActivity array
    selectedPatient.lastWeekActivity.forEach((activity: any) => {
      // Iterate over the gamesDuration array inside each activity
      activity.gamesDuration.forEach((game: any) => {
        const gameKey = game.gameName;

        // Always take the latest occurrence of the game (the last entry in this case)
        gameNameToLatestGame[gameKey] = game;
      });
    });

    // Convert the object into an array of games
    gameSummaryData.push(...Object.values(gameNameToLatestGame));
    selectedPatient.gameSummaryData = gameSummaryData;

    this.patientLog = selectedPatient.gameSummaryData;
  };

  objectKeys = Object.keys;

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getTotalDuration(games: any[]): string {
    let totalSeconds = 0;

    games.forEach((game) => {
      const duration = game.duration || '00:00:00';
      const [hours, minutes, seconds] = duration.split(':').map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
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

  async copyToClipboard() {
    try {
      const formattedLogs = this.patientLog
        .map((game: any) => {
          const gameName = `Game Name: ${game.gameName}`;
          const duration = `Duration: ${game.duration || 'N/A'}`;

          let summary = '';
          if (game.gameSummary) {
            summary += `Total Squats: ${
              game.gameSummary.totalSquats !== undefined ? game.gameSummary.totalSquats : 'N/A'
            }\n`;
            summary += `Squats Per Set: ${game.gameSummary.squatsPerSet?.join(', ') || 'N/A'}\n`;
            summary += `Game Time (seconds): ${
              game.gameSummary.gameTimeSeconds !== null ? game.gameSummary.gameTimeSeconds : 'N/A'
            }\n`;
          } else {
            summary += 'No game summary available\n';
          }

          let feedback = '';
          if (game.sessionFeedback?.questions?.length) {
            feedback += 'Session Feedback:\n';
            game.sessionFeedback.questions.forEach((question: any) => {
              feedback += `${question.question}: ${question.answer || 'N/A'}\n`;
            });
          } else {
            feedback += 'No session feedback available\n';
          }

          return `${gameName}\n${duration}\n${summary}\n${feedback}`;
        })
        .join('\n-------------------\n'); 

      await navigator.clipboard.writeText(formattedLogs);

      this.isLogModalOpen = false;
      this.isCopiedToClipboard = true;
    } catch (e) {
      console.log(e);
    }
  }

  closeEraseLogModal = () => {
    this.isCopiedToClipboard = false;
  };

  deletePatientLog = () => {
    const patient = this.patientListFiltered.find((patient: any) => patient.userId == this.selectedPatientId);
    patient.log = '';
    for (let game of this.gamesNames) {
      localStorage.removeItem(this.selectedPatientId + '_' + game + PATIENT_LOG_STORAGE_KEY);
    }
    this.closeEraseLogModal();
  };
}
