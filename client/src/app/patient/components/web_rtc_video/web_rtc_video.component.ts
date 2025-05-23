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
import { isNil, isBoolean, throttle } from 'lodash';
import { setCameraFrameRate } from '../../../common/helpers/webRTC-common-utils';
import { IOrganAngle, IScore } from '../../../../types';
import { IGameAppData } from '../../../../app/app.state';
import { HttpClient } from '@angular/common/http';

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
  rustdeskId: string | null = null;
  showPopup = false;
  termsAccepted = false;
  isDragging = false;
  popupPosition = { x: 100, y: 100 }; 
  dragStart = { x: 0, y: 0 }; 
  isWindows = false;
  isMac = false;
  isLinux = false;
  constructor(
    private authenticationService: AuthenticationService,
    private patientWebRtcService: PatientWebRtcService,
    private appActions: AppActions,
    private menuOptionsActions: MenuOptionsAppActions,
    private depthCameraSocketService: DepthCameraSocketService,
    private webCamSkeletonService: WebCamSkeletonService,
    private ajaxService: AjaxService,private http: HttpClient,
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
      this.handleMobileAvailability(this.isMobile);
    this.handleMobileAvailability(this.isMobile);
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
    document.addEventListener('touchstart', this.handleBodyTracking.bind(this), { passive: false });
    this.detectOS();
  }

  ngAfterViewInit() {
    this.skeletonBtn = document.getElementById('skeleton-border-wrap');
    this.skeletonLoadingBar();
  }

  handleCameraAvailability() {
    clearInterval(this.searchCameraInterval);
    this.ajaxService.updatePatientCameraAvailability(this.currentUser.patientId, this.userHasCamera);
    this.isCameraCheckComplete = true;
  }

  handleMobileAvailability(isMobile) {
    console.log("going to save mobile device",isMobile);
    this.ajaxService.updatePatientMobileAvailability(this.currentUser.patientId, isMobile);    
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
/*
  isIosDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
  */
  isIosDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
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
        //this.remoteVideo.srcObject = stream;
        (this.remoteVideo as any).srcObject = stream;
      } else if (navigator['mozGetUserMedia']) {
        (this.remoteVideo as any).mozSrcObject = stream;
      } else {
        //(this.remoteVideo as any).src = (window.URL || window.webkitURL).createObjectURL(stream);
        (this.remoteVideo as any).srcObject = stream;
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
      //this.remoteVideo.srcObject = stream;
      (this.remoteVideo as any).srcObject = stream;
    } else if (navigator['mozGetUserMedia']) {
      (this.remoteVideo as any).mozSrcObject = stream;
    } else {
      //(this.remoteVideo as any).src = (window.URL || window.webkitURL).createObjectURL(stream);
      (this.remoteVideo as any).srcObject = stream;
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
   // return navigator.getUserMedia;
   return navigator.mediaDevices.getUserMedia;
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
        this.redirectToHome();
        break;
      case MESSAGES.REQUEST_APP_GAME_DATA:
        this.handleRequestAppGameData();
        break;
      case MESSAGES.RDP_REQUEST:
        console.log("========MESSAGES.RDP_REQUEST=====",MESSAGES.RDP_REQUEST);
        this.redirectToRdpRequest();
        break;
      default:
        break;
    }
  }

  redirectToHome() {
    this.handleTherapistClickHome.emit();
  }

  redirectToRdpRequest() {
    this.fetchRustDeskId();
    setTimeout(() => {
      this.openRustdeskModal(` You can Install Rustdesk Software first and share the rustdesk ID`);
    }, 100);
  }
 // Triggered on mouse down
startDrag(event: MouseEvent): void {
  this.isDragging = true;
  this.dragStart.x = event.clientX - this.popupPosition.x;
  this.dragStart.y = event.clientY - this.popupPosition.y;
}

// Triggered on mouse up
stopDrag(): void {
  this.isDragging = false;
}

// Triggered on mouse move
onDrag(event: MouseEvent): void {
  if (this.isDragging) {
    this.popupPosition.x = event.clientX - this.dragStart.x;
    this.popupPosition.y = event.clientY - this.dragStart.y;
  }
}

fetchRustDeskId() { 
  this.ajaxService.getpatientRustDeskId(this.currentUser.patientId).subscribe((response) => {     
   this.rustdeskId = response; 
  });
}

// Method to open the popup
openRustdeskModal(message: string): void { 
  this.fetchRustDeskId();  
  if(!this.rustdeskId){
    this.showPopup = true;
  } 
}

// Method to close the popup
closePopup(): void {
  this.showPopup = false;
  this.termsAccepted = false;
}

detectOS() {
  const userAgent = navigator.userAgent;
  this.isWindows = /Windows/i.test(userAgent);
  this.isMac = /Macintosh|Mac/i.test(userAgent);
  this.isLinux = /Linux|Ubuntu/i.test(userAgent);
}

downloadSoftware(platform: 'win' | 'mac' | 'linux') {
  const links = {
    win: 'https://github.com/rustdesk/rustdesk/releases/download/1.4.0/rustdesk-1.4.0-x86_64.exe',
    mac: 'https://github.com/rustdesk/rustdesk/releases/download/1.4.0/rustdesk-1.4.0-x86_64.dmg',
    linux: 'https://github.com/rustdesk/rustdesk/releases/download/1.4.0/rustdesk-1.4.0-x86_64.deb'
  };
  // Trigger the download without affecting the page session
  try {
    const link = document.createElement('a');
    link.href = links[platform];
    link.download = 
      platform === 'win' ? 'RustDesk-Windows.exe' : 
      platform === 'mac' ? 'RustDesk-Mac.dmg' : 
      'RustDesk-Linux.deb';
    link.target = '_blank'; // Open in a new tab to avoid disruption
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error initiating download:', error);
  }
  this.closePopup();
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
      console.warn('therapist peer error' + err);
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
        approveCallback: async () => {},
        declineCallback: async () => {},
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
        approveCallback: () => {},
        declineCallback: () => {},
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
        approveCallback: () => {},
        declineCallback: () => {},
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
}
