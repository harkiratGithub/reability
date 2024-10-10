import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { communicationUtil, MESSAGES } from '../../../common/services/communication_util.service';
import { WebCamSkeletonService } from '../../../common/services/posenet_camera.service';
import { PatientWebRtcService } from '../../services/patient_web_rtc.service';
import { select, NgRedux } from '@angular-redux/store';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs';
import { AuthenticationService } from 'src/app/common/services/authentication.service';
import { isEmpty, debounce, isBoolean, map } from 'lodash';
import { BodyHandleService } from '../../../common/services/draw_body.service';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { handleWebCamBuffer } from 'src/app/common/utils';
import { IAppState } from 'src/app/app.state';
import { ModalComponent } from 'src/app/common/modal/modal.component';
import { MatDialog } from '@angular/material/dialog';
import { AppActions } from 'src/app/app.actions';
import { ScoreType } from 'src/constants';
import { MenuOptionsAppActions } from 'src/app/patient/components/menu-options/menu-options.actions';
import { FeedbackFormComponent } from '../feedback-form/feedback-form.component';

@Component({
  selector: 'app-game-wrapper',
  templateUrl: './game_wrapper.component.html',
  styleUrls: ['./game_wrapper.component.scss'],
})
export class GameWrapperComponent implements OnInit, OnDestroy {
  currentGameUrl;
  iframeEl;
  gameId;
  isGameUsingHigherApi = false;
  isSettingModalOpened = false;
  subscription: Subscription = new Subscription();
  dialogSubscription: Subscription;
  dialogRef;
  isEndGameModalOpen = false;
  BLOB_RECORDING_DURATION = 50;
  enlargeVideo = false;
  isInitialMediaStreamHandled = false;
  showingTimer;
  showPercentageScore = false;
  gameProgress;
  gotGameSettings = false;

  @select((state) => state.global.currentGameUrl) readonly currentGameUrl$: Observable<any>;
  @select((state) => state.global.gameId) readonly gameId$: Observable<any>;
  @select((state) => state.global.mediaStreamToIframeSettings) readonly mediaStreamToIframeSettings$: Observable<any>;
  @select((state) => state.global.enlargeVideo) readonly enlargeVideo$: Observable<boolean>;

  @Input() connectionId = '';
  @Input() gameUrl;
  @Input() gameName;
  @Input() gameIdTherapist;
  @Input() isTherapist = false;
  @Input() isInSplitScreen = false;
  @Input() peerId;
  @Input() isMobile;
  @Input() currentGameName;
  @Input() isSwappedScreen = false;
  @Input() connectedUser;
  @Input() inTherapistSession = false;
  @Input() isIntroductionProgressEnded = false;
  @Input() isGameReadyToStart = false;
  @Input() therapistPeerId;

  @Output() closeGame: EventEmitter<any> = new EventEmitter();
  @Output() onIframeLoad: EventEmitter<any> = new EventEmitter();
  @Output() gameReadyToStart: EventEmitter<any> = new EventEmitter();
  @Output() introductionProgressEnded: EventEmitter<any> = new EventEmitter();
  @Output() showGameMessage: EventEmitter<string> = new EventEmitter();
  @Output() hideGameMessage: EventEmitter<void> = new EventEmitter();
  @Output() sendInitGameSettingsForTherapist: EventEmitter<any> = new EventEmitter();
  @Output() sendShowTimerForTherapist: EventEmitter<any> = new EventEmitter();

  constructor(
    private patientWebRtcService: PatientWebRtcService,
    private ajax: AjaxService,
    private authenticationService: AuthenticationService,
    private bodyService: BodyHandleService,
    private webCamSkeletonService: WebCamSkeletonService,
    private ngRedux: NgRedux<IAppState>,
    private dialog: MatDialog,
    private appActions: AppActions,
    private menuOptionsAppActions: MenuOptionsAppActions
  ) {
    this.subscription.add(
      this.currentGameUrl$.subscribe((currentGame) => {
        this.currentGameUrl = currentGame;
      })
    );
    this.subscription.add(
      this.mediaStreamToIframeSettings$.subscribe((settings) => {
        this.handleMediaStreamToIFrameSettingsChange(settings);
      })
    );

    this.subscription.add(
      this.enlargeVideo$.subscribe((enlargeVideo) => {
        this.enlargeVideo = enlargeVideo;
      })
    );
  }

  ngOnInit() {
    if (!this.isTherapist) {
      this.initPatientCallbacks();
      this.initPatientSubscriptions();
    } else {
      this.handleTherapistCallbacks();
    }
  }

  ngOnDestroy() {
    this.introductionProgressEnded.emit(false);
    this.gameReadyToStart.emit(false);
    if (!this.isTherapist) {
      this.appActions.updateInitGameSettings({});
    } else {
      this.sendInitGameSettingsForTherapist.emit({});
    }
    this.gotGameSettings = false;
    this.appActions.resetGameScore();
    this.appActions.stopTimer(false);
    this.hideTImer();
    this.hidePercentageCircle();
    this.closeModal();
    this.patientWebRtcService.setIsSwappedScreen(undefined);
    this.patientWebRtcService.setShouldShowEndGameModal(null);
    this.hideGameMessage.emit();
    this.subscription.unsubscribe();
    if (this.dialogSubscription) {
      this.dialogSubscription.unsubscribe();
    }
    if (!this.isTherapist) {
      communicationUtil.unSubscribeAllCallbacks();
    }
  }

  hideTImer = () => {
    this.showingTimer = false;
    if (!this.isTherapist) {
      this.appActions.showTimer(false);
    }
  };

  hidePercentageCircle = () => {
    this.showPercentageScore = false;
    if (!this.isTherapist) {
      this.appActions.showPercentageScore(false);
    }
  };

  initPatientCallbacks = () => {
    communicationUtil.initPatientMessages();
    communicationUtil.registerToCallback(MESSAGES.APP_DISPLAY_STATUS, (e) => {
      this.handleAppDisplayStatus(e);
    });
    communicationUtil.registerToCallback(MESSAGES.STATE, (e) => {
      this.patientWebRtcService.setCurrentState(e);
    });
    communicationUtil.registerToCallback(MESSAGES.GET_USER_GAME_DATA, () => {
      this.getUserGameData();
    });
    communicationUtil.registerToCallback(MESSAGES.UPDATE_USER_GAME_DATA, (userGameData) => {
      this.updateUserGameData(userGameData);
    });
    communicationUtil.registerToCallback(
      MESSAGES.SUMMARY,
      debounce((gameSummary) => {
        this.ajax.updateGameSummary(gameSummary).subscribe((res) => {
        });
      }, 5000)
    );
    communicationUtil.registerToCallback(
      MESSAGES.SESSION_FEEDBACK,
      debounce((gameFeedback) => {
        this.ajax.updateGameFeedback(gameFeedback).subscribe(() => {});
      }, 5000)
    );
    communicationUtil.registerToCallback(MESSAGES.QUIT_GAME, (e) => {
      this.appActions.toggleBodyTracking(false);
      this.quitGame();
      this.closeModal();
    });
    communicationUtil.registerToCallback(MESSAGES.GENERIC_MESSAGE, (e) => {
      this.patientWebRtcService.setCurrentGenericMessageFromPatientToTherapist(e);
    });
    communicationUtil.registerToCallback(MESSAGES.GET_NOTIFICATIONS, (e) => {
      this.isGameUsingHigherApi = true;
      // this.bodyService.createHands(this.authenticationService.currentUserValue.peerId);
    });
    communicationUtil.registerToCallback(MESSAGES.SHOW_END_GAME_MODAL, (e) => {
      const { peerId } = e;
      delete e.peerId;
      if (peerId === this.authenticationService.currentUserValue.peerId) {
        if (e.showModal) {
          this.appActions.stopTimer(true);
          this.isEndGameModalOpen = true;
          setTimeout(() => {
            this.isEndGameModalOpen = false;
            this.onClickHomeButton();
          }, 5000);
        } else {
          this.isEndGameModalOpen = false;
        }
      }
    });
    communicationUtil.registerToCallback(MESSAGES.GAME_READY_TO_START, (e) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_READY_TO_START);
    });
    communicationUtil.registerToCallback(MESSAGES.ENTER_FULL_SCREEN_MODE, (e) => {
      this.handleFullScreen(e);
    });
    communicationUtil.registerToCallback(MESSAGES.SEND_MEDIA_STREAM, (e) => {
      this.appActions.setSendMediaToIFrameRequest(e);
    });
    communicationUtil.registerToCallback(MESSAGES.UPLOAD_IMAGE, (e) => {
      this.uploadGameRelatedImage(e);
    });

    communicationUtil.registerToCallback(MESSAGES.APP_DISPLAY_GAME_MESSAGE, (e) => {
      this.handleShowGameMessage(e);
    });

    communicationUtil.registerToCallback(MESSAGES.DELETE_USER_GAME_DATA, (userGameDataIds) => {
      this.deleteUserGameData(userGameDataIds);
    });

    communicationUtil.registerToCallback(MESSAGES.SEND_LOG_TO_SERVER, (data) => {
      this.sendLogToServer(data);
    });
  };

  handleFullScreen = (enterFullScreen) => {
    if (enterFullScreen) {
      this.openFullscreen();
    } else {
      this.closeFullscreen();
    }
  };

  openFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem['mozRequestFullScreen']) {
      /* Firefox */
      (elem as any).mozRequestFullScreen();
    } else if (elem['webkitRequestFullscreen']) {
      /* Chrome, Safari and Opera */
      (elem as any).webkitRequestFullscreen();
    } else if (elem['msRequestFullscreen']) {
      /* IE/Edge */
      (elem as any).msRequestFullscreen();
    }
  };

  closeFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      /* Firefox */
      (document as any).mozCancelFullScreen();
    } else if ((document as any).webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      /* IE/Edge */
      (document as any).msExitFullscreen();
    }
  };

  initPatientSubscriptions = () => {
    this.subscription.add(
      this.webCamSkeletonService.currentSkeletonFromWebCamBuffer.subscribe((skeletonBuffer) => {
        if (!this.isTherapist) {
          if (skeletonBuffer) {
            const updated_skeleton = handleWebCamBuffer(
              skeletonBuffer,
              false,
              this.authenticationService.currentUserValue.peerId,
              this.iframeEl
            );
            communicationUtil.sendMessageToIframe(this.iframeEl, updated_skeleton, MESSAGES.SKELETON);
          } else {
            communicationUtil.sendMessageToIframe(this.iframeEl, skeletonBuffer, MESSAGES.SKELETON);
          }
        }
      })
    );
    this.subscription.add(
      this.patientWebRtcService.shouldPauseGameState.subscribe((pauseGame) => {
        if (!this.isTherapist) {
          if (pauseGame) {
            communicationUtil.sendMessageToIframe(this.iframeEl, pauseGame, MESSAGES.PAUSE);

            if (!this.authenticationService.currentUserValue.disabledSkeleton) {
              this.bodyService.createHands(this.authenticationService.currentUserValue.peerId);
            }
          } else if (pauseGame !== null) {
            communicationUtil.sendMessageToIframe(this.iframeEl, pauseGame, MESSAGES.RESUME);

            if (!this.authenticationService.currentUserValue.disabledSkeleton) {
              this.bodyService.removeHands(this.authenticationService.currentUserValue.peerId);
            }
          }
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.genericMessageFromTherapistToPatient.subscribe((message) => {
        if (!this.isTherapist) {
          if (message != null && message.score != undefined) {
            this.appActions.updateGameScore(message.score);
          }
          communicationUtil.sendMessageToIframe(this.iframeEl, message, MESSAGES.GENERIC_MESSAGE);
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.sendPatientToLobby.subscribe((message) => {
        if (message.type && message.type === 'quit') {
          this.quitGame();
          this.closeModal();
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.restartGameForPatient.subscribe((message) => {
        if (message.type && message.type === 'restart_game') {
          if (!this.isTherapist) {
            communicationUtil.sendMessageToIframe(this.iframeEl, message, MESSAGES.RESTART_GAME);
          }
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.newSettings.subscribe((settings) => {
        if (isEmpty(settings) || !this.gameId) {
          return;
        }
        if (!this.isTherapist) {
          communicationUtil.sendMessageToIframe(this.iframeEl, settings, MESSAGES.NEW_SETTINGS);
          this.ajax.saveGameSettings(this.gameId, settings);
        }
      })
    );

    this.subscription.add(
      this.gameId$.subscribe((gameId) => {
        this.gameId = gameId;
      })
    );

    this.subscription.add(
      this.patientWebRtcService.currentGameStateFromTherapist.subscribe((state) => {
        if (!this.isTherapist && state) {
          communicationUtil.sendMessageToIframe(this.iframeEl, state, MESSAGES.STATE);
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.recoverdFromNetworkError.subscribe((recoverdFromNetworkError) => {
        if (!this.isTherapist && recoverdFromNetworkError) {
          communicationUtil.sendMessageToIframe(
            this.iframeEl,
            recoverdFromNetworkError,
            MESSAGES.RECOVERED_NETWORK_FALIURE
          );
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.muteGameSoundFromTherapist.subscribe((muteGameSound) => {
        if (!this.isTherapist && isBoolean(muteGameSound)) {
          communicationUtil.sendMessageToIframe(this.iframeEl, muteGameSound, MESSAGES.MUTE_GAME_SOUND);
        }
      })
    );
  };

  handleTherapistCallbacks = () => {
    communicationUtil.registerToCallback(MESSAGES.APP_DISPLAY_STATUS, (e) => {
      this.handleAppDisplayStatus(e);
    });

    communicationUtil.registerToCallback(MESSAGES.APP_DISPLAY_GAME_MESSAGE, (e) => {
      this.handleShowGameMessage(e);
    });

    communicationUtil.registerToCallback(MESSAGES.ADD_USER_GAME_DATA, (userGameData) => {
      this.addUserGameData(userGameData);
    });

    communicationUtil.registerToCallback(MESSAGES.UPDATE_USER_GAME_DATA, (userGameData) => {
      this.updateUserGameData(userGameData);
    });

    communicationUtil.registerToCallback(MESSAGES.UPDATE_USER_GAME_DATA_STATUS, (data) => {
      this.updateUserGameDataStatus(data.userGameDataIds, data.active);
    });

    communicationUtil.registerToCallback(MESSAGES.CHANGE_USER_GAME_DATA_DRAWER, (data) => {
      this.changeUserGameDataDrawer(data.userGameDataIds, data.drawer);
    });

    communicationUtil.registerToCallback(MESSAGES.DELETE_USER_GAME_DATA, (userGameDataIds) => {
      this.deleteUserGameData(userGameDataIds);
    });

    communicationUtil.registerToCallback(MESSAGES.GET_USER_GAME_DATA, () => {
      this.getUserGameData();
    });

    communicationUtil.registerToCallback(MESSAGES.ADD_GAME_DATA, (gameData) => {
      this.addGameData(gameData);
    });

    communicationUtil.registerToCallback(MESSAGES.UPDATE_GAME_DATA, (gameData) => {
      this.updateGameData(gameData);
    });

    communicationUtil.registerToCallback(MESSAGES.UPDATE_GAME_DATA_STATUS, (data) => {
      this.updateGameDataStatus(data.GameDataIds, data.active);
    });

    communicationUtil.registerToCallback(MESSAGES.DELETE_GAME_DATA, (gameDataIds) => {
      this.deleteGameData(gameDataIds);
    });

    communicationUtil.registerToCallback(MESSAGES.GET_SHORT_GAME_DATA, () => {
      this.getShortGameData();
    });

    communicationUtil.registerToCallback(MESSAGES.ADD_USER_GAME_LOG, (data) => {
      this.addUserGameLog(data);
    });

    communicationUtil.registerToCallback(MESSAGES.SEND_LOG_TO_SERVER, (data) => {
      this.sendLogToServer(data);
    });

    communicationUtil.registerToCallback(MESSAGES.GET_GAME_DATA, (gameDataIds) => {
      this.getGameDataByIds(gameDataIds);
    });

    this.subscription.add(
      this.patientWebRtcService.shouldShowEndGameModal.subscribe((data) => {
        if (data !== null && data.peerId === this.peerId) {
          if (data.showModal) {
            this.isEndGameModalOpen = true;
          } else {
            this.isEndGameModalOpen = false;
          }
        }
      })
    );
  };

  handleShowGameMessage = (data) => {
    if (data.showMessage) {
      this.showGameMessage.emit(data.message);
    } else {
      this.hideGameMessage.emit();
    }
  };

  handleAppDisplayStatus = (data) => {
    if (!('startTimer' in data) || (data.startTimer && !this.showingTimer)) {
      this.showingTimer = true;

      if (this.isIntroductionProgressEnded) {
        if (!this.isTherapist) {
          this.appActions.showTimer(true);
        } else {
          this.sendShowTimerForTherapist.emit(true);
        }
      } else {
        this.gameReadyToStart.emit(true);
      }
    }
    if (!this.gotGameSettings && data.settings) {
      if (!this.isTherapist) {
        this.appActions.updateInitGameSettings(data.settings);
      } else {
        this.sendInitGameSettingsForTherapist.emit(data.settings);
      }
      this.gotGameSettings = true;
    }
    if (data.score) {
      if (!this.isTherapist) {
        this.appActions.setCurrentGameAppData({ score: data.score });
      }
      if (data.score.type.toLowerCase() == ScoreType.Percentage.toLowerCase() && !this.showPercentageScore) {
        this.showPercentageScore = true;
        if (!this.isTherapist) {
          this.appActions.showPercentageScore(true);
        }
      }
      if (this.gameProgress != data.score.value) {
        this.gameProgress = data.score.value;
        if (!this.isTherapist) {
          this.appActions.updateGameScore(data.score);
        }
      }
    }
  };

  destroyPatientSubscriptions = () => {
    this.subscription.unsubscribe();
  };

  isModalOpen = () => {
    return this.ngRedux.getState().global.callModal.open;
  };

  onClickHomeButton = () => {
    if (!this.iframeEl) {
      this.quitGame();
    } else {
      if (this.isTherapist) {
        communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.SEND_QUIT_MESSAGE);
      } else {
        if (this.isMobile) {
          this.authenticationService.logout();
        } else {
          this.quitGame();
        }
      }
    }
  };

  onClickSettings = () => {
    this.isSettingModalOpened = !this.isSettingModalOpened;
    communicationUtil.sendMessageToIframe(this.iframeEl, this.isSettingModalOpened, MESSAGES.SETTINGS_MODAL_OPENED);
  };

  getInstructionsClass = () => {
    return `info-btn ${this.isTherapist ? 'therapist' : 'patient'}`;
  };

  getHomeClass = () => {
    return `home-btn ${this.isTherapist ? 'patient' : 'patient'}`;
  };

  quitGame() {
    this.closeModal();
    this.isEndGameModalOpen = false;
    if (!this.gotGameSettings) {
      this.iframeEl = null;
      this.closeGame.emit();
      this.destroyPatientSubscriptions();
      return;
    }
    this.iframeEl.parentNode.removeChild(this.iframeEl);
    this.iframeEl = null;
    this.closeGame.emit();
    this.destroyPatientSubscriptions();
    if (this.dialogSubscription) {
      this.dialogSubscription.unsubscribe();
    }
    if (!this.isTherapist) {
      communicationUtil.unSubscribeAllCallbacks();
    }
  }

  handleReload = () => {
    this.isEndGameModalOpen = false;
    if (!this.isTherapist) {
      communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.RESTART_GAME);
    } else {
      communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.SEND_RESTART_GAME_MESSAGE);
    }
  };

  handleIframeLoad = () => {
    this.iframeEl = document.getElementById('games-iframe-' + this.connectionId);
    if (this.isTherapist) {
      this.ajax.getGameSettingsForPatient(this.gameIdTherapist, this.connectedUser.patientId).subscribe((settings) => {
        communicationUtil.sendMessageToIframe(
          this.iframeEl,
          {
            isTherapist: true,
            peerId: this.peerId,
            userId: this.peerId,
            patientSettings: settings,
            playerId: this.authenticationService.currentUserValue.id,
            playerFirstName: this.authenticationService.currentUserValue.firstName,
            playerLastName: this.authenticationService.currentUserValue.lastName,
          },
          MESSAGES.IS_THERAPIST
        );
      });
    } else {
      this.ajax.startGameSession(this.gameId).subscribe((settings) => {
        communicationUtil.sendMessageToIframe(
          this.iframeEl,
          {
            isTherapist: false,
            userId: this.authenticationService.currentUserValue.peerId,
            game_settings: settings,
            playerId: this.authenticationService.currentUserValue.id,
            playerFirstName: this.authenticationService.currentUserValue.firstName,
            playerLastName: this.authenticationService.currentUserValue.lastName,
          },
          MESSAGES.IS_THERAPIST
        );
        if (!this.isTherapist && !this.inTherapistSession) {
          communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_READY_TO_START);
        }
      });
    }

    this.onIframeLoad.emit();
  };

  getIframeSrc = () => {
    return this.isTherapist && this.gameUrl ? this.gameUrl.changingThisBreaksApplicationSecurity : this.currentGameUrl;
  };

  openEndGameModal = (content) => {
    if (!this.isEndGameModalOpen) {
      let modalClass = '';
      if (this.isMobile) {
        modalClass = 'screen-panel-popup-mobile';
      } else if (this.isSwappedScreen) {
        modalClass = 'split-screen-swapped-panel-popup';
      } else if (this.isInSplitScreen) {
        modalClass = 'split-screen-panel-popup';
      }

      this.openModal({
        panelClass: modalClass,
        approveCallback: () => this.onClickHomeButton(),
        acceptBtnImg: '/assets/buttons/btn_home.png',
        acceptBtnImgHover: '/assets/buttons/btn_home_hover.png',
        isTherapist: this.isTherapist,
        header: 'Good Job',
        content,
      });
    }
  };

  openModal(modalData) {
    this.isEndGameModalOpen = true;
    const gameWrapperEl = document.getElementById(`gameWrapper-${this.connectionId}`);
    const {
      panelClass,
      header,
      content,
      approveCallback,
      declineCallback,
      isTherapist,
      acceptBtnImg = '',
      acceptBtnImgHover = '',
      declineBtnImg = '',
      declineBtnImgHover = '',
    } = modalData;
    this.dialogRef = this.dialog.open(ModalComponent, {
      hasBackdrop: false,
      id: this.peerId,
      panelClass,
      data: {
        isSwappedScreen: this.isSwappedScreen,
        isSplitScreen: this.isInSplitScreen,
        has_backdrop: false,
        positionRelativeToElement: gameWrapperEl,
        header,
        content,
        acceptBtnImg,
        acceptBtnImgHover,
        declineBtnImg,
        declineBtnImgHover,
        isTherapist,
        approveCallback,
        declineCallback,
      },
    });

    // tslint:disable-next-line: no-string-literal
    this.dialogSubscription = this.dialogRef.componentInstance['isApprove'].subscribe((isApprove) => {
      if (isApprove) {
        approveCallback();
      } else {
        declineCallback();
      }
      this.closeModal();
    });
  }

  closeModal() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
    if (!this.isTherapist && !this.inTherapistSession) {
      this.dialogRef = this.dialog.open(FeedbackFormComponent, {
        hasBackdrop: true,
        id: this.peerId,
        data: {
          has_backdrop: false,
          inTherapistSession: this.inTherapistSession,
          isTherapist: this.isTherapist,
        },
      });
    }
    
  }

  handleMediaStreamToIFrameSettingsChange = (settings) => {
    if (!this.isInitialMediaStreamHandled) {
      this.isInitialMediaStreamHandled = true;
      return;
    }

    if (!settings) {
      return;
    }

    const iFrameEl = document.getElementById('games-iframe-' + this.connectionId);

    settings.mediaRecorder.ondataavailable = (e) => {
      if (e?.data?.size > 0) {
        e.data.arrayBuffer().then((buffer) => {
          communicationUtil.sendBlobMessageToIframe(
            iFrameEl,
            { buffer, mediaDuration: e.timeStamp },
            MESSAGES.MEDIA_STREAM
          );
        });
      }
    };
    settings.sendStream ? settings.mediaRecorder.start(this.BLOB_RECORDING_DURATION) : settings.mediaRecorder.stop();
  };

  uploadGameRelatedImage = (data) => {
    this.ajax.uploadGameRelatedImage(data.file).subscribe((url: string) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, url, MESSAGES.IMAGE_UPLOADED);
    });
  };

  addUserGameData = (userGameData: any[]) => {
    const userId = this.peerId;
    const gameId = this.gameIdTherapist;
    userGameData = map(userGameData, (item) => ({ ...item, gameId, userId }));
    this.ajax.createUserGameData(userGameData).subscribe((data) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, data, MESSAGES.USER_GAME_DATA_CREATED);
    });
  };

  updateUserGameData = (userGameData) => {
    this.ajax.updateUserGameData(userGameData, this.isTherapist).subscribe(() => {});
  };

  updateUserGameDataStatus = (userGameDataIds, active) => {
    this.ajax.setUserGameDataStatus(userGameDataIds, active).subscribe(() => {});
  };

  changeUserGameDataDrawer = (userGameDataIds, drawer) => {
    this.ajax.changeUserGameDataDrawer(userGameDataIds, drawer).subscribe(() => {});
  };

  deleteUserGameData = (userGameDataIds) => {
    this.ajax.deleteUserGameData(userGameDataIds, this.isTherapist).subscribe(() => {});
  };

  getUserGameData = () => {
    const { gameId, userId } = this.getUserGameDataPropertiesToSend();
    this.ajax.getUserGameData(gameId, userId, this.isTherapist).subscribe((data) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, data, MESSAGES.USER_GAME_DATA);
    });
  };

  addGameData = (gameData: any[]) => {
    const gameId = this.gameIdTherapist;
    gameData = map(gameData, (item) => ({ ...item, gameId }));
    this.ajax.createGameData(gameData).subscribe((data) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, data, MESSAGES.GAME_DATA_CREATED);
    });
  };

  updateGameData = (gameData) => {
    this.ajax.updateGameData(gameData).subscribe(() => {});
  };

  updateGameDataStatus = (gameDataIds, active) => {
    this.ajax.setGameDataStatus(gameDataIds, active).subscribe(() => {});
  };

  deleteGameData = (gameDataIds) => {
    this.ajax.deleteGameData(gameDataIds).subscribe(() => {});
  };

  getShortGameData = () => {
    const gameId = this.gameIdTherapist;
    this.ajax.getShortGameData(gameId).subscribe((data) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, data, MESSAGES.SHORT_GAME_DATA);
    });
  };

  addUserGameLog = (data: object) => {
    this.menuOptionsAppActions.addUserGameLog(data);
  };

  sendLogToServer = (data: any) => {
    data['connectedUserId'] = this.isTherapist ? +data.peerId : +this.therapistPeerId;
    const gameId = this.isTherapist ? this.gameIdTherapist : this.gameId;
    const { peerId, role } = this.authenticationService.currentUserValue;
    const key = role + '_id';
    const dataToServer = {
      ...data,
      game_id: gameId,
      [key]: +peerId,
      reported_by_user_id: +peerId,
    };
    this.ajax.sendLogToServer(dataToServer).subscribe(() => {});
  };

  getGameDataByIds = (data: any) => {
    const { gameDataIds } = data;
    const gameId = this.gameIdTherapist;
    if (!this.authenticationService?.currentUserValue?.peerId || !gameId) {
      return;
    }
    this.ajax.getGameDataByIds(gameDataIds).subscribe((data) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, data, MESSAGES.GAME_DATA);
    });
  };
  getUserGameDataPropertiesToSend = () => {
    if (!this.isTherapist) {
      return { gameId: this.gameId, userId: +this.authenticationService.currentUserValue.peerId };
    } else {
      return { gameId: this.gameIdTherapist, userId: this.peerId };
    }
  };
}
