import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  SimpleChanges,
  SimpleChange,
  OnChanges,
  Output,
  ViewChild,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import _ from 'lodash';
import { select } from '@angular-redux/store';
import { Subscription, Observable } from 'rxjs';

import { AppActions } from '../../../app.actions';
import { HandsEvent } from '../../services/events.service';
import { AuthenticationService } from '../../../common/services/authentication.service';
import { User } from '../../../common/models/user';
import { BodyHandleService } from '../../../common/services/draw_body.service';
import { DepthCameraSocketService } from 'src/app/common/services/depth_camera_socket.service';
import { MenuOptionsAppActions } from './menu-options.actions';
import { PatientWebRtcService } from '../../services/patient_web_rtc.service';
import { notificationsEmitter } from '../../../common/services/notifications_emitter.service';
import { WebCamSkeletonService } from '../../../common/services/posenet_camera.service';
import { GameWrapperComponent } from '../../components/game_wrapper/game_wrapper.component';
import { GameTimerComponent } from '../../components/game_timer/game_timer.component';
import { GameMissionProgressComponent } from '../../components/game_mission_progress/game_mission_progress.component';
import { GameScoreComponent } from '../../components/game-score/game_score.component';
import {
  handleWebCamBuffer,
  handleDepthCameraHandsSmoothing,
  MOBILE_OR_SMALL_RESOLUTION,
  getOrganAnglesFromBuffer,
} from '../../../common/utils';
import { AjaxService } from '../../../therapist/services/ajax.service';
import { IGame, IOrganAngle } from '../../../../types';
import { IGameAppData } from '../../../../app/app.state';

const MAX_GAMES_IN_PAGE = 10;
const GAME_ICON_BASE_URL = '../../../../assets/game-icons/';

@Component({
  selector: 'app-menu-options',
  templateUrl: './menu-options.component.html',
  styleUrls: ['./menu-options.component.scss'],
})
export class MenuOptionsComponent implements OnInit, OnDestroy, OnChanges {
  @select((state) => state.menu_options.validGames) readonly validGames$: Observable<any>;
  @select((state) => state.global.playerFlag) readonly flag$: Observable<any>;
  @select((state) => state.global.isTherapist) readonly therapist$: Observable<boolean>;
  @select((state) => state.global.enlargeVideo) readonly enlargeVideo$: Observable<boolean>;
  @select((state) => state.global.organAngles) readonly organAngles$: Observable<IOrganAngle[]>;
  @select((state) => state.menu_options.current_page_index) readonly current_page_index$: Observable<any>;
  @select((state) => state.menu_options.skeleton_buffer_from_peer) readonly skeleton_buffer_from_peer$: Observable<any>;
  @select((state) => state.global.posenetLoadingTimePassed)
  readonly posenetLoadingTimePassed$: Observable<boolean>;
  @select((state) => state.menu_options.inTherapistSession) readonly inTherapistSession$: Observable<boolean>;
  @select((state) => state.global.currentGameName) readonly currentGameName$: Observable<string>;
  @select((state) => state.global.showTimer) readonly showTimer$: Observable<boolean>;
  @select((state) => state.global.showPercentageScore) readonly showPercentageScore$: Observable<boolean>;
  @select((state) => state.global.stopTimer) readonly stopTimer$: Observable<boolean>;
  @select((state) => state.global.currentGame) readonly currentGame$: Observable<IGame>;

  @Input() gameOptionsState: any;
  @Input() connectedUser: any;
  @Input() isConnectedUserInGame: any;
  @Input() connectionId: any;
  @Input() connectedPatientGameUrl: any;
  @Input() isTherapistMode = false;
  @Input() isPatientOnMobile = false;
  @Input() gameIdTherapist;
  @Input() isInSplitScreen = false;
  @Input() isSwappedScreen = false;
  @Input() allowStartGame = false;
  @Input() showTimerForTherapist;
  @Input() showPercentageScoreForTherapist;
  @Input() gameAppDataFromPatient?: IGameAppData = null;
  @Input() currentGameName: string;
  @Input() initGameSettingsForTherapist;
  @Input() scoreForTherapist;
  @Input() skeletonTrackingData;

  @Output() onIframeLoad: EventEmitter<any> = new EventEmitter();
  @Output() gameIsShown = new EventEmitter();
  @Output() setShowTimerForTherapist: EventEmitter<any> = new EventEmitter();
  @Output() redirectToHome: EventEmitter<any> = new EventEmitter();
  @Output() setInitGameSettingsForTherapist: EventEmitter<any> = new EventEmitter();

  @ViewChild('gameWrapper') gameWrapper: GameWrapperComponent;
  @ViewChild('gametimer') gameTimer: GameTimerComponent;
  @ViewChild('gamescoreregular') gameScoreRegular: GameScoreComponent;
  @ViewChild('gamescorepercentage') gameScorePercentage: GameMissionProgressComponent;

  menuApps = []; // an array of objects to house menu apps
  playerFlag;
  role: string;
  currentUser: User;
  patientCtx: any;
  patientSkeletonCtx: any;
  isInGame: boolean = false;
  currentPageIndex: number = 0;
  subscription: Subscription = new Subscription();
  movedRight = false;
  currentMenuApps = [];
  showLeftButton = false;
  showRightButton = true;
  games = [];
  videoSessionDisplay = false;
  currentCall: any;
  otherSideLeftSession = false;
  showGameMessage = false;
  lastFrame;
  localVideo;
  isShareScreen;
  isMobile = false;
  shouldMirrorVideoFullScreen = false;
  enlargeVideo = false;
  showAngles = false;
  posenetLoadingTimePassed = false;
  currentGameIndex = 0;
  inTherapistSession = false;
  gameMission: string = '';
  showTimer: boolean = false;
  showPercentageScore: boolean = false;
  stopTimer: boolean = false;
  isGameReadyToStart: boolean = false;
  isIntroductionProgressEnded: boolean = false;
  currentGameDescription: string = '';
  gameMessage: string = '';
  therapistPeerId: string = '';
  InstituteLogo: string ;

  constructor(
    private authenticationService: AuthenticationService,
    private bodyHandleService: BodyHandleService,
    private appActions: AppActions,
    private depthCameraSocketService: DepthCameraSocketService,
    private webCamSkeletonService: WebCamSkeletonService,
    private menuOptionsActions: MenuOptionsAppActions,
    private patientWebRtcService: PatientWebRtcService,
    private ajax: AjaxService,
    private ref: ChangeDetectorRef
  ) {
    if (!this.isTherapistMode) {
      const isWEBGL2Available = this.webCamSkeletonService.isWEBGL2Available();
      if (isWEBGL2Available) {
        this.webCamSkeletonService.initializeModel();
      } else {
        this.appActions.setBodyTrackingUnavailable();
      }
    }
    this.subscription.add(
      this.authenticationService.currentUser.subscribe((user) => {
        this.currentUser = user;
        this.InstituteLogo = this.currentUser?.instituteLogo || '';
      })
    );   
    if (!this.isTherapistMode) {
      if (MOBILE_OR_SMALL_RESOLUTION) {
        this.isMobile = true;
      }
      window.addEventListener('resize', () => {
        if (MOBILE_OR_SMALL_RESOLUTION) {
          this.isMobile = true;
        } else {
          this.isMobile = false;
        }
      });
    } 
  }

  ngOnInit() {
    console.log("=======isPatientOnMobile===========",this.isPatientOnMobile);
    console.log("=======isTherapistMode===========",this.isTherapistMode);
    this.appActions.setCurrentGame({ url: 'menu-options', gameId: undefined });
    const canvas: any = document.getElementById('patient-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.patientCtx = canvas.getContext('2d');
    }
    const skeletonCanvas: any = document.getElementById('patient-canvas-skeleton') as HTMLCanvasElement;
    if (skeletonCanvas) {
      this.patientSkeletonCtx = skeletonCanvas.getContext('2d');
    }   

    if (!this.isTherapistMode) {
      this.subscription.add(
        this.showTimer$.subscribe((showTimer) => {
          this.showTimer = showTimer;
          if (this.showTimer) {
            this.gameIsShown.emit();
          }
        })
      );

      this.subscription.add(
        this.showPercentageScore$.subscribe((showPercentageScore) => {
          this.showPercentageScore = showPercentageScore;
        })
      );

      this.subscription.add(
        this.stopTimer$.subscribe((stopTimer) => {
          this.stopTimer = stopTimer;
        })
      );

      this.subscription.add(
        this.currentGameName$.subscribe((currentGameName) => {
          this.currentGameName = currentGameName;
        })
      );

      this.subscription.add(
        this.currentGame$.subscribe((currentGame) => {
          this.currentGameDescription = currentGame.description;
        })
      );
    }

    this.subscription.add(
      this.authenticationService.currentUser.subscribe((x) => {
        this.currentUser = x;
        if (this.currentUser) {
          const patientId =
            this.connectedUser && this.connectedUser.patientId ? this.connectedUser.patientId : this.currentUser.id;
          this.ajax.getValidGames(patientId).subscribe((games) => {
            this.menuOptionsActions.setValidGames(games);
          });
        }
      })
    );

    this.subscription.add(
      
      this.validGames$.subscribe((games) => {
        this.games = games;
        this.menuApps = [];
        if (!games) {
          return;
        }
        games.forEach((element) =>
          this.menuApps.push({
            isEnabled: element.is_enable,
            url: this.getUrlGame(element.url),
            gameId: element.id,
            image: this.getEnableImage(element.name),
            name: element.name,
            bodyTrackRequired: element.body_track_required,
            description: element.description,
          })
        );
        //this.currentMenuApps = this.menuApps.slice(this.currentPageIndex, MAX_GAMES_IN_PAGE);
        /*this.currentMenuApps = this.menuApps;
        if (this.isMobile) {
          const studioIndex = this.currentMenuApps.findIndex((app) => app.name === 'studio');
          if (studioIndex > -1) {
            //this.navigate(studioIndex);
          }
        }*/

        // If in mobile view, filter to show only "studio" game
          
        if (this.isMobile || this.isPatientOnMobile) {
          this.currentMenuApps = this.menuApps.filter((app) => app.name === 'studio');
          const studioIndex = this.currentMenuApps.findIndex((app) => app.name === 'studio');
          if (studioIndex > -1) {
            this.navigate(studioIndex);
          }
        } else {
          this.currentMenuApps = this.menuApps;
        }

        this.checkRightButton();
      })
    );

    this.subscription.add(
      this.therapist$.subscribe((therapistFlag) => {
        this.role = therapistFlag ? 'Therapist' : 'patient';
        if (this.isMobile) {
          this.currentMenuApps = this.menuApps.filter((app) => app.name === 'studio');
        }
      })
    );

    this.subscription.add(
      this.skeleton_buffer_from_peer$.subscribe((skeleton_buffer) => {
        if (skeleton_buffer && this.isTherapistMode && skeleton_buffer.id === this.connectedUser.peerId) {
          if (
            !this.isTherapistMode ||
            !skeleton_buffer.skeleton ||
            skeleton_buffer.skeleton.length <= 0 ||
            this.isInGame
          ) {
            if (this.isTherapistMode) {
              setTimeout(() => {
                this.bodyHandleService.removeHands(skeleton_buffer.id);
              }, 500);
            }
            return;
          }
          if (!this.isInGame) {
            this.bodyHandleService.createHands(skeleton_buffer.id);
            this.bodyHandleService.handleSkeleton(
              skeleton_buffer.skeleton,
              skeleton_buffer.id,
              true,
              this.skeletonTrackingData
            );
          }
        }
      })
    );

    this.subscription.add(
      this.current_page_index$.subscribe((current_index) => {
        this.currentPageIndex = current_index;
        this.patientWebRtcService.setCurrentState({
          state: this.currentPageIndex,
          type: 'menu-options',
        });
      })
    );

    this.subscription.add(
      this.depthCameraSocketService.currentSkeletonBuffer.subscribe((skeleton_buffer) => {
        if (!this.videoSessionDisplay) {
          if (skeleton_buffer && skeleton_buffer.length > 0) {
            if (!this.isInGame && !this.currentUser.disabledSkeleton) {
              this.bodyHandleService.createHands(this.authenticationService.currentUserValue.peerId);
            }
            const updated_skeleton_buffer = handleDepthCameraHandsSmoothing(skeleton_buffer, true);
            this.patientWebRtcService.setSkeletonBuffer(
              handleWebCamBuffer(skeleton_buffer, false, this.authenticationService.currentUserValue.peerId)
            );
            this.bodyHandleService.handleSkeleton(
              updated_skeleton_buffer,
              this.authenticationService.currentUserValue.peerId
            );
            this.handleDrawSkeletonOnDepthCamera(skeleton_buffer);
            // dispatch hand move custom event from hands
            notificationsEmitter.handleSkeleton(updated_skeleton_buffer);
          }
        }
      })
    );

    this.subscription.add(
      this.webCamSkeletonService.currentSkeletonFromWebCamBuffer.subscribe((skeleton_buffer) => {
        if (!this.videoSessionDisplay) {
          if (skeleton_buffer && skeleton_buffer.length > 0) {
            if (!this.isInGame) {
              this.bodyHandleService.createHands(this.authenticationService.currentUserValue.peerId);
            }
            const updated_skeleton = handleWebCamBuffer(
              skeleton_buffer,
              true,
              this.authenticationService.currentUserValue.peerId
            );
            if (this.showAngles) {
              const organAngles = getOrganAnglesFromBuffer(skeleton_buffer);
              this.appActions.setOrganAngles(organAngles);  
            }
            this.patientWebRtcService.setSkeletonBufferFromWebCamBuffer(
              handleWebCamBuffer(skeleton_buffer, false, this.authenticationService.currentUserValue.peerId)
            );
            this.bodyHandleService.handleSkeleton(updated_skeleton, this.authenticationService.currentUserValue.peerId);
            notificationsEmitter.handleSkeleton(updated_skeleton);
          } else {
            this.patientWebRtcService.setSkeletonBufferFromWebCamBuffer(undefined);
            if (this.isTherapistMode) {
              this.bodyHandleService.removeHands(this.connectedUser.peerId);
            } else {
              this.bodyHandleService.removeHands(this.currentUser.peerId);
            }
          }
        }
      })
    );

    this.subscription.add(
      this.depthCameraSocketService.currentFrameBuffer.subscribe((frame) => {
        this.handleImage(frame);
      })
    );
    this.subscription.add(
      this.patientWebRtcService.mirrorFullScreenVideoFromTherapist.subscribe((mirrorVideo) => {
        if (!this.isTherapistMode && _.isBoolean(mirrorVideo)) {
          this.shouldMirrorVideoFullScreen = mirrorVideo;
          this.ref.detectChanges();
        }
      })
    );

    this.subscription.add(
      this.enlargeVideo$.subscribe((enlargeVideo) => {
        this.enlargeVideo = enlargeVideo;
      })
    );

    this.subscription.add(
      this.posenetLoadingTimePassed$.subscribe((posenetLoadingTimePassed) => {
        this.posenetLoadingTimePassed = posenetLoadingTimePassed;
        if (!posenetLoadingTimePassed) {
          return;
        }

        if (this.inTherapistSession) {
          this.appActions.toggleBodyTracking(false);
          return;
        }

        if (this.isInGame && this.currentMenuApps[this.currentGameIndex].bodyTrackRequired && !this.isTherapistMode) {
          this.appActions.toggleBodyTracking(true);
        } else {
          this.appActions.toggleBodyTracking(false);
        }
      })
    );

    this.subscription.add(
      this.inTherapistSession$.subscribe((inTherapistSession) => {
        this.inTherapistSession = inTherapistSession;
        if (!this.inTherapistSession && this.videoSessionDisplay) {
          this.toggleVideoSessionView();
        }
      })
    ); 
    
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log( "we are under ngOnChanges function ");
    if (changes.showPercentageScoreForTherapist?.currentValue) {
      this.showPercentageScoreForTherapist = changes.showPercentageScoreForTherapist.currentValue;
    }
    if (changes.scoreForTherapist?.currentValue) {
      this.scoreForTherapist = changes.scoreForTherapist.currentValue;
    }
    if (changes.showTimerForTherapist?.currentValue) {
      this.gameIsShown.emit();
    }

    if (changes.initGameSettingsForTherapist?.currentValue) {
      this.initGameSettingsForTherapist = changes.initGameSettingsForTherapist?.currentValue;
    }

    if (changes.gameAppDataFromPatient?.currentValue?.timeInSeconds && this.gameTimer) {
      this.gameTimer.totalInGameSeconds = changes.gameAppDataFromPatient.currentValue.timeInSeconds;
    }

    if (changes.gameAppDataFromPatient?.currentValue?.score && this.gameScoreRegular) {
      this.gameScoreRegular.pointsEarned = changes.gameAppDataFromPatient.currentValue.score.value;
    }

    if (changes.gameAppDataFromPatient?.currentValue?.score && this.gameScorePercentage) {
      this.gameScorePercentage.percentage = Math.floor(changes.gameAppDataFromPatient.currentValue.score.value);
    }

    const gameOptionsState: SimpleChange = changes.gameOptionsState;
    if (
      gameOptionsState &&
      gameOptionsState.previousValue !== gameOptionsState.currentValue &&
      gameOptionsState.currentValue.isTherapist
    ) {
      this.menuOptionsActions.setSkeletonBufferState({
        skeleton: gameOptionsState.currentValue.skeletonBuffer,
        id: gameOptionsState.currentValue.id,
      });
      if (!gameOptionsState.currentValue.skeletonBuffer || gameOptionsState.currentValue.skeletonBuffer.length <= 0) {
        if (this.isTherapistMode) {
          this.bodyHandleService.removeHands(this.connectedUser.peerId);
        } else {
          this.bodyHandleService.removeHands(this.currentUser.peerId);
        }
      }
      if (gameOptionsState.currentValue.isTherapist) {
        this.menuOptionsActions.setTherapistStatus(gameOptionsState.currentValue.isTherapist);
      }
      if (
        this.menuApps &&
        this.menuApps.length === 0 &&
        gameOptionsState.currentValue.patients_game &&
        gameOptionsState.currentValue.patients_game.length > 0
      ) {
        this.menuOptionsActions.setValidGames(gameOptionsState.currentValue.patients_game);
      }
    }
  }

  handleDrawSkeletonOnDepthCamera = (skeleton_buffer) => {
    if (!this.localVideo) {
      this.localVideo = document.getElementById('patient-video') as HTMLVideoElement;
    }
    const canvas = document.getElementById('patient-canvas-skeleton');
    this.patientSkeletonCtx = (canvas as HTMLCanvasElement).getContext('2d');
    (canvas as HTMLCanvasElement).width = this.localVideo.width;
    (canvas as HTMLCanvasElement).height = this.localVideo.height;

    if (this.patientSkeletonCtx) {
      this.patientSkeletonCtx.clearRect(0, 0, 257, 200);
      this.patientSkeletonCtx.save();
      this.patientSkeletonCtx.scale(1, 1);
      this.patientSkeletonCtx.translate(0, 0);
      this.patientSkeletonCtx.drawImage(this.localVideo, 0, 0, 257, 200);
      this.patientSkeletonCtx.restore();
    }
  };

  handleImage(buf) {
    if (!this.patientCtx) {
      const canvas: any = document.getElementById('patient-canvas') as HTMLCanvasElement;
      if (canvas) {
        this.patientCtx = canvas.getContext('2d');
      }
    }
    if (this.patientCtx) {
      this.drawCameraImgOnCanvas(this.patientCtx, buf);
    }
  }

  drawCameraImgOnCanvas(ctx, buf) {
    const blob = new Blob([buf], { type: 'image/jpg' });
    const url = URL.createObjectURL(blob);
    this.lastFrame = new Image();
    this.lastFrame.onload = function () {
      ctx.drawImage(this, 0, 0, 257, 200);
      URL.revokeObjectURL(url);
    };
    this.lastFrame.src = url;
  }

  checkIfMouseOnMenuItem(evt: HandsEvent, menuItem) {
    return (
      (evt.l_x > menuItem.left && evt.l_x < menuItem.right && evt.l_y > menuItem.top && evt.l_y < menuItem.bottom) ||
      (evt.r_x > menuItem.left && evt.r_x < menuItem.right && evt.r_y > menuItem.top && evt.r_y < menuItem.bottom)
    );
  }

  navigate(index) {
    console.log("we are in navigate function");
   
    if (!this.currentMenuApps[index].url) {
      return;
    }

    this.currentGameIndex = index;

    if (this.isTherapistMode) {
      this.bodyHandleService.removeHands(this.connectedUser.peerId);
      this.appActions.setCurrentGameUrlFromTherapist(this.currentMenuApps[index].url, this.connectedUser.peerId);
      if (this.currentMenuApps[index].bodyTrackRequired && this.allowStartGame) {
        this.appActions.toggleBodyTracking(true);
      } else {
        this.appActions.toggleBodyTracking(false);
      }
      return;
    }

    this.bodyHandleService.removeHands(this.currentUser.peerId);
    this.isInGame = true;

    this.appActions.setCurrentGame({
      url: this.currentMenuApps[index].url,
      gameId: this.currentMenuApps[index].gameId,
      name: this.currentMenuApps[index].name,
      description: this.currentMenuApps[index].description,
    });
    if (this.currentMenuApps[index].bodyTrackRequired && this.posenetLoadingTimePassed) {
      this.appActions.toggleBodyTracking(true);
    } else {
      this.appActions.toggleBodyTracking(false);
    }
    this.menuOptionsActions.setIsInGame(true);
    console.log("setappaction==", this.appActions)
  }

  handleNewGameFromTherapist(url) {
    console.log("we are in handleNewGameFromTherapist function", url);
    const newGame = this.menuApps.find((game) => game.url === url);
    if (newGame) {
      this.isInGame = true;
      this.appActions.setCurrentGame({
        url: newGame.url,
        gameId: newGame.gameId,
        name: newGame.name,
        bodyTrackRequired: newGame.bodyTrackRequired,
      });
      this.menuOptionsActions.setIsInGame(true);
      if (this.isTherapistMode) {
        this.bodyHandleService.removeHands(this.connectedUser.peerId);
      } else {
        this.bodyHandleService.removeHands(this.currentUser.peerId);
      }
    }
  }

  toggleVideoSessionView = () => {
    console.log("we are in toggleVideoSessionView function");
    this.videoSessionDisplay = !this.videoSessionDisplay;
    if (!this.videoSessionDisplay) {
      this.patientWebRtcService.setShouldPauseGameState(false);
      this.patientWebRtcService.setShouldCloseFullScreenVideoSession(true);
      if (this.isTherapistMode && !this.connectedUser.disabledSkeleton && !this.currentUser.disabledSkeleton) {
        this.bodyHandleService.createHands(this.connectedUser.peerId);
      } else if (this.isInGame && !this.currentUser.disabledSkeleton && !this.currentUser.disabledSkeleton) {
        this.bodyHandleService.createHands('');
      } else if (!this.currentUser.disabledSkeleton && !this.currentUser.disabledSkeleton) {
        this.bodyHandleService.createHands(this.authenticationService.currentUserValue.peerId);
      }
    }
  };

  handleOtherSideLeftVideoSession() {
    this.otherSideLeftSession = true;
    this.toggleVideoSessionView();
  }

  handleFullScreenVideoSession() {
    this.patientWebRtcService.setShouldPauseGameState(true);
    this.videoSessionDisplay = true;
    this.otherSideLeftSession = false;
    if (this.isTherapistMode) {
      this.bodyHandleService.removeHands(this.connectedUser.peerId);
    } else {
      this.bodyHandleService.removeHands(this.currentUser.peerId);
    }
  }

  saveCallObject = (call) => {
    this.currentCall = call;
    this.therapistPeerId = this.currentCall.peer;
  };

  handleScreenShare = (isShareScreen) => {
    this.isShareScreen = isShareScreen;
  };

  handleQuitGame() {
    this.isInGame = false;
    if (this.isTherapistMode) {
      this.isConnectedUserInGame = false;
    }
    this.menuOptionsActions.setIsInGame(false);
  }

  gameReadyToStart(status) {
    console.log("we are in gameReadyToStart function",status);
    this.isGameReadyToStart = status;
  }

  introductionProgressEnded(status) {
    this.isIntroductionProgressEnded = status;
  }

  sendShowTimerForTherapist(status) {
    this.setShowTimerForTherapist.emit(status);
  }

  onClickHomeButton() {
    if (this.gameWrapper) {
      this.gameWrapper.onClickHomeButton();
    }
  }

  setPlayerFlag(option) {
    if (this.role === 'patient') {
      this.appActions.changeFlag(option);
    }
  }

  showActive(activeNum) {
    return activeNum > 0 && this.playerFlag === 'multi';
  }

  async logout() {
    if (this.isTherapistMode) {
      this.bodyHandleService.removeHands(this.connectedUser.peerId);
    } else {
      this.appActions.setPosenetLoadingTimePassed(false);
      this.bodyHandleService.removeHands(this.currentUser.peerId);
    }
    this.appActions.setLoggedInUser(false);
    await this.authenticationService.logout();
    this.ngOnDestroy();
  }

  triggerClick(x, y) {
    const ev = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      screenX: x,
      screenY: y,
    });

    const el = document.elementFromPoint(x, y);
    if (el) {
      el.dispatchEvent(ev);
    }
  }

  checkRightButton() {
    if (this.menuApps.length <= this.currentPageIndex * MAX_GAMES_IN_PAGE + MAX_GAMES_IN_PAGE) {
      this.showRightButton = false;
    } else {
      this.showRightButton = true;
    }
  }

  checkLeftButton() {
    if (this.currentPageIndex === 0) {
      this.showLeftButton = false;
    }
  }

 
  handleIframeLoad = () => {
   
    this.onIframeLoad.emit();
  };

  showGameMessageToUser = (message: string) => {
    this.showGameMessage = true;
    this.gameMessage = message;
  };

  hideGameMessageFromUser = () => {
    this.showGameMessage = false;
  };

  sendInitGameSettingsForTherapist = (data) => {
    this.setInitGameSettingsForTherapist.emit(data);
  };

  ngOnDestroy() {
    if (this.isTherapistMode) {
      this.bodyHandleService.removeHands(this.connectedUser.peerId);
    }
    if (this.localVideo) {
      this.localVideo.srcObject.getTracks().forEach((track) => track.stop());
    }
    this.subscription.unsubscribe();
  }

  getEnableImage(gameName) {
    return GAME_ICON_BASE_URL + `${gameName}.png`;
  }

  getUrlGame(url) {
    console.log("we are in getUrlGame function==",url);
    
    return url + 'index.html';
  }

  getEnlargeVideo() {
    return this.enlargeVideo;
  }
}
