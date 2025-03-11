import { environment } from '../../../../environments/environment';
import {
  Component,
  OnInit,
  Input,
  OnDestroy,
  Output,
  EventEmitter,
  AfterViewInit,
  SimpleChanges,
  OnChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import Peer from 'peerjs';
import { AuthenticationService } from '../../../common/services/authentication.service';
import { PatientWebRtcService } from '../../services/patient_web_rtc.service';
import { select } from '@angular-redux/store';
import { Observable, Subscription, async } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MESSAGES } from 'src/app/common/services/communication_util.service';
import { AppActions } from '../../../app.actions';
import { WebCamSkeletonService } from 'src/app/common/services/posenet_camera.service';
import { DepthCameraSocketService } from 'src/app/common/services/depth_camera_socket.service';
import { MenuOptionsAppActions } from 'src/app/patient/components/menu-options/menu-options.actions';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import {
  MEDIA_RECORDER_AUDIO_MIME_TYPE,
  MEDIA_RECORDER_AUDIO_BITS_PER_SECOND,
  VIDEO_PATIENT_MESSAGES,
  CHECK_PEER_STATUS_AFTER_ERROR_TIME,
} from 'src/constants';
import { isNil, isBoolean, throttle, set } from 'lodash';
import { setCameraFrameRate } from '../../../common/helpers/webRTC-common-utils';
import { IOrganAngle, IScore } from '../../../../types';
import { IGameAppData } from '../../../../app/app.state';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS, Results } from '@mediapipe/pose';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { SkeltonVideoService } from '../../../common/services/skelton-video.service';
import { SkeletonProgressBarService } from 'src/app/common/services/skeleton-progress-bar.service';

let therapistToPatientConnection = null;
declare var MediaRecorder: any;
@Component({
  selector: 'app-web-rtc-video',
  templateUrl: './web_rtc_video.component.html',
  styleUrls: ['./web_rtc_video.component.scss'],
})
export class WebRTCVideoComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() currentUser;
  @Input() validGames;
  @Input() showLocalVideo;
  @Input() currentGameName;
  @Input() videoSessionDisplay;
  @Input() isMobile;
  @select((state) => state.global.currentGameUrl) readonly currentGameUrl$: Observable<any>;
  @select((state) => state.menu_options.is_in_game) readonly isInGame$: Observable<any>;
  @select((state) => state.global.gameId) readonly gameId$: Observable<any>;
  @select((state) => state.global.bodyTrackingRequired) readonly bodyTrackingRequired$: Observable<boolean>;
  @select((state) => state.global.bodyTrackingAvailable) readonly bodyTrackingAvailable$: Observable<boolean>;
  @select((state) => state.global.sendMediaStreamToIFrameRequest)
  readonly sendMediaStreamToIFrameRequest$: Observable<any>;
  @select((state) => state.global.enlargeVideo) readonly enlargeVideo$: Observable<boolean>;
  @select((state) => state.global.organAngles) readonly organAngles$: Observable<IOrganAngle[]>;
  @select((state) => state.global.currentGameAppData) readonly currentGameAppData$: Observable<IGameAppData>;
  @select((state) => state.global.score) readonly score$: Observable<IScore>;

  @Output() handleNewGameFromTherapist = new EventEmitter();
  @Output() handleFullScreenVideoSession = new EventEmitter();
  @Output() sendCallObjectToParent = new EventEmitter();
  @Output() handleTherapistClickHome = new EventEmitter();
  @Output() handleOtherSideLeftVideoSession = new EventEmitter();
  @Output() handleShareScreen = new EventEmitter();
  ///pose comparision var initialise here ////////////////

  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('cameraElement') cameraElement!: ElementRef;
  @ViewChild('canvasElement1') canvasElement1!: ElementRef;
  @ViewChild('canvasElement2') canvasElement2!: ElementRef;

  //videoElement: HTMLVideoElement | null = null;
  iframeElement: HTMLIFrameElement | null = null;

  private videoPose!: Pose;
  private cameraPose!: Pose;
  private camera!: Camera;
  timeMatching = false;
  lastTimeMatching = false;
  timeLog: any = []
  public cameraAngle: { [key: string]: number } = {
    leftWrist: Infinity,
    rightWrist: Infinity,
  };
  private matchingData: { timestamp: string; wrist: string; status: string }[] = [];
  private matchingCameraData: { timestamp: string; 'LSA Deg': string; 'RSA Deg': string; }[] = [];
  private startTime: number;
  private videoIndex: number;
  private videoSeconds: number = 0;
  private currentVideoIndex: number = 0;
  videoMinMax = [];
  landmarks = [];
  landmarksPointer = [];
  landmarksLinePointer = [];
  rightComment = '';
  leftComment = '';
  rightCondition = '';
  leftCondition = '';
  lastComment = '';
  lastVideoName = '';
  processedTimestamps: Set<string> = new Set();
  receivedRemoteVideo: boolean = false;
  connection: WebSocket;
  mediaStreamConstraints;
  localVideo: any;
  remoteVideo: any;
  localStream: MediaStream;
  therapistCameraStream: MediaStream;
  remoteStream: MediaStream;
  sendChannel;
  receiveChannel;
  patientPeer: any;
  therapistPeer: any;
  patientPeerId: string = '';
  therapistConnection;
  patientConnection;
  iceServerSpecs;
  therapistPing;
  currentGameUrl;
  showPatientVideo = false;
  dialogRef;
  dialogSubscription;
  isInGame;
  subscription: Subscription = new Subscription();
  patientPing;
  currentCall;
  interval;
  ctx;
  therapistBusy = false;
  iceServers;
  isModalOpen = false;
  disconnectionInterval;
  gameId;
  audioTrack;
  audioContext;
  gainNode;
  isTapped = false;
  displaySkeleton = false;
  trackBody = null;
  connectionLost = false;
  bodyTrackingLoading = false;
  userHasCamera = false;
  userHasMicrophone = false;
  connection_error_message = 'Reconnecting Therapist...';
  peerHasErrors = false;
  localVideoForSkeleton;
  isCameraCheckComplete = false;
  NO_CAMERA_MESSAGE_DELAY = 10000;
  isBodyTrackingAvailable = true;
  enlargeVideo = false;
  THERAPIST_REGULAR_VIDEO_CLASS = 'therapist-video-regular-video';
  THERAPIST_ENLARGE_VIDEO_CLASS = 'therapist-video-enlarge-video';
  PATIENT_CAMERA_ERROR = 'Please connect a web camera\nand refresh your browser.';
  organAngles: IOrganAngle[] = [];
  showAngles = false;
  posenetLoadingTimePassed = false;
  POSENET_LOADING_TIME_PASSED_DURATION = 20000;
  loadingBarPercentage = 2;
  skeletonBtn;
  currentGameAppData: IGameAppData;
  searchCameraInterval;
  heygenAPIService: HeygenAPIService

  constructor(
    private authenticationService: AuthenticationService,
    private patientWebRtcService: PatientWebRtcService,
    private appActions: AppActions,
    private menuOptionsActions: MenuOptionsAppActions,
    private depthCameraSocketService: DepthCameraSocketService,
    private webCamSkeletonService: WebCamSkeletonService,
    private ajaxService: AjaxService,
    private cdr: ChangeDetectorRef,
    private skeltonVideoService: SkeltonVideoService,
    private skeltonProgressBarService: SkeletonProgressBarService,
  ) {
    this.subscription.add(
      this.ajaxService.getIceServers().subscribe((res) => {
        this.iceServers = res;
        this.startSession();
      })
    );
    this.subscription.add(
      this.currentGameUrl$.subscribe((currentGame) => {
        this.currentGameUrl = currentGame;
      })
    );
    this.subscription.add(
      this.isInGame$.subscribe((isInGame) => {
        this.isInGame = isInGame;
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send(this.getGameUrlMessage(isInGame));
        }
      })
    );
    this.subscription.add(
      this.gameId$.subscribe((gameId) => {
        this.gameId = gameId;
      })
    );
    this.subscription.add(
      this.bodyTrackingAvailable$.subscribe((isBodyTrackingAvailable) => {
        this.isBodyTrackingAvailable = isBodyTrackingAvailable;
      })
    );

    /* this.skeltonVideoService.iframeUrl$.subscribe((url) => {
       console.log("iframeurl in webrtccomponents123===", url);
       this.iframeUrl = url;
     });
     */

    this.skeltonVideoService.gameVideoElement$.subscribe((iframeaction) => {
      // console.log(" in webrtccomponents iframeaction===", iframeaction);
      if (typeof iframeaction === 'string') {
        this.landmarks = [];
        const action = JSON.parse(iframeaction);
        // console.log("action.msg.data.currentPlayTime.vidTime===", action);
        if (action.msg && action.msg.gameSummaryContent == "Session Ended") {
          // this.heygenAPIService = new HeygenAPIService();
          // this.heygenAPIService.onStart();
          // this.heygenAPIService.sendText("hello");
          this.videoIndex = -1;
          this.videoSeconds = 0;
          const results = this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
          const updateComments = this.updateComments(results);

          this.ajaxService.savePatientMetaData({
            game_id: this.gameId,
            settings: updateComments,
            video_name: this.lastVideoName,
          }).subscribe((gamesettings) => {
            console.log("gamesettings===", gamesettings);
          });
          // this.saveToCSV(updateComments, 'min_max_matches.csv');
          // this.saveToCSV(this.timeLog, 'time_matching.csv');
        }
        if (action.msg && action.msg.data && action.msg.data.shouldPlay) {
          this.videoMinMax = [];
          this.landmarksPointer = [];
          this.landmarksLinePointer = [];
          const videoName = action.msg?.data?.source?.split('/')[4];
          this.ajaxService.getGameMetaData(videoName).subscribe((gamesettings) => {
            if (gamesettings.length > 0) {
              setInterval(() => {
                const results = this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
                const updateComments = this.updateComments(results);
                const mainLength = this.videoMinMax.length;
                const updateLength = updateComments.filter((data) => (data.RightCondition == 'Good' || data.LeftCondition == 'Good') && data.PatientTimestamp != undefined).length;
                const thumbUpLength = updateComments.filter((data) => (data.RightComments == 'Perfect' || data.LeftComments == 'Perfect') && data.PatientTimestamp != undefined).length;
                const percentage = Math.floor((updateLength / mainLength) * 100);
                this.skeltonProgressBarService.setBarElement('' + percentage);
                this.skeltonProgressBarService.setThumbUpElement('' + thumbUpLength);
              }, 5000);
              this.landmarks = gamesettings[0].landmarks;
              this.videoMinMax = gamesettings[0].settings;
              this.landmarksPointer = gamesettings[0].landmarksPointer;
              this.landmarksLinePointer = gamesettings[0].landmarksLinePointer;

              const videoTime = action.msg.data.currentPlayTime.vidTime;
              const currentPlayTime = new Date(action.msg.data.currentPlayTime.sysTime).getSeconds();

              if (this.videoSeconds == 0) {
                this.videoSeconds = currentPlayTime
              }

              if (Math.abs(this.videoSeconds - currentPlayTime) > 1 || videoTime > 0 || action.msg.data.index > 0) {
                this.videoSeconds = currentPlayTime
                this.initializeCameraPoseModels()
                this.heygenAPIService = new HeygenAPIService();
                this.heygenAPIService.onStart();
                this.heygenAPIService.sendText("hello");
                if (!this.startTime) {
                  this.startTime = new Date().getTime(); // Save the initial timestamp
                }

                if (this.videoIndex != action.msg.data.index) {
                  this.videoIndex = action.msg.data.index
                  this.processedTimestamps = new Set();
                  this.startTime = new Date().getTime();
                  this.currentVideoIndex = 0;

                  if (this.videoIndex > 0) {
                    const results = this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
                    const updateComments = this.updateComments(results);
                    this.ajaxService.savePatientMetaData({
                      game_id: this.gameId,
                      settings: updateComments,
                      video_name: this.lastVideoName,
                    }).subscribe((gamesettings) => {
                      console.log("gamesettings===", gamesettings);
                    });
                    // this.saveToCSV(updateComments, 'min_max_matches.csv');
                  }
                  this.lastVideoName = videoName;
                }
              }
            }
          });
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.currentGameName?.currentValue) {
      this.currentGameName = changes.currentGameName.currentValue;
      if (therapistToPatientConnection) {
        therapistToPatientConnection.send({ type: 'update_game_name', gameName: this.currentGameName });
      }
    }
  }

  getGameUrlMessage(isInGame: boolean) {
    return {
      type: 'game_url',
      payload: {
        url: isInGame ? this.currentGameUrl : 'menu-options',
        name: this.currentGameName,
        id: this.gameId,
      },
    };
  }

  async ngOnInit() {
    if (this.isMobile) {
      this.THERAPIST_REGULAR_VIDEO_CLASS = 'therapist-video-regular-video-mobile';
      this.THERAPIST_ENLARGE_VIDEO_CLASS = 'therapist-video-enlarge-video-mobile';
    }
    this.searchCameraInterval = setInterval(async () => {
      this.userHasCamera = await this.hasUserCamera();
      if (this.userHasCamera) {
        this.handleCameraAvailability();
      }
    }, 1000);
    setTimeout(() => {
      if (!this.userHasCamera) {
        this.handleCameraAvailability();
      }
    }, this.NO_CAMERA_MESSAGE_DELAY);

    this.localVideo = document.getElementById('patient-video');

    if (this.showLocalVideo) {
      this.prepareLocalRTCSpecs();
      this.initCanvas(false);
    }
    this.userHasMicrophone = await this.hasUserMicrophone();
    if (!this.userHasMicrophone) {
      this.handleMicNotConnected();
    }
    this.subscription.add(
      this.authenticationService.currentUser.subscribe((currentUser) => {
        if (!currentUser) {
          this.closeLocalVideoStream();
          if (therapistToPatientConnection) {
            therapistToPatientConnection.send({ type: 'hang_up_session', payload: this.currentUser });
          }
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.currentGameState.subscribe((game_state) => {
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send({ type: 'game_state', payload: game_state });
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.skeletonBufferState.subscribe((skeleton_buffer) => {
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send({ type: 'skeleton_buffer', payload: skeleton_buffer });
        }
        if (skeleton_buffer) {
          this.bodyTrackingLoading = false;
        }
        if (
          Object.keys(skeleton_buffer).length > 0 &&
          !this.showPatientVideo &&
          this.depthCameraSocketService.isDepthCameraConnected
        ) {
          this.switchVideoStream(true);
          this.showPatientVideo = true;
        }
      })
    );

    const callback = throttle(this.throttleSkeleton, 100, { trailing: false });
    this.subscription.add(
      this.patientWebRtcService.skeletonBufferFromWebCamState.subscribe((skeleton_buffer) => {
        if (therapistToPatientConnection) {
          callback(skeleton_buffer);
        }
        if (skeleton_buffer) {
          if (this.bodyTrackingLoading) {
            setTimeout(() => {
              this.replaceVideoStream(true);
            }, 200);
          }
          this.bodyTrackingLoading = false;
        }
        if (skeleton_buffer && skeleton_buffer.length > 0 && this.showPatientVideo) {
          this.bodyTrackingLoading = false;
          this.switchVideoStream(false);
          this.showPatientVideo = false;
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.genericMessageFromPatientToTherapist.subscribe((genericMessage) => {
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send({
            type: MESSAGES.GENERIC_MESSAGE,
            payload: genericMessage,
          });
        }
      })
    );

    this.subscription.add(
      this.patientWebRtcService.shouldCloseFullScreenVideoSession.subscribe((stopVideoSession) => {
        if (therapistToPatientConnection) {
          this.replaceVideoStream(true);
          therapistToPatientConnection.send({
            type: MESSAGES.STOP_VIDEO_SESSION,
            payload: stopVideoSession,
          });
        }
      })
    );

    this.subscription.add(
      this.depthCameraSocketService.depthCameraConnected.subscribe((isConnected) => {
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send({
            type: MESSAGES.DEPTH_CAM_CONNECTION,
            payload: isConnected,
          });
        }
      })
    );
    this.subscription.add(
      this.bodyTrackingRequired$.subscribe((bodyTrackingRequired) => {
        if (!this.isBodyTrackingAvailable || !this.posenetLoadingTimePassed) {
          return;
        }

        if (bodyTrackingRequired) {
          if (!this.skeletonBtn.classList.contains('skeleton-border-wrap-active')) {
            this.skeletonBtn.classList.toggle('skeleton-border-wrap-active');
          }
          if (!this.trackBody) {
            this.trackBody = true;
            if (therapistToPatientConnection) {
              therapistToPatientConnection.send({ type: 'track_body', payload: this.trackBody });
            }
            this.bodyTrackingLoading = true;
            this.webCamSkeletonService.bindPage(this.localVideoForSkeleton);
          }
        } else if (!bodyTrackingRequired && this.trackBody) {
          this.toggleTracking();
        }
      })
    );
    const eventName = this.isIosDevice() ? 'pagehide' : 'beforeunload';
    window.addEventListener(eventName, (event) => {
      this.ngOnDestroy();
    });

    this.subscription.add(
      this.sendMediaStreamToIFrameRequest$.pipe(filter((options) => !isNil(options))).subscribe((options) => {
        this.handleSendMediaStreamToIframeRequest(options);
      })
    );

    this.subscription.add(
      this.enlargeVideo$.subscribe((enlargeVideo) => {
        this.enlargeVideo = enlargeVideo;
        this.updateVideosStyles();
      })
    );

    this.subscription.add(
      this.organAngles$.subscribe((organAngles) => {
        this.organAngles = organAngles;
      })
    );

    this.subscription.add(
      this.currentGameAppData$.subscribe((currentGameAppData) => {
        this.currentGameAppData = currentGameAppData;
      })
    );

    this.subscription.add(
      this.score$.subscribe((score) => {
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send({ type: 'update_game_score', score });
        }
      })
    );

    setTimeout(() => {
      this.posenetLoadingTimePassed = true;
      this.trackBody = false;
      this.appActions.setPosenetLoadingTimePassed(true);
      if (therapistToPatientConnection) {
        therapistToPatientConnection.send({ type: 'track_body', payload: this.trackBody });
      }
    }, this.POSENET_LOADING_TIME_PASSED_DURATION);

    // Retrieve the iframe and video elements from the service

    /*this.skeltonVideoService.iframeUrl$.subscribe((url) => {
      console.log("iframeurl in webrtccomponents===", url);
      this.iframeUrl = url;
    });
    */

    // getIframeUrl
    this.skeltonVideoService.gameVideoElement$.subscribe((iframeaction) => {
      // const action = JSON.parse(iframeaction);
      // console.log(" in webrtccomponents iframeaction===", iframeaction);
      // if (action.msg.shouldPlay) {
      //   this.initializePoseModels
      // }
      //this.iframeUrl = action;
    });

  }

  ngAfterViewInit() {
    this.skeletonBtn = document.getElementById('skeleton-border-wrap');
    this.skeletonLoadingBar();

    if (this.currentUser.id == 1802 || this.currentUser.id == 1793) {
      this.initializeCamera();
      this.initializePoseModels();
    }
  }

  handleCameraAvailability() {
    clearInterval(this.searchCameraInterval);
    this.ajaxService.updatePatientCameraAvailability(this.currentUser.patientId, this.userHasCamera);
    this.isCameraCheckComplete = true;
  }

  skeletonLoadingBar = () => {
    if (this.isMobile) {
      return;
    }
    const loadBar = document.getElementById('loadingBar');
    const loadBarWrapper = document.getElementById('loadingBarWrapper');
    const loadingBarInterval = setInterval(() => {
      this.loadingBarPercentage = Math.floor(
        (parseInt(getComputedStyle(loadBar).width) / (parseInt(getComputedStyle(loadBarWrapper).width) * 0.96)) * 100
      );
      if (this.loadingBarPercentage >= 98) {
        clearInterval(loadingBarInterval);
      }
    }, 500);
  };

  throttleSkeleton = (skeleton_buffer) => {
    const data = {
      type: 'skeleton_buffer',
      payload: skeleton_buffer ? new Uint32Array(skeleton_buffer) : undefined,
    };
    if (!this.isInGame) {
      const frame = document.getElementById(`camera-container-${this.currentUser.peerId}`);
      const leftHand = frame.children[1] as HTMLVideoElement;
      const rightHand = frame.children[2] as HTMLVideoElement;
      data['skeletonTrackingData'] = {
        frame: { width: frame.offsetWidth, height: frame.offsetHeight },
        hands: {
          l_x: leftHand.offsetLeft,
          l_y: leftHand.offsetTop,
          r_x: rightHand.offsetLeft,
          r_y: rightHand.offsetTop,
        },
      };
    }
    therapistToPatientConnection.send(data);
  };

  /*isIosDevice = () => {
    return ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
  };
  */

  isIosDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  isBodyTrackingReady = () => {
    return this.isBodyTrackingAvailable && this.webCamSkeletonService.modelInitialized && this.posenetLoadingTimePassed;
  };

  initCanvas = (isDepth) => {
    let options = {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
      mimeType: 'video/webm;codecs=vp8',
    };
    let canv;
    canv = document.getElementById('patient-canvas') as HTMLCanvasElement;

    // below are the code for make the IPAD compatibility Mime Type 

    if (canv && canv.getContext) {
      const context = canv.getContext('2d');
      if (!context) {
        console.error('Canvas 2D context is not available.');
      }
    } else {
      console.error('Canvas is not supported.');
    }
    const mimeTypes: string[] = [
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm;codecs=h264',
      'video/mp4'
    ];

    // below function to check dynamically supported mime type 
    function getSupportedMimeType(): string | null {
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          return mimeType;
        }
      }
      return null; // No supported MIME type found
    }
    // Selection of mime type 
    const supportedMimeType = getSupportedMimeType();
    if (supportedMimeType) {
      options.mimeType = supportedMimeType;
      console.log(`Selected MIME type: ${supportedMimeType}`);
    } else {
      console.error('No supported MIME type found for MediaRecorder.');
    }

    this.localStream = canv.captureStream(60);
    const mediaRecorder = new MediaRecorder(this.localStream, options);
    mediaRecorder.start();
    this.localStream = mediaRecorder.stream;
    // add an audio track to the local stream
    navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
      // possible to use this.mediaStremConstraints
      const audioTracks = stream.getAudioTracks();
      this.localStream.addTrack(audioTracks[0]); // add an audio track to the local stream?\
      if (this.localStream.getAudioTracks()[0].muted) {
        this.handleMicMute();
      }
      this.monitorMicAudio();
    });
  };

  switchVideoStream(isDepth) {
    this.closeLocalVideoStream();
    if (isDepth) {
      this.webCamSkeletonService.stopPage();
    }
    this.initCanvas(isDepth);
    this.localVideo = document.getElementById('patient-video');
    this.localVideo.srcObject = this.localStream;
    this.localVideo.muted = true;
    this.localVideo.onloadeddata = (e) => {
      this.localVideo.play();
    };
  }

  closeLocalVideoStream() {
    if (this.localVideo && this.localVideo.srcObject) {
      this.localVideo.srcObject.getTracks().forEach((track) => track.stop());
      this.localVideo.srcObject = null;
    }
  }

  arrayRotate = (arr, reverse) => {
    if (reverse) arr.unshift(arr.pop());
    else arr.push(arr.shift());
    return arr;
  };

  gotRemoteMediaStream = (mediaStream) => {
    let mediaStreamVideoTracks = mediaStream.getVideoTracks();
    const audioTrack = mediaStream.getAudioTracks()[0];
    let trackIsReady = false;
    if (this.isIosDevice()) {
      setTimeout(() => {
        const timer = setInterval(() => {
          if (mediaStreamVideoTracks.find((track) => track.getSettings().width !== 0)) {
            this.handleStreamReady(mediaStreamVideoTracks, mediaStream);
            clearInterval(timer);
          }
        }, 500);
      }, 2000);
    } else {
      const videoWrapper = document.getElementById('remoteVideo');
      if (this.remoteVideo && videoWrapper) {
        videoWrapper.removeChild(this.remoteVideo);
        this.remoteVideo = null;
      }
      this.remoteVideo = document.createElement('video');
      if (videoWrapper) {
        videoWrapper.appendChild(this.remoteVideo);
      }
      let stream = new MediaStream();
      this.remoteVideo.onloadeddata = (e) => {
        this.remoteVideo.play();
      };
      if ('srcObject' in this.remoteVideo) {
        this.remoteVideo.srcObject = stream;
      } else if (navigator['mozGetUserMedia']) {
        (this.remoteVideo as any).mozSrcObject = stream;
      } else {
        (this.remoteVideo as any).src = (window.URL || window.webkitURL).createObjectURL(stream);
      }

      this.remoteVideo.id = 'therapist-video';
      this.remoteVideo.setAttribute('playsinline', 'true');
      this.remoteVideo.setAttribute('autoplay', 'true');
      this.remoteVideo.classList.add('therapist-video');
      this.remoteVideo.classList.add(this.THERAPIST_REGULAR_VIDEO_CLASS);
      this.handleRemoteVideoClasses();

      stream.addTrack(mediaStreamVideoTracks[0]);
      stream.addTrack(mediaStream.getAudioTracks()[0]);
    }
  };

  handleStreamReady = (mediaStreamVideoTracks, mediaStream) => {
    if (mediaStreamVideoTracks[1].getSettings().width !== 0) {
      mediaStreamVideoTracks = this.arrayRotate(mediaStreamVideoTracks, true);
    }
    let stream = new MediaStream();
    stream.addTrack(mediaStreamVideoTracks[0]);
    stream.addTrack(mediaStream.getAudioTracks()[0]);
    const videoWrapper = document.getElementById('remoteVideo');
    if (this.remoteVideo && videoWrapper) {
      videoWrapper.removeChild(this.remoteVideo);
      this.remoteVideo = null;
    }
    this.remoteVideo = document.createElement('video');
    if (videoWrapper) {
      videoWrapper.appendChild(this.remoteVideo);
    }

    if ('srcObject' in this.remoteVideo) {
      this.remoteVideo.srcObject = stream;
    } else if (navigator['mozGetUserMedia']) {
      (this.remoteVideo as any).mozSrcObject = stream;
    } else {
      (this.remoteVideo as any).src = (window.URL || window.webkitURL).createObjectURL(stream);
    }

    this.remoteVideo.id = 'therapist-video';
    this.remoteVideo.setAttribute('playsinline', 'true');
    this.remoteVideo.setAttribute('autoplay', 'true');
    this.remoteVideo.classList.add('therapist-video');
    this.remoteVideo.classList.add(this.THERAPIST_REGULAR_VIDEO_CLASS);
    this.handleRemoteVideoClasses();
    this.remoteVideo.onloadeddata = (e) => {
      this.remoteVideo.play();
      setTimeout(() => {
        this.remoteVideo.pause();
        this.remoteVideo.play();
      }, 1000);
    };
  };

  handleRemoteVideoClasses = () => {
    if (this.remoteVideo) {
      if (this.receivedRemoteVideo) {
        this.remoteVideo.classList.remove('hide-video');
      } else {
        this.remoteVideo.classList.add('hide-video');
      }
      if (this.therapistBusy) {
        this.remoteVideo.classList.remove('active');
        this.remoteVideo.classList.add('not-active');
      } else {
        this.remoteVideo.classList.remove('not-active');
        this.remoteVideo.classList.add('active');
      }
      if (this.showLocalVideo) {
        this.remoteVideo.classList.remove('mobile-view');
      } else {
        this.remoteVideo.classList.add('mobile-view');
      }
    }
  };

  hasUserMedia() {
    return navigator.getUserMedia;
  }

  isDepthCameraConnected = () => {
    return this.depthCameraSocketService.isDepthCameraConnected;
  };

  prepareLocalRTCSpecs = async () => {
    if (this.hasUserMedia()) {
      this.mediaStreamConstraints = {
        video: true,
        audio: true,
      };
      await navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints).then(
        (stream) => {
          setCameraFrameRate(stream);

          if (!this.localVideo) {
            this.localVideo = document.getElementById('patient-video');
          }
          if (!this.localVideoForSkeleton) {
            this.localVideoForSkeleton = document.getElementById('patient-video-skeleton');
          }
          if (!this.showLocalVideo) {
            this.localStream = stream;
          }
          this.localVideo.onloadeddata = (e) => {
            this.localVideo.play();
            if (this.isBodyTrackingAvailable) {
              this.webCamSkeletonService.bindPage(this.localVideoForSkeleton, true);
            }
          };
          this.localVideo.srcObject = stream;
          this.localVideoForSkeleton.srcObject = stream;
          this.localVideo.muted = true;
          this.localVideoForSkeleton.muted = true;
          return this.localVideo.srcObject;
        },
        (err) => {
          console.warn('error displaying webrtc: ', err);
        }
      );
    } else {
      alert('WebRTC is not supported');
    }
  };

  handleMessage(data) {
    switch (data.type) {
      case 'send_patients_game':
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send({ type: 'patients_game', payload: this.validGames });
        }
        break;
      case 'send_game_url':
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send(this.getGameUrlMessage(this.isInGame));
        }
        break;
      case 'set_game_url':
        this.handleNewGameFromTherapist.emit(data.url);
        break;
      case 'enter_full_screen_video_session':
        this.patientWebRtcService.setShouldPauseGameState(true);
        this.appActions.toggleBodyTracking(false);
        this.handleFullScreenVideoSession.emit();
        break;
      case MESSAGES.STATE:
        this.patientWebRtcService.setCurrentGameStateFromTherapist(data.msg);
        break;
      case MESSAGES.NEW_SETTINGS:
        this.patientWebRtcService.setCurrentNewSettings(data.msg);
        break;
      case MESSAGES.GENERIC_MESSAGE:
        this.patientWebRtcService.setCurrentGenericMessageFromTherapistToPatient(data.msg);
        if ('score' in data.msg) {
          therapistToPatientConnection.send({ type: MESSAGES.APP_GAME_DATA, payload: data.msg.score });
        }
        break;
      case MESSAGES.QUIT_GAME_FROM_THERAPIST:
        this.patientWebRtcService.setQuitGameFromTherapistToPatient(data.msg);
        break;
      case MESSAGES.RESTART_GAME:
        this.patientWebRtcService.setRestartGameFromTherapistToPatient(data.msg);
        break;
      case 'therapist_left_video_session':
        this.patientWebRtcService.setShouldPauseGameState(false);
        this.handleOtherSideLeftVideoSession.emit();
        this.replaceVideoStream(false);
        break;
      case 'set_busy_therapist':
        this.therapistBusy = data.msg;
        this.handleRemoteVideoClasses();
        break;
      case 'hang_up_session':
        this.patientWebRtcService.setCurrentGenericMessageFromTherapistToPatient({ type: 'therapist_left_session' });
        this.receivedRemoteVideo = false;
        this.connectionLost = false;
        this.handleRemoveTherapistVideo();
        this.menuOptionsActions.setOnTherapistSession(false);
        if (this.currentCall) {
          this.currentCall.close();
          this.currentCall = null;
        }
        if (therapistToPatientConnection) {
          therapistToPatientConnection.close();
          therapistToPatientConnection = null;
        }
        if (this.enlargeVideo) {
          this.appActions.toggleEnlargeVideo(false);
        }
        break;
      case 'screen_share_started':
        this.handleShareScreen.emit(true);
        break;
      case 'screen_share_stopped':
        this.handleShareScreen.emit(false);
        break;
      case 'track_body':
        if (this.showLocalVideo) {
          this.handleBodyTracking();
        }
        break;
      case 'send_initial_status':
        this.sendInitialTrackingStatusToTherapist();
        break;
      case 'mute_game_sound':
        this.patientWebRtcService.setMuteGameSoundFromTherapistToPatient(data.muteGameSound);
        break;
      case 'mirror_full_screen_video':
        this.patientWebRtcService.setMirrorFullScreenVideoTherapistToPatient(data.msg);
        break;
      case MESSAGES.ENLARGE_VIDEO:
        this.appActions.toggleEnlargeVideo(data.enlargeVideo);
        break;
      case MESSAGES.REDIRECT_TO_HOME:
        console.log("========MESSAGES.REDIRECT_TO_HOME=====", MESSAGES.REDIRECT_TO_HOME);
        this.redirectToHome();
        break;
      case MESSAGES.REQUEST_APP_GAME_DATA:
        this.handleRequestAppGameData();
        break;
      default:
        break;
    }
  }

  redirectToHome() {
    this.handleTherapistClickHome.emit();
  }

  handleRequestAppGameData = () => {
    if (therapistToPatientConnection) {
      therapistToPatientConnection.send({ type: MESSAGES.APP_GAME_DATA, payload: this.currentGameAppData });
    }
  };

  handleSendMediaStreamToIframeRequest = async (options) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
      },
    });

    const mediaRecorderOptions = {
      audioBitsPerSecond: MEDIA_RECORDER_AUDIO_BITS_PER_SECOND,
      mimeType: MEDIA_RECORDER_AUDIO_MIME_TYPE,
    };

    options.mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
    this.appActions.setMediaStreamToIFrameSettings(options);
  };

  handleRemoveTherapistVideo = () => {
    const videoWrapper = document.getElementById('remoteVideo');
    if (this.remoteVideo && videoWrapper && this.remoteVideo.srcObject) {
      videoWrapper.removeChild(this.remoteVideo);
      this.remoteVideo.srcObject.getTracks().forEach(function (track) {
        track.stop();
      });
      this.remoteVideo = null;
    }
  };

  startSession() {
    this.patientPeer = new Peer(this.currentUser.peerId, {
      host: environment.signalingServer,
      port: environment.signalingServerPort,
      path: `/api`,
      debug: 3,
      key: environment.secretKey,
      config: {
        iceServers: [...this.iceServers.iceServers],
        iceTransportPolicy: this.iceServers.onlyTcp ? 'relay' : 'all',
      },
      secure: true,
    });
    this.patientPeer.on('open', (id) => {
      this.peerHasErrors = false;
    });
    this.patientPeer.on('error', (err) => {
      // console.warn('therapist peer error' + err);
      if (err.message && err.message.includes('Lost connection to server')) {
        if (!this.peerHasErrors) {
          this.peerHasErrors = true;
          setTimeout(this.checkPeerStatusAndHandlePeerError, CHECK_PEER_STATUS_AFTER_ERROR_TIME);
        }
      } else if (err.message.includes('taken')) {
        this.ajaxService.disconnectConnectedPeers(this.currentUser.peerId);
        setTimeout(() => {
          this.startSession();
        }, 2000);
      }
    });

    this.patientPeer.on('connection', (connection) => {
      this.peerHasErrors = false;
      therapistToPatientConnection = connection;
      // Use the handleMessage to callback when a message comes in
      therapistToPatientConnection.on('open', () => {
        therapistToPatientConnection.on('data', (data) => {
          this.handleMessage(data);
        });
        therapistToPatientConnection.on('close', () => {
          if (therapistToPatientConnection) {
            therapistToPatientConnection.close();
            therapistToPatientConnection = null;
          }
        });
        therapistToPatientConnection.on('error', (err) => {
          console.warn('error: ' + err);
          if (err.message && !err.message.includes('disconnected')) {
            if (therapistToPatientConnection) {
              therapistToPatientConnection.close();
              therapistToPatientConnection = null;
            }
          }
        });
      });
    });

    this.patientPeer.on('call', (call) => {
      this.currentCall = call;
      this.sendCallObjectToParent.emit(call);
      this.handleMicUnmute();
      this.patientWebRtcService.setShouldPauseGameState(true);
      setTimeout(() => {
        this.openModal(`New video call incoming from ${call.metadata}`, call);
      }, 0);
    });
    this.patientPing = setInterval(() => {
      this.patientPeer.socket._sendHeartbeat();
    }, 30 * 1000);
    this.patientPeer.on('close', () => {
      clearInterval(this.patientPing);
    });
    this.patientPeer.on('kill_connection', (msg) => {
      this.patientPeer.destroy();
    });
    const self = this;
    this.patientPeer.on('disconnected', () => {
      const interval = setInterval(async () => {
        if (self.patientPeer.open === true || self.patientPeer.destroyed === true) {
          clearInterval(interval);
        } else {
          const isAuthenticateResult = await this.ajaxService.checkIsAuthenticate().toPromise();
          if (!isAuthenticateResult || !isAuthenticateResult.isAuthenticated) {
            clearInterval(interval);
            return;
          }
          if (self.patientPeer.reconnect()) {
            this.peerHasErrors = false;
            console.log('connection established after reconnection');
          } else {
            console.log('trying to reconnect');
          }
        }
      }, 1000);
    });
  }

  checkPeerStatusAndHandlePeerError = () => {
    if (this.peerHasErrors) {
      this.handleConnetionErrorToSignalingServer();
    }
  };

  handleConnetionErrorToSignalingServer = () => {
    console.error('LOST CONNECTION TO SYSTEM');
  };

  handleLogout = () => {
    this.authenticationService.logout();

    this.appActions.openCallModal(
      {
        panelClass: 'generic-dialog-container',
        header: 'USER RECONNECTED',
        content: 'Session terminated due to connecting in another machine or session timed out',
        acceptBtnImg: '../../../assets/buttons/btn_decline.png',
        acceptBtnImgHover: '../../../assets/buttons/btn_decline_hover.png',
        timeout: 5,
        approveCallback: async () => { },
        declineCallback: async () => { },
      },
      false
    );
  };
  openModal = (content, call) => {
    const modalClass = !this.showLocalVideo ? 'mobile-view' : 'generic-dialog-container';
    this.appActions.openCallModal({
      panelClass: modalClass,
      header: 'CONNECTION REQUEST',
      content,
      acceptBtnImg: '../../../assets/modal/btn_hover_request_timer.png',
      acceptBtnImgHover: '../../../assets/modal/btn_accept_hover.png',
      approveCallback: () => this.approveCallback(call),
      declineCallback: () => this.declineCallback(),
    });
  };

  approveCallback = async (call) => {
    this.appActions.closeModal();
    this.patientWebRtcService.setShouldPauseGameState(false);
    const outgoingStream = await this.getLocalStream();
    if (outgoingStream) {
      call.answer(outgoingStream);
      if (this.isIosDevice()) {
        call.peerConnection.addEventListener('track', (event) => {
          // other pc track
          if (!this.receivedRemoteVideo) {
            this.receivedRemoteVideo = true;
            this.menuOptionsActions.setOnTherapistSession(true);
            this.gotRemoteMediaStream(event.streams[0]);
          }
        });
      } else {
        call.on('stream', (stream) => {
          if (!this.receivedRemoteVideo) {
            this.receivedRemoteVideo = true;
            this.menuOptionsActions.setOnTherapistSession(true);
            this.gotRemoteMediaStream(stream);
            if (this.trackBody) {
              this.replaceVideoStream(true);
            }
          }
        });
      }
      call.on('close', () => {
        this.patientWebRtcService.setCurrentGenericMessageFromTherapistToPatient({ type: 'therapist_left_session' });
        this.receivedRemoteVideo = false;
        this.connectionLost = false;
        this.handleRemoveTherapistVideo();
        this.menuOptionsActions.setOnTherapistSession(false);
        if (this.currentCall) {
          this.currentCall.close();
          this.currentCall = null;
        }
        if (therapistToPatientConnection) {
          therapistToPatientConnection.close();
          therapistToPatientConnection = null;
        }
      });
      call.on('error', (e) => {
        if (!e.message) {
          this.patientWebRtcService.setCurrentGenericMessageFromTherapistToPatient({ type: 'therapist_left_session' });
          this.receivedRemoteVideo = false;
          this.connectionLost = false;
          this.handleRemoteVideoClasses();
          this.handleRemoveTherapistVideo();
          this.menuOptionsActions.setOnTherapistSession(false);
          if (this.currentCall) {
            this.currentCall.close();
            this.currentCall = null;
          }
          if (therapistToPatientConnection) {
            therapistToPatientConnection.close();
            therapistToPatientConnection = null;
          }
        } else if (e.message.includes('disconnected')) {
          this.disconnectionInterval = setInterval(() => {
            this.connectionLost = true;
            this.therapistBusy = false;
            if (!call.peerConnection || call.peerConnection.connectionState === 'failed') {
              this.patientWebRtcService.setCurrentGenericMessageFromTherapistToPatient({
                type: 'therapist_left_session',
              });
              this.receivedRemoteVideo = false;
              this.connectionLost = false;
              this.handleRemoteVideoClasses();
              this.handleRemoveTherapistVideo();
              this.menuOptionsActions.setOnTherapistSession(false);
              if (this.currentCall) {
                this.currentCall.close();
                this.currentCall = null;
              }
              if (therapistToPatientConnection) {
                therapistToPatientConnection.close();
                therapistToPatientConnection = null;
              }

              clearInterval(this.disconnectionInterval);
            } else if (
              call.peerConnection &&
              call.peerConnection.connectionState !== 'disconnected' &&
              call.peerConnection.connectionState !== 'failed'
            ) {
              this.connectionLost = false;
              this.patientWebRtcService.setRecoverdFromNetworkError(true);
              clearInterval(this.disconnectionInterval);
            }
          }, 1000);
        }
      });
    }
  };

  getLocalStream = async () => {
    if (!this.showLocalVideo && !this.localStream) {
      await this.prepareLocalRTCSpecs();
      if (this.currentUser.disabledSkeleton) {
        return this.localStream;
      }
    } else if (!this.showLocalVideo) {
      if (this.currentUser.disabledSkeleton) {
        return this.localStream;
      }
    } else {
      let options = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
        mimeType: 'video/webm;codecs=vp8',
      };

      let canv;


      if (this.depthCameraSocketService.isDepthCameraConnected) {
        canv = document.getElementById('patient-canvas-skeleton') as HTMLCanvasElement;
      } else if (this.currentUser.disabledSkeleton) {
        return this.localVideo.srcObject;
      } else if (!this.depthCameraSocketService.isDepthCameraConnected) {
        return this.localStream;
      }

      // below are the code for make the IPAD compatibility Mime Type 

      if (canv && canv.getContext) {
        const context = canv.getContext('2d');
        if (!context) {
          console.error('Canvas 2D context is not available.');
        }
      } else {
        console.error('Canvas is not supported.');
      }
      const mimeTypes: string[] = [
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm;codecs=h264',
        'video/mp4'
      ];

      // below function to check dynamically supported mime type 
      function getSupportedMimeType(): string | null {
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
          }
        }
        return null; // No supported MIME type found
      }
      // Selection of mime type 
      const supportedMimeType = getSupportedMimeType();
      if (supportedMimeType) {
        options.mimeType = supportedMimeType;
        console.log(`Selected MIME type: ${supportedMimeType}`);
      } else {
        console.error('No supported MIME type found for MediaRecorder.');
      }

      let outgoingStream = canv.captureStream(60);
      const mediaRecorder = new MediaRecorder(outgoingStream, options);
      mediaRecorder.start();
      outgoingStream = mediaRecorder.stream;
      if (this.localVideo.srcObject) {
        const source = this.localVideo.srcObject.clone();
        const audioTrack = source.getAudioTracks()[0];
        audioTrack.enabled = true;
        outgoingStream.addTrack(audioTrack);
      }
      return outgoingStream;
    }
  };

  declineCallback = () => {
    this.patientWebRtcService.setShouldPauseGameState(false);
    this.appActions.closeModal();
  };

  handleBodyTracking = () => {
    if (!this.isBodyTrackingAvailable) {
      return;
    }

    if (this.isBodyTrackingReady()) {
      this.appActions.toggleBodyTracking(!this.trackBody);
    }
  };

  toggleTracking = () => {
    this.trackBody = !this.trackBody;
    if (therapistToPatientConnection) {
      therapistToPatientConnection.send({ type: 'track_body', payload: this.trackBody });
    }
    this.trackBody ? this.handlePosenetLoad() : this.handlePosenetClose();
  };

  handlePosenetClose = () => {
    this.webCamSkeletonService.stopPage();
    this.replaceVideoStream(false);
  };

  handlePosenetLoad = () => {
    if (!this.isBodyTrackingAvailable) {
      return;
    }

    this.bodyTrackingLoading = true;
    this.webCamSkeletonService.bindPage(this.localVideoForSkeleton);
    this.replaceVideoStream(true);
  };

  sendInitialTrackingStatusToTherapist = () => {
    if (!therapistToPatientConnection) {
      return;
    }

    if (this.isBodyTrackingAvailable) {
      therapistToPatientConnection.send({ type: 'track_body', payload: this.trackBody });
    } else {
      therapistToPatientConnection.send({ type: 'body_tracking_unavailable' });
    }
  };

  getTrackingStatus = () => {
    return this.trackBody ? 'Stop' + '\n' + 'Tracking' : 'Start' + '\n' + 'Tracking';
  };

  toggleSkeletonView = () => {
    this.displaySkeleton = !this.displaySkeleton;
  };

  getSkeletonStatus = () => {
    return this.displaySkeleton ? 'Hide' + '\n' + 'Skeleton' : 'Show' + '\n' + 'Skeleton';
  };

  hasUserCamera = async (): Promise<boolean> => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoStream) {
        const cameras = videoStream.getVideoTracks();
        return cameras.length > 0;
      }
      return false;
    } catch (err) {
      console.log('NO CAMERA DETECTED ', err);
      return false;
    }
  };

  hasUserMicrophone = async (): Promise<boolean> => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (audioStream) {
        const audio = audioStream.getAudioTracks();
        return audio.length > 0;
      }
      return false;
    } catch (err) {
      console.log('NO MICROPHONE DETECTED ', err);
      return false;
    }
  };

  replaceVideoStream = (showSkeleton) => {
    return; // Temporary untill solving the issue of media pipe stream not reaching therapist in some cases
    if (this.currentCall && this.currentCall.peerConnection) {
      let videoTrack;
      const sender = this.currentCall.peerConnection.getSenders().find(function (s) {
        return s.track.kind === 'video';
      });
      if (!this.depthCameraSocketService.isDepthCameraConnected) {
        if (!showSkeleton && sender && this.localVideo.srcObject) {
          videoTrack = this.localVideo.srcObject.getVideoTracks()[0];
        } else if (sender && this.localStream) {
          videoTrack = this.localStream.getVideoTracks()[0];
        }
      } else {
        if (sender && this.localVideo.srcObject) {
          videoTrack = this.localVideo.srcObject.getVideoTracks()[0];
        } else if (sender) {
          this.getLocalStream().then((stream) => (videoTrack = stream.getVideoTracks()[0]));
        }
      }
      sender.replaceTrack(videoTrack);
    }
  };

  monitorMicAudio = () => {
    this.localStream.getAudioTracks()[0].onmute = (evt) => {
      if (!this.receivedRemoteVideo) {
        this.handleMicMute();
      }
    };
    this.localStream.getAudioTracks()[0].onunmute = (evt) => {
      if (!this.receivedRemoteVideo) {
        this.handleMicUnmute();
      }
    };
  };

  handleMicMute = () => {
    if (!this.isModalOpen) {
      this.isModalOpen = true;
      this.appActions.openMutedMicModal({
        header: VIDEO_PATIENT_MESSAGES.muted_mic_header,
        content: VIDEO_PATIENT_MESSAGES.muted_mic_message,
        acceptBtnImg: '../../../assets/modal/btn_hover_request_timer.png',
        acceptBtnImgHover: '../../../assets/modal/btn_accept_hover.png',
        approveCallback: () => { },
        declineCallback: () => { },
      });
    }
  };

  handleMicUnmute = () => {
    if (this.isModalOpen) {
      this.isModalOpen = false;
      this.appActions.closeMutedMicModal();
    }
  };

  handleMicNotConnected = () => {
    if (!this.isModalOpen) {
      this.isModalOpen = true;
      this.appActions.openPatientGeneralModal({
        panelClass: 'generic-dialog-container',
        header: VIDEO_PATIENT_MESSAGES.no_mic_connection_header,
        content: VIDEO_PATIENT_MESSAGES.no_mic_connection_message,
        acceptBtnImg: '../../../assets/modal/btn_hover_request_timer.png',
        acceptBtnImgHover: '../../../assets/modal/btn_accept_hover.png',
        approveCallback: () => { },
        declineCallback: () => { },
        timeout: 30000,
      });
    }
  };

  updateVideosStyles = () => {
    if (!this.remoteVideo) {
      return;
    }
    this.remoteVideo.classList.remove(
      this.enlargeVideo ? this.THERAPIST_REGULAR_VIDEO_CLASS : this.THERAPIST_ENLARGE_VIDEO_CLASS
    );
    this.remoteVideo.classList.add(
      this.enlargeVideo ? this.THERAPIST_ENLARGE_VIDEO_CLASS : this.THERAPIST_REGULAR_VIDEO_CLASS
    );
  };

  getSkeletonTitle = (): string => {
    if (!this.isBodyTrackingAvailable) {
      return '';
    }
    return this.trackBody ? 'Disable markers' : 'Enable markers';
  };

  ngOnDestroy() {
    if (!this.isMobile) {
      this.webCamSkeletonService.stopPage();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.subscription.unsubscribe();
    this.patientPeer.destroy();
  }

  matchClipAndPatientData(matchingClipData: any[], matchingPatientData: any[]) {
    const results = [];
    const timeThreshold = 2; // Time difference threshold (seconds)
    const angleThreshold = 5; // Angle difference threshold

    // Loop through clip and patient data to find matches
    matchingClipData.forEach((clipEntry) => {
      const closestPatient = matchingPatientData.reduce(
        (closest, patientEntry) => {
          const timeDiff = Math.abs(+clipEntry.ClipTimestamp - +patientEntry.timestamp);
          const angleLeftDiff = Math.abs(clipEntry.ClipDeg - patientEntry['LSA Deg']);
          const angleRightDiff = Math.abs(clipEntry.ClipDeg - patientEntry['RSA Deg']);

          if (timeDiff <= timeThreshold) {
            if (!closest || angleRightDiff < closest.angleRightDiff || angleLeftDiff < closest.angleLeftDiff || ((angleRightDiff === closest.angleRightDiff || angleLeftDiff === closest.angleLeftDiff) && timeDiff < closest.timeDiff)) {
              return { patientEntry, timeDiff, angleRightDiff, angleLeftDiff };
            }
          }
          return closest;
        },
        null
      );

      const isRightGood =
        closestPatient &&
        closestPatient.timeDiff <= timeThreshold &&
        closestPatient.angleRightDiff <= angleThreshold;

      const isLeftGood =
        closestPatient &&
        closestPatient.timeDiff <= timeThreshold &&
        closestPatient.angleLeftDiff <= angleThreshold;

      // Store the comparison data
      results.push({
        "ClipValue": clipEntry.ClipValue,
        "PatientValue": clipEntry.ClipValue,
        "ClipDeg": clipEntry.ClipDeg,
        PatientLeftDeg: closestPatient?.patientEntry['LSA Deg'],
        PatientRightDeg: closestPatient?.patientEntry['RSA Deg'],
        ClipTimestamp: clipEntry.ClipTimestamp,
        PatientTimestamp: closestPatient?.patientEntry.timestamp,
        LeftComments: isLeftGood ? "Good" : "Not Good",
        RightComments: isRightGood ? "Good" : "Not Good",
        LeftCondition: isLeftGood ? "Good" : "Not Good",
        RightCondition: isRightGood ? "Good" : "Not Good",
      });
    });

    return results;
  }

  updateComments(matchingData: any[]) {
    const timestampThreshold = 2; // Difference in seconds
    const angleThreshold = 3; // Difference in degrees

    matchingData.forEach((entry) => {
      const timestampDiff = Math.abs(+entry.ClipTimestamp - +entry.PatientTimestamp);
      const angleLeftDiff = +entry.ClipDeg - +entry.PatientLeftDeg;
      const angleRightDiff = +entry.ClipDeg - +entry.PatientRightDeg;

      if (timestampDiff > timestampThreshold && Math.abs(angleRightDiff) <= angleThreshold) {
        entry.RightComments = "Faster";
      } else if (angleRightDiff > angleThreshold) {
        entry.RightComments = "Higher";
      } else if (angleRightDiff < -angleThreshold) {
        entry.RightComments = "Lower";
      } else {
        entry.RightCondition = "Good";
        if (Math.abs(angleRightDiff) <= 2) {
          entry.RightComments = "Perfect";
        } else if (Math.abs(angleRightDiff) <= 4) {
          entry.RightComments = "Nice";
        } else {
          entry.RightComments = "Great";
        }
      }

      if (timestampDiff > timestampThreshold && Math.abs(angleLeftDiff) <= angleThreshold) {
        entry.LeftComments = "Faster";
      } else if (angleLeftDiff > angleThreshold) {
        entry.LeftComments = "Higher";
      } else if (angleLeftDiff < -angleThreshold) {
        entry.LeftComments = "Lower";
      } else {
        entry.LeftCondition = "Good";
        if (Math.abs(angleLeftDiff) <= 2) {
          entry.LeftComments = "Perfect";
        } else if (Math.abs(angleLeftDiff) <= 4) {
          entry.LeftComments = "Nice";
        } else {
          entry.LeftComments = "Great";
        }
      }
    });

    return matchingData;
  }

  /////// pose detection code start from here //////////////////

  private recordMatch(angle: number, wrist: string, status: string, angleType: 'min' | 'max' | '90-degree') {
    // Retrieve existing data from localStorage
    const timestamp = new Date().toISOString();
    const currentTimestamp = new Date().getTime();
    let existingData = JSON.parse(localStorage.getItem('matchingData') || '[]');

    // Check if there's already an entry for the given wrist and angleType
    const existingEntry = existingData.find(
      (entry: any) => {
        const entryTimestamp = new Date(entry.timestamp).getTime();
        return (
          Math.abs(entryTimestamp - currentTimestamp) <= 2000 &&
          entry.wrist === wrist &&
          entry.angleType === angleType
        );
      }
    );

    if (!existingEntry) {
      // Save the new match only if it hasn't been saved yet
      const newEntry = { timestamp, wrist, status, angleType, angle };
      existingData.push(newEntry);

      // Save updated data back to localStorage
      localStorage.setItem('matchingData', JSON.stringify(existingData));
    }

    if (angleType === '90-degree' && Math.abs(angle - 90) <= 1) { // ±1 degree tolerance
      const ninetyDegreeEntry = existingData.find(
        (entry: any) => {
          const entryTimestamp = new Date(entry.timestamp).getTime();
          return (
            Math.abs(entryTimestamp - currentTimestamp) <= 2000 &&
            entry.wrist === wrist &&
            entry.angleType === angleType
          );
        }
      );

      if (!ninetyDegreeEntry) {
        const timestamp = new Date().toISOString();
        const newEntry = { timestamp, wrist, status, angleType, angle };
        existingData.push(newEntry);

        // Save updated data back to localStorage
        localStorage.setItem('matchingData', JSON.stringify(existingData));
      }
    }
  }

  private manage90DegreeCount(wrist: string, angle: number, threshold: number = 90) {
    // Retrieve existing data from localStorage
    let data = JSON.parse(localStorage.getItem('matchingData') || '{}');

    if (!data[wrist]) {
      data[wrist] = { count90: 0 };
    }

    // Check if the angle is close to 90 degrees (within a small tolerance)
    if (Math.abs(angle - threshold) <= 1) {
      data[wrist].count90 += 1;
    }

    // Save updated data back to localStorage
    localStorage.setItem('matchingData', JSON.stringify(data));
  }

  // Example: Retrieve and use stored data
  private getStoredData(): any[] {
    return JSON.parse(localStorage.getItem('matchingData') || '[]');
  }

  private saveToCSV(matchingData: any[], csvName: string) {
    const csv = Papa.unparse(matchingData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = csvName;
    link.click();
  }

  private initializePoseModels() {
    // this.videoPose = new Pose({
    //   locateFile: (file) =>
    //     `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    // });
    this.cameraPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    const poseOptions: any = {
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    // this.videoPose.setOptions(poseOptions);
    this.cameraPose.setOptions(poseOptions);

    // this.videoPose.onResults((results: Results) => {
    //   this.onPoseVideoResults(results, this.canvasElement1.nativeElement);
    // });
    this.cameraPose.onResults((results: Results) => {
      this.onPoseCameraResults(false, results, this.canvasElement2.nativeElement);
    });

    // this.videoElement.nativeElement.onloadeddata = () => {
    //   this.processVideoFrames();
    // };
  }

  private initializeCameraPoseModels() {
    // this.videoPose = new Pose({
    //   locateFile: (file) =>
    //     `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    // });
    this.cameraPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    const poseOptions: any = {
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    // this.videoPose.setOptions(poseOptions);
    this.cameraPose.setOptions(poseOptions);

    // this.videoPose.onResults((results: Results) => {
    //   this.onPoseVideoResults(results, this.canvasElement1.nativeElement);
    // });
    this.cameraPose.onResults((results: Results) => {
      this.onPoseCameraResults(true, results, this.canvasElement2.nativeElement);
    });

    // this.videoElement.nativeElement.onloadeddata = () => {
    //   this.processVideoFrames();
    // };
  }

  private async processVideoFrames() {
    const video = this.videoElement.nativeElement;
    const renderFrame = async () => {
      if (video.paused || video.ended) return;
      await this.videoPose.send({ image: video });
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }

  private initializeCamera() {
    // console.log("initialize camera call");
    this.camera = new Camera(this.cameraElement.nativeElement, {
      onFrame: async () => {
        await this.cameraPose.send({ image: this.cameraElement.nativeElement });
      },
      width: 291,
      height: 290,
    });
    this.camera.start();
  }

  private getAngleBetweenPoints(start, middle, end) {
    const radians = Math.atan2(end.y - middle.y, end.x - middle.x) - Math.atan2(start.y - middle.y, start.x - middle.x);
    const angle = Math.abs((radians * 180.0) / Math.PI);
    return angle > 180.0 ? 360 - angle : angle;
  };

  private calculateAngleBetweenPoints(
    A: { x: number; y: number; z: number },
    B: { x: number; y: number; z: number },
  ): number {
    let dotProduct
    let magnitudeAB
    let magnitudeVertical
    if (this.videoIndex == 1 || this.videoIndex == 2 || this.videoIndex == 4 || this.videoIndex == 6) {
      const vectorAB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
      const verticalVector = { x: 0, y: 0, z: this.videoIndex == 4 ? 1 : -1 };

      dotProduct =
        vectorAB.x * verticalVector.x + vectorAB.y * verticalVector.y + vectorAB.z * verticalVector.z;

      magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2 + vectorAB.z ** 2);
      magnitudeVertical = Math.sqrt(
        verticalVector.x ** 2 + verticalVector.y ** 2 + verticalVector.z ** 2
      );
    } else {
      const vectorAB = { x: B.x - A.x, y: B.y - A.y };
      const verticalVector = { x: 0, y: 1 };

      dotProduct =
        vectorAB.x * verticalVector.x + vectorAB.y * verticalVector.y;

      magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);
      magnitudeVertical = Math.sqrt(
        verticalVector.x ** 2 + verticalVector.y ** 2
      );
    }
    const angleInRadians = Math.acos(
      dotProduct / (magnitudeAB * magnitudeVertical)
    );
    return angleInRadians * (180 / Math.PI);
  }

  private onPoseCameraResults(
    showMarker: boolean,
    results: Results,
    canvasElement: HTMLCanvasElement
  ) {
    const canvasCtx = canvasElement.getContext('2d');
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      if (results.poseLandmarks && showMarker && this.landmarks.length > 0) {
        // let leftShoulder
        // let leftWrist
        // let rightShoulder
        // let rightWrist
        // const leftShoulder = results.poseLandmarks[23];
        // const leftWrist = results.poseLandmarks[11];
        // const leftElbow = results.poseLandmarks[13];
        // const rightShoulder = results.poseLandmarks[24];
        // const rightWrist = results.poseLandmarks[12];
        // const rightElbow = results.poseLandmarks[14];

        // if (this.videoIndex == 1) {
        const leftShoulder = results.poseLandmarks[this.landmarks[0]];
        const leftWrist = results.poseLandmarks[this.landmarks[1]];
        const rightShoulder = results.poseLandmarks[this.landmarks[2]];
        const rightWrist = results.poseLandmarks[this.landmarks[3]];
        // } else if (this.videoIndex == 2) {
        //   leftShoulder = results.poseLandmarks[24];
        //   leftWrist = results.poseLandmarks[16];
        //   rightShoulder = results.poseLandmarks[24];
        //   rightWrist = results.poseLandmarks[16];
        // } else if (this.videoIndex == 3) {
        //   leftShoulder = results.poseLandmarks[24];
        //   leftWrist = results.poseLandmarks[28];
        //   rightShoulder = results.poseLandmarks[24];
        //   rightWrist = results.poseLandmarks[28];
        // } else if (this.videoIndex == 4 || this.videoIndex == 6) {
        //   leftShoulder = results.poseLandmarks[24];
        //   leftWrist = results.poseLandmarks[26];
        //   rightShoulder = results.poseLandmarks[23];
        //   rightWrist = results.poseLandmarks[25];
        // } else if (this.videoIndex == 5) {
        //   leftShoulder = results.poseLandmarks[26];
        //   leftWrist = results.poseLandmarks[28];
        //   rightShoulder = results.poseLandmarks[26];
        //   rightWrist = results.poseLandmarks[28];
        // } else {
        //   leftShoulder = results.poseLandmarks[11];
        //   leftWrist = results.poseLandmarks[15];
        //   rightShoulder = results.poseLandmarks[12];
        //   rightWrist = results.poseLandmarks[16];
        // }

        // Calculate angles for left and right wrists
        const leftAngle = this.calculateAngleBetweenPoints(
          { x: leftShoulder.x, y: leftShoulder.y, z: leftShoulder.z },
          { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z }
        );

        const rightAngle = this.calculateAngleBetweenPoints(
          { x: rightShoulder.x, y: rightShoulder.y, z: rightShoulder.z },
          { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z }
        );

        // const leftAngle = this.getAngleBetweenPoints(
        //   leftShoulder,
        //   leftWrist,
        //   leftElbow
        // );

        // const rightAngle = this.getAngleBetweenPoints(
        //   rightShoulder,
        //   rightWrist,
        //   rightElbow
        // );

        this.cameraAngle['leftWrist'] = leftAngle;
        this.cameraAngle['rightWrist'] = rightAngle;

        const elapsedTime = +((new Date().getTime() - this.startTime) / 1000).toFixed(3);

        this.matchingCameraData.push({
          timestamp: `${elapsedTime}`,
          'LSA Deg': `${Math.round(leftAngle)}`,
          'RSA Deg': `${Math.round(rightAngle)}`
        });

        const withinTolerance = (
          angle: number,
          target: number,
          tolerance: number
        ) => angle >= target - tolerance && angle <= target + tolerance;

        const withinTimeTolerance = (
          time: number,
          target: number,
          tolerance: number
        ) => time >= target - tolerance && time <= target + tolerance;

        const currentVideoAngle = this.videoMinMax[this.currentVideoIndex]
        // console.log(currentVideoAngle, this.currentVideoIndex);

        if (currentVideoAngle) {
          this.timeMatching = withinTimeTolerance(
            elapsedTime,
            currentVideoAngle.ClipTimestamp,
            .75
          )
          if (this.lastComment == 'Good' && this.lastTimeMatching) {
            this.timeMatching = true;
          }
          if (!this.timeMatching && this.timeMatching != this.lastTimeMatching) {
            this.currentVideoIndex++;
          }
          if (this.timeMatching != this.lastTimeMatching) {
            this.lastComment = 'Bad';
          }
          this.lastTimeMatching = this.timeMatching;

          const angleThreshold = 35;
          const timestampThreshold = 1.5;

          const timeDiff = Math.abs(currentVideoAngle.ClipTimestamp - elapsedTime);
          const angleLeftDiff = currentVideoAngle.ClipDeg - +leftAngle;
          const angleRightDiff = currentVideoAngle.ClipDeg - +rightAngle;

          this.leftCondition = 'Bad';
          this.rightCondition = 'Bad';
          if (timeDiff > timestampThreshold && Math.abs(angleRightDiff) <= angleThreshold) {
            this.rightComment = "Faster";
          } else if (angleRightDiff > angleThreshold) {
            this.rightComment = "Higher";
          } else if (angleRightDiff < -angleThreshold) {
            this.rightComment = "Lower";
          } else {
            this.rightCondition = 'Good';
            if (Math.abs(angleRightDiff) <= 2) {
              this.rightComment = "Perfect";
            } else if (Math.abs(angleRightDiff) <= 4) {
              this.rightComment = "Nice";
            } else {
              this.rightComment = "Great";
            }
          }

          if (timeDiff > timestampThreshold && Math.abs(angleLeftDiff) <= angleThreshold) {
            this.leftComment = "Faster";
          } else if (angleLeftDiff > angleThreshold) {
            this.leftComment = "Higher";
          } else if (angleLeftDiff < -angleThreshold) {
            this.leftComment = "Lower";
          } else {
            this.leftCondition = 'Good';
            if (Math.abs(angleLeftDiff) <= 2) {
              this.leftComment = "Perfect";
            } else if (Math.abs(angleLeftDiff) <= 4) {
              this.leftComment = "Nice";
            } else {
              this.leftComment = "Great";
            }
          }

          if (this.lastComment && this.timeMatching && this.lastComment != this.rightCondition && this.lastComment == 'Good') {
            this.currentVideoIndex++;
            this.lastTimeMatching = false;
          }
          this.lastComment = this.rightCondition
          this.timeLog.push({ elapsedTime, currentVideoTime: currentVideoAngle.ClipTimestamp, currentVideoAngle: currentVideoAngle.ClipDeg, rightAngle, timeMatching: this.timeMatching, rightComment: this.rightComment, lastComment: this.lastComment });

          this.cdr.detectChanges();

          // Additional code to draw pose landmarks and connections on the canvas
          results.poseLandmarks.forEach((landmark, index) => {
            // if (this.videoIndex == 3) {
            if (this.landmarksPointer.includes(index)) {
              canvasCtx.beginPath();
              canvasCtx.arc(
                landmark.x * canvasElement.width,
                landmark.y * canvasElement.height,
                7,
                0,
                2 * Math.PI
              );
              canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
              canvasCtx.fill();
            }
            // } else if (this.videoIndex == 4 || this.videoIndex == 5 || this.videoIndex == 6) {
            //   if (index === 24 || index === 26 || index == 28 || index === 23 || index === 25 || index === 27) {
            //     canvasCtx.beginPath();
            //     canvasCtx.arc(
            //       landmark.x * canvasElement.width,
            //       landmark.y * canvasElement.height,
            //       7,
            //       0,
            //       2 * Math.PI
            //     );
            //     canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            //     canvasCtx.fill();
            //   }
            // } else {
            //   if (index === 11 || index === 12 || index === 13 || index === 14 || index === 15 || index === 16 || index === 23 || index === 24) {
            //     canvasCtx.beginPath();
            //     canvasCtx.arc(
            //       landmark.x * canvasElement.width,
            //       landmark.y * canvasElement.height,
            //       7,
            //       0,
            //       2 * Math.PI
            //     );
            //     canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            //     canvasCtx.fill();
            //   }
            // }
          });

          POSE_CONNECTIONS.forEach(([start, end]) => {
            // if (this.videoIndex == 3) {
            const conditionString = this.landmarksLinePointer.map(item => {
              if (Array.isArray(item.end)) {
                return item.end.map(e => `(start === ${item.start} && end === ${e})`).join(' || ');
              }
              return `(start === ${item.start} && end === ${item.end})`;
            }).join(' || ');
            const condition = `(${conditionString})`;

            if (eval(condition)) {
              const startLandmark = results.poseLandmarks[start];
              const endLandmark = results.poseLandmarks[end];
              canvasCtx.beginPath();
              canvasCtx.moveTo(
                startLandmark.x * canvasElement.width,
                startLandmark.y * canvasElement.height
              );
              canvasCtx.lineTo(
                endLandmark.x * canvasElement.width,
                endLandmark.y * canvasElement.height
              );
              canvasCtx.lineWidth = 4;
              canvasCtx.strokeStyle = 'rgba(128, 128, 128, 0.6)';

              if (this.timeMatching && start % 2) {
                canvasCtx.strokeStyle = this.leftCondition === 'Good' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
              }
              if (this.timeMatching && start % 2 === 0) {
                canvasCtx.strokeStyle = this.rightCondition === 'Good' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
              }
              canvasCtx.stroke();
            }
            // } else if (this.videoIndex == 4 || this.videoIndex == 5 || this.videoIndex == 6) {
            //   if ((start === 24 && end === 26) || (start === 26 && end === 28) || (start === 23 && end === 25) || (start === 25 && end === 27)) {
            //     const startLandmark = results.poseLandmarks[start];
            //     const endLandmark = results.poseLandmarks[end];
            //     canvasCtx.beginPath();
            //     canvasCtx.moveTo(
            //       startLandmark.x * canvasElement.width,
            //       startLandmark.y * canvasElement.height
            //     );
            //     canvasCtx.lineTo(
            //       endLandmark.x * canvasElement.width,
            //       endLandmark.y * canvasElement.height
            //     );
            //     canvasCtx.lineWidth = 4;
            //     canvasCtx.strokeStyle = 'rgba(128, 128, 128, 0.6)';

            //     if (this.timeMatching && ((start === 24 && end === 26) || (start === 26 && end === 28))) {
            //       canvasCtx.strokeStyle = this.leftCondition === 'Good' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            //     }
            //     if (this.timeMatching && ((start === 23 && end === 25) || (start === 25 && end === 27))) {
            //       canvasCtx.strokeStyle = this.rightCondition === 'Good' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            //     }
            //     canvasCtx.stroke();
            //   }
            // } else {
            //   if ((start === 11 && (end === 13 || end === 23)) || (start === 13 && end === 15) || (start === 12 && (end === 14 || end === 24)) || (start === 14 && end === 16)) {
            //     const startLandmark = results.poseLandmarks[start];
            //     const endLandmark = results.poseLandmarks[end];
            //     canvasCtx.beginPath();
            //     canvasCtx.moveTo(
            //       startLandmark.x * canvasElement.width,
            //       startLandmark.y * canvasElement.height
            //     );
            //     canvasCtx.lineTo(
            //       endLandmark.x * canvasElement.width,
            //       endLandmark.y * canvasElement.height
            //     );
            //     canvasCtx.lineWidth = 4;
            //     canvasCtx.strokeStyle = 'rgba(128, 128, 128, 0.6)';

            //     if (this.timeMatching && ((start === 11 && (end === 13 || end === 23)) || (start === 13 && end === 15))) {
            //       canvasCtx.strokeStyle = this.leftCondition === 'Good' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            //     }
            //     if (this.timeMatching && ((start === 12 && (end === 14 || end === 24)) || (start === 14 && end === 16))) {
            //       canvasCtx.strokeStyle = this.rightCondition === 'Good' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            //     }
            //     canvasCtx.stroke();
            //   }
            // }
          });
        }
      }
    }
  }

  playAudio(filePath: string) {
    const audio = new Audio(filePath);
    audio.load(); // Ensure the audio file is loaded
    audio.play(); // Play the audio
  }

  playCommentAudio() {
    const speech = new SpeechSynthesisUtterance(this.rightComment);
    speech.lang = 'en-US'; // Set language
    speech.volume = 1; // Volume: 0 to 1
    speech.rate = 1; // Speed: 0.1 to 10
    speech.pitch = 1; // Pitch: 0 to 2
    window.speechSynthesis.speak(speech);
  }
}

export class HeygenAPIService {
  API_CONFIG = {
    apiKey: "MTZkNDJlNmEzNzBjNDc1N2I5ZTUzNjY1NDA0ODEzMzAtMTczOTQzMzY4Mw==",
    // apiKey: "ZWE1NjlmOGZmNGIzNDg1M2FjYWY3Mzg",
    serverUrl: "https://api.heygen.com",
  };

  LivekitClient: any;
  newSessionInfo: any = null;
  private room: any = null;
  mediaStream: MediaStream | null = null;
  webSocket: WebSocket | null = null;
  sessionToken: string | null = null;

  avatarID: string = '';
  voiceID: string = '';
  taskInput: string = ''
  statusMessages: string[] = [];

  updateNewStatus(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.statusMessages.push(`[${timestamp}] ${message}`);
  }

  async getSessionToken() {
    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.API_CONFIG.apiKey,
      },
    });

    const data = await response.json();
    this.sessionToken = data.data.token;
    this.updateNewStatus("Session token obtained");
  }

  async connectWebSocket(sessionId: string) {
    const params = new URLSearchParams({
      session_id: sessionId,
      session_token: this.sessionToken!,
      silence_response: 'false',
      opening_text: "Hello, how can I help you?",
      stt_language: "en",
    });

    const wsUrl = `wss://${new URL(this.API_CONFIG.serverUrl).hostname}/v1/ws/streaming.chat?${params}`;
    this.webSocket = new WebSocket(wsUrl);

    this.webSocket.addEventListener("message", (event: MessageEvent) => {
      const eventData = JSON.parse(event.data);
      console.log("Raw WebSocket event:", eventData);
    });
  }

  async createNewSession() {
    if (!this.sessionToken) {
      await this.getSessionToken();
    }

    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        quality: "high",
        avatar_name: '2c57ba04ef4d4a5ca30a953d0791e7e3',
        voice: {
          voice_id: this.voiceID,
          rate: 1.0,
        },
        version: "v2",
        video_encoding: "H264",
      }),
    });

    const data = await response.json();
    console.warn("data : ", data)
    this.newSessionInfo = data.data;

    this.room = new this.LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: this.LivekitClient.VideoPresets.h720.resolution,
      },
    });

    this.room.on(this.LivekitClient.RoomEvent.DataReceived, (message: any) => {
      const data = new TextDecoder().decode(message);
      // console.log("Room message:", JSON.parse(data));
    });

    this.mediaStream = new MediaStream();
    this.room.on(this.LivekitClient.RoomEvent.TrackSubscribed, (track: any) => {
      if (track.kind === "video" || track.kind === "audio") {
        this.mediaStream!.addTrack(track.mediaStreamTrack);
        if (this.mediaStream!.getVideoTracks().length > 0 && this.mediaStream!.getAudioTracks().length > 0) {
          const mediaElement = document.getElementById('mediaElement') as HTMLVideoElement;
          mediaElement.srcObject = this.mediaStream;
          this.updateNewStatus("Media stream ready");
        }
      }
    });

    this.room.on(this.LivekitClient.RoomEvent.TrackUnsubscribed, (track: any) => {
      const mediaTrack = track.mediaStreamTrack;
      if (mediaTrack) {
        this.mediaStream!.removeTrack(mediaTrack);
      }
    });

    this.room.on(this.LivekitClient.RoomEvent.Disconnected, (reason: any) => {
      this.updateNewStatus(`Room disconnected: ${reason}`);
    });

    await this.room.prepareConnection(this.newSessionInfo.url, this.newSessionInfo.access_token);
    this.updateNewStatus("Connection prepared");

    await this.connectWebSocket(this.newSessionInfo.session_id);
    this.updateNewStatus("Session created successfully");
  }

  async startStreamingSession() {
    const startResponse = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
      }),
    });

    await this.room.connect(this.newSessionInfo.url, this.newSessionInfo.access_token);
    this.updateNewStatus("Connected to room");
  }

  async sendText(text: string, taskType: string = "talk") {
    if (!this.newSessionInfo) {
      this.updateNewStatus("No active session");
      return;
    }

    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
        text: text,
        task_type: taskType,
      }),
    });

    this.updateNewStatus(`Sent text (${taskType}): ${text}`);
  }

  async closeSession() {
    if (!this.newSessionInfo) {
      this.updateNewStatus("No active session");
      return;
    }

    await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
      }),
    });

    if (this.webSocket) {
      this.webSocket.close();
    }
    if (this.room) {
      this.room.disconnect();
    }

    const mediaElement = document.getElementById('mediaElement') as HTMLVideoElement;
    mediaElement.srcObject = null;
    this.newSessionInfo = null;
    this.room = null;
    this.mediaStream = null;
    this.sessionToken = null;

    this.updateNewStatus("Session closed");
  }

  onStart() {
    this.createNewSession().then(() => this.startStreamingSession());
  }

  onClose() {
    this.closeSession();
  }
}