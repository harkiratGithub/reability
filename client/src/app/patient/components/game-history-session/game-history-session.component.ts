import { IGame, IPatientLog } from 'src/types';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { setAudioStreamsToComponent } from '../../../common/utils';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { PeersStatus, PATIENT_LOG_STORAGE_KEY } from '../../../../constants';
import { AuthenticationService } from 'src/app/common/services/authentication.service';
import { getLast7DaysFrom, addTwoDurationTimeTogether, getSecondsFromTimeString } from '../../../common/date-util';
import { reduce, chain, filter, groupBy, capitalize, startsWith, head } from 'lodash';
import { Observable } from 'rxjs/internal/Observable';
import { select, NgRedux } from '@angular-redux/store';
import { communicationUtil, MESSAGES } from 'src/app/common/services/communication_util.service';
import { Subscription } from 'rxjs';
import { AppActions } from 'src/app/app.actions';

@Component({
  selector: 'app-game-history-session',
  templateUrl: './game-history-session.component.html',
  styleUrls: ['./game-history-session.component.scss'],
})
export class GameHistorySessionComponent implements OnInit {
  patient;
  gameId;  
  currentDay = 0;
  patientList = [];
  intervalId = undefined;
  patientListFiltered = [];
  gamesNames: string[] = [];
  lastWeekActivityArray = [];
  patientListGrouped: any = [];
  patientLog: IPatientLog[] = [];
  peersStatusConst = PeersStatus;
  allGames: IGame[];
  minDurationToShowOnTooltip = 30;
  isCopiedToClipboard: boolean = false;
  isLogModalOpen: boolean = false;

  constructor(
    private ajax: AjaxService,
    private authenticationService: AuthenticationService,
    public dialog: MatDialog,
    public appActions: AppActions,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  ngOnInit() {
    this.gameId = this.data.gameId;
    this.patient = this.authenticationService.currentUserValue;
    this.onWeeklyActivityClicked();
    this.ajax.getAllEndGames().subscribe((allGames) => {
      this.allGames = allGames;
      this.gamesNames = this.allGames?.map((game) => game?.name);
      this.allGames?.map((game) => this.getGameIcon(game));
    });
    this.getPatientActivities();
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  getPatientActivities = () => {
    this.ajax
      .getPatientEndActivities(this.lastWeekActivityArray[0], this.lastWeekActivityArray[6])
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
          this.openLogModal(this.patient?.peerId, this.gameId );
        });
      });
  };

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  setFilteredData = (filteredData: any[]) => (this.patientListFiltered = filteredData);

  checkIfSettingModalOpened = (patient: { id: any }) => {
    if (this.patientList.length > 0) {
      const patientFound = this.patientList.find((currPatient) => currPatient.id === patient.id);
      return patientFound ? patientFound.settingMenuOpen || false : false;
    }
    return false;
  };

  buildPatientActivities = (patientList: any) => {
    const patients = chain(patientList)
      .groupBy('id')
      .mapValues((items) => ({
        id: items[0].id,
        fullName: items[0].full_name,
        userName: items[0].user_name,
        status: items[0].status,
        lastLogin: items[0].logged_in_at,
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

            if (!this?.allGames || this?.allGames?.length === 0) {
              // console.error('No games available in this allGames');
              return acc;
            }

            const game = this.allGames.find((game) => game.id === a.game_id);
            if (!game) {
              // console.warn(`Game not found for game_id: ${a.game_id}`);
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
      const validGameIds = games?.map((game: { id: any }) => game?.id);
      patient.allGames = this.allGames?.map((game) => {
        const isValid = validGameIds?.includes(game?.id);
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

  // openLogModal = (patientId: any) => {
  //   this.isLogModalOpen = true;
  //   const selectedPatient = this.patientListFiltered.find((patient) => patient.userId == patientId);
  //   const gameMap = new Map<string, any[]>();
  //   if (selectedPatient && selectedPatient.lastWeekActivity) {
  //     selectedPatient.lastWeekActivity.forEach((activity: { gamesDuration: any[] }) => {
  //       activity.gamesDuration.forEach(
  //         (game: { gameName: string; duration: any; gameSummary: any; sessionFeedback: { questions: any } }) => {
  //           if (!gameMap.has(game.gameName)) {
  //             gameMap.set(game.gameName, []);
  //           }
  //           gameMap.get(game?.gameName)?.push({
  //             duration: game?.duration,
  //             gameSummary: game?.gameSummary,
  //             sessionFeedback: game?.sessionFeedback?.questions,
  //           });
  //         }
  //       );
  //     });
  //   }
  //   this.patientLog = Array.from(gameMap.entries()).map(([gameName, sessions]) => {
  //     sessions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  //     const latestSession = sessions[0];
  //     const remainingSessions = sessions.slice(1);
  //     return {
  //       gameName,
  //       latestSession,
  //       remainingSessions,
  //       showMore: false,
  //     };
  //   });
  // };

  openLogModal = (patientId: any, gameId: string) => {
    this.isLogModalOpen = true;
    const selectedPatient = this.patientListFiltered.find((patient) => patient.userId == patientId);
    const gameMap = new Map<string, any[]>();
    const matchingGame = this.allGames?.find((game) => game?.id === parseInt(gameId));
    if (selectedPatient && selectedPatient.lastWeekActivity && matchingGame) {
      selectedPatient.lastWeekActivity.forEach((activity: { gamesDuration: any[] }) => {
        activity.gamesDuration.forEach(
          (game: { gameName: string; duration: any; gameSummary: any; sessionFeedback: { questions: any } }) => {
            if (game?.gameName === matchingGame?.name) {
              if (!gameMap.has(game?.gameName)) {
                gameMap.set(game?.gameName, []);
              }
              gameMap.get(game.gameName)?.push({
                duration: game?.duration,
                gameSummary: game?.gameSummary,
                sessionFeedback: game?.sessionFeedback?.questions,
              });
            }
          }
        );
      });
    }
  
    // Transform the gameMap into the expected structure
    this.patientLog = Array.from(gameMap.entries()).map(([gameName, sessions]) => {
      sessions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestSession = sessions[0];
      const remainingSessions = sessions.slice(1);
      return {
        gameName,
        latestSession,
        remainingSessions,
        showMore: false,
      };
    });
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
    this.dialog.closeAll();
    this.isLogModalOpen = false;
    
  };

  closeEraseLogModal = () => {
    this.isCopiedToClipboard = false;
  };

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

  async copyToClipboard() {
    try {
      if (!this.patientLog || !this.patientLog.length) {
        console.log('No game session logs available to copy.');
        return;
      }

      const latestGame = this.patientLog[this.patientLog.length - 1];

      const gameName = `Game Name: ${latestGame.gameName}`;
      const duration = `Duration: ${latestGame.latestSession?.duration || 'N/A'}`;

      let summary = '';
      if (latestGame.latestSession?.gameSummary) {
        summary += `Total Squats: ${
          latestGame.latestSession.gameSummary.totalSquats !== undefined
            ? latestGame.latestSession.gameSummary.totalSquats
            : 'N/A'
        }\n`;
        summary += `Squats Per Set: ${latestGame.latestSession.gameSummary.squatsPerSet?.join(', ') || 'N/A'}\n`;
        summary += `Game Time (seconds): ${
          latestGame.latestSession.gameSummary.gameTimeSeconds !== null
            ? latestGame.latestSession.gameSummary.gameTimeSeconds
            : 'N/A'
        }\n`;
      } else {
        summary += 'No game summary available\n';
      }

      let feedback = '';
      if (latestGame.latestSession?.sessionFeedback?.questions?.length) {
        feedback += 'Session Feedback:\n';
        latestGame.latestSession.sessionFeedback.questions.forEach((question: any) => {
          feedback += `${question.question}: ${question.answer || 'N/A'}\n`;
        });
      } else {
        feedback += 'No session feedback available\n';
      }

      const formattedLog = `${gameName}\n${duration}\n${summary}\n${feedback}`;

      await navigator.clipboard.writeText(formattedLog);

      this.isLogModalOpen = false;
      this.isCopiedToClipboard = true;
    } catch (e) {
      console.log('Failed to copy log to clipboard:', e);
    }
  }
}
