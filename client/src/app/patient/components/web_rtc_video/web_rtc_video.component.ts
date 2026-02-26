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
import { select, NgRedux } from '@angular-redux/store';
import { Observable, Subscription, async, of } from 'rxjs';
import { filter, catchError } from 'rxjs/operators';
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
import { isNil, isBoolean, throttle, set, size } from 'lodash';
import { setCameraFrameRate } from '../../../common/helpers/webRTC-common-utils';
import { IOrganAngle, IScore } from '../../../../types';
import { IGameAppData, IAppState } from '../../../../app/app.state';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS, Results } from '@mediapipe/pose';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { SkeltonVideoService } from '../../../common/services/skelton-video.service';
import { SkeletonProgressBarService } from 'src/app/common/services/skeleton-progress-bar.service';
import { SkeletonService } from 'src/app/common/services/skeleton.service';
import { PatientScoreService } from 'src/app/common/services/patient-score.service';
declare var LivekitClient: any;
import { HttpClient } from '@angular/common/http';
import e from 'cors';
import { AudioRecordingService } from '../../services/audio_recording.service';
import { AlertService } from '../../../common/services/comp_alert.service';
import { debounce } from 'lodash';
import { GameSettingsService } from '../../services/game-settings.service';
let therapistToPatientConnection = null;
declare var MediaRecorder: any;
@Component({
  selector: 'app-web-rtc-video',
  templateUrl: './web_rtc_video.component.html',
  styleUrls: ['./web_rtc_video.component.scss'],
})
export class WebRTCVideoComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() currentUser;
  @Input() connectedUser;
  @Input() validGames;
  @Input() showLocalVideo;
  @Input() currentGameName;
  @Input() videoSessionDisplay;
  @Input() isMobile;
  @Input() gameId;
  @Input() connectedTherapist;
  @Input() startTracking: boolean;
  @Input() currentScore: number;
  @Input() gameSummary: any;
  @Input() isShareScreen;
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
  @Output() closeGame = new EventEmitter();
  ///pose comparision var initialise here ////////////////

  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('cameraElement') cameraElement!: ElementRef;
  @ViewChild('canvasElement1') canvasElement1!: ElementRef;
  @ViewChild('canvasElement2') canvasElement2!: ElementRef;
  //videoElement: HTMLVideoElement | null = null;
  iframeElement: HTMLIFrameElement | null = null;

  private cameraPose!: Pose;
  private camera!: Camera;
  timeMatching = false;
  showGreen = false;
  lastTimeMatching = false;
  badConditionStartTime = {};
  goodConditionStartTime = {};
  extendedTimeMatchingUntil = -1;
  timeLog: any = [];
  public cameraAngle: { [key: string]: number } = {
    leftWrist: Infinity,
    rightWrist: Infinity,
  };
  private matchingCameraData = [];
  // private matchingCameraData: { timestamp: string; 'LSA Deg': string; 'RSA Deg': string; }[] = [];
  private startTime: number;
  private videoIndex: number = -1;
  private frameIndex: number = 0;
  private videoSeconds: number = 0;
  private currentVideoIndex: number = 0;
  private videoTime;
  private duration;
  private currentPlayTime;
  jointsCoordinates = [];
  videoLeftDeeps = [];
  videoRightDeeps = [];
  videoLeftPeaks = [];
  videoRightPeaks = [];
  videoLeftLandmarks = [];
  videoRightLandmarks = [];
  postures = [];
  currentPostures = [];
  videoMinMax = [];
  landmarks = [];
  landmarkColorCache = new Map();
  landmarksPostures = [];
  landmarksLinePointer = [];
  rightComment = '';
  leftComment = '';
  rightCondition = [];
  leftCondition = [];
  currentCondition = [];
  lastComment = '';
  lastVideoName = '';
  lastVideoMinMax = [];
  processedTimestamps: Set<string> = new Set();
  receivedRemoteVideo: boolean = false;
  private unityCanvasStreamActive: boolean = false; // Track if Unity canvas stream is currently active
  private unityCanvasStream: MediaStream | null = null; // Keep reference to canvas stream to prevent it from being garbage collected
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
  POSENET_LOADING_TIME_PASSED_DURATION = 5000;
  loadingBarPercentage = 2;
  skeletonBtn;
  videoPlayer;
  currentGameAppData: IGameAppData;
  searchCameraInterval;
  heygenAPIService: HeygenAPIService;
  newInterval;
  lastPerformedPercentage = 0;
  callChatGPT = false;
  showMarker = false;
  showDefaultMarker = true;
  lastPerformedIndex = 0;
  barPercentage = 0;
  barThumbsUp = 0;
  firstTimeSpeech = false;
  isVideoPaused = false;
  finalFeedback = false;
  heygenActive = false;
  heygenShow = false;
  checkIdle = true;
  isIdle = true;
  leftPosture = false;
  rightPosture = false;
  currentPosture = [];
  lastIdleLength = 0;
  lastTriggerTime = 0;
  leftPostureAngle = 0;
  rightPostureAngle = 0;
  currentPostureAngle = [];
  leftPostureRange = [];
  rightPostureRange = [];
  currentPostureRange = [];
// ================== PROPERTIES ==================
private leftElbowCounter = 0;
private rightElbowCounter = 0;
private leftShoulderCounter = 0;
private rightShoulderCounter = 0;
private trunkLeftCounter = 0;
private trunkRightCounter = 0;
private trunkForwardCounter = 0;
private trunkBackwardCounter = 0;
  // gameScoreSummaryData: any = [];
  shouldShowSessionScorebar: boolean = false;
  
  // Backup of game data to preserve it when hiding
  private gameScoreSummaryDataBackup: any = [];

private lastCheckTime: number = Date.now();
private COMPENSATION_INTERVAL: number = 10; 
private volumeLevelThreshold: number = 5;
private leftElbowThreshold = 160;
private rightElbowThreshold = 160;
private leftShoulderThreshold = 10;
private rightShoulderThreshold = 10;
private trunkLeftThreshold = 10;
private trunkRightThreshold = 10;
private trunkForwardThreshold = 10;
private trunkBackwardThreshold = 10;
startAngleTracking = false;
compensationAlerts: any[] = [];
private roundNumber = 1;
private roundLeftElbowTotal = 0;
private roundRightElbowTotal = 0;
private roundLeftShoulderTotal = 0;
private roundRightShoulderTotal = 0;
private roundTrunkLeftTotal = 0;
private roundTrunkRightTotal = 0;
private roundTrunkForwardTotal = 0;
private roundTrunkBackwardTotal = 0;
private trackingPreviously = false;
private lastScoreValue: number | null = null;
private compSettings: any = null;
private compSettingsLoaded = false;
private baselineLeftShoulder: { x: number; y: number; z: number } | null = null;
private baselineRightShoulder: { x: number; y: number; z: number } | null = null;
private baselineShoulderAngle: number | null = null;
 baselineCaptured = false;
 baselineCaptureInit = false;
 public currentCompensationMessage: string | null = null;
 gameScoreSummaryData: any = [];
 compThresholds: any = {
  EL: {1: 30, 2: 25, 3: 20, 4: 15, 5: 10},
  ER: {1: 30, 2: 25, 3: 20, 4: 15, 5: 10},
  
  SL: {1: 25, 2: 20, 3: 15, 4: 12, 5: 10},
  SR: {1: 25, 2: 20, 3: 15, 4: 12, 5: 10},
  
  TL: {1: 20, 2: 18, 3: 15, 4: 12, 5: 10},
  TR: {1: 20, 2: 18, 3: 15, 4: 12, 5: 10},
  
  TF: {1: 25, 2: 20, 3: 15, 4: 12, 5: 8},
  TB: {1: 25, 2: 20, 3: 15, 4: 12, 5: 8}
};


private messageTimeout: any;
 private countdownActive = false;
  rustdeskId: string | null = null;
  showPopup = false;
  termsAccepted = false;
  isDragging = false;
  popupPosition = { x: 100, y: 100 };
  dragStart = { x: 0, y: 0 };
  isWindows = false;
  isMac = false;
  isLinux = false;
  peakIndex = 0;
  deepIndex = 0;
  currentGameSettings = [];
  clipSummary: string;
  videoTitle: string;
  clipId: string;
  video_fdk_level: string;
  audio;
  gameMetadata = [
    [[
      6.7,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ], [
      8,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      10,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      11.4,
      ["deeps", [24, 12, 14], 20],
      ["deeps", [23, 11, 13], 20]
    ], [
      12,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      14,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      16,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      16.4,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ], [
      18,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      20.2,
      ["deeps", [24, 12, 14], 20],
      ["deeps", [23, 11, 13], 20]
    ], [
      22,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      24,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      24.2,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ], [
      26,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      28,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      29.6,
      ["deeps", [24, 12, 14], 20],
      ["deeps", [23, 11, 13], 20]
    ], [
      30,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      32,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      33.6,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ], [
      34,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      36,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      38,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      38.9,
      ["deeps", [24, 12, 14], 20],
      ["deeps", [23, 11, 13], 20]
    ], [
      42,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      43.5,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ], [
      44,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      46,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      48,
      ["deeps", [24, 12, 14], 20],
      ["deeps", [23, 11, 13], 20],
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      50,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      52,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      52.7,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ], [
      54,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      56,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      57.4,
      ["deeps", [24, 12, 14], 20],
      ["deeps", [23, 11, 13], 20]
    ], [
      58,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      60,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      62,
      ["posture", [12, 14, 16], [130, 180]],
      ["posture", [11, 13, 15], [130, 180]]
    ], [
      62.7,
      ["peaks", [24, 12, 14], 160],
      ["peaks", [23, 11, 13], 160]
    ]], [[
      25.7,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      27.3,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      29.3,
      ["idle"]
    ], [
      30.5,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      32.2,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      34.2,
      ["idle"]
    ], [
      35.0,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      36.1,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      38.1,
      ["idle"]
    ], [
      39.6,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      40.4,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      42.4,
      ["idle"]
    ], [
      43.6,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      44.6,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      46.6,
      ["idle"]
    ], [
      47.5,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      48.4,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      50.4,
      ["idle"]
    ], [
      51.4,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      52.6,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      54.6,
      ["idle"]
    ], [
      55.3,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      56.2,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      58.2,
      ["idle"]
    ], [
      58.7,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      59.8,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      61.8,
      ["idle"]
    ], [
      62.5,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      63.4,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      65.4,
      ["idle"]
    ], [
      65.8,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      66.8,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      68.8,
      ["idle"]
    ], [
      69.5,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      70.3,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      72.3,
      ["idle"]
    ], [
      73.1,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      74.4,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      76.4,
      ["idle"]
    ], [
      76.6,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      77.6,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      79.6,
      ["idle"]
    ], [
      79.9,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      81.0,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      83.0,
      ["idle"]
    ], [
      83.3,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      84.1,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ], [
      86.1,
      ["idle"]
    ], [
      86.8,
      ["deeps", [26, 24, 12], 90],
      ["deeps", [25, 23, 11], 90],
      ["deeps", [24, 26, 28], 90],
      ["deeps", [23, 25, 27], 90]
    ], [
      87.9,
      ["peaks", [26, 24, 12], 130],
      ["peaks", [25, 23, 11], 130],
      ["peaks", [24, 26, 28], 130],
      ["peaks", [23, 25, 27], 130]
    ]], [[
      1.5,
      ["peaks", [11, 13, 15], 160]
    ], [
      3.0,
      ["deeps", [11, 13, 15], 20]
    ], [
      4.0,
      ["idle"]
    ], [
      5,
      ["peaks", [11, 13, 15], 160]
    ], [
      6.5,
      ["deeps", [11, 13, 15], 20],
      ["idle"]
    ], [
      9,
      ["peaks", [11, 13, 15], 160],
      ["idle"]
    ], [
      10.0,
      ["idle"]
    ], [
      11,
      ["deeps", [11, 13, 15], 20]
    ], [
      13,
      ["peaks", [11, 13, 15], 160]
    ], [
      14.0,
      ["idle"]
    ], [
      15.0,
      ["deeps", [11, 13, 15], 20]
    ], [
      16.0,
      ["idle"]
    ], [
      17.0,
      ["peaks", [11, 13, 15], 160]
    ], [
      18.0,
      ["idle"]
    ], [
      19.5,
      ["deeps", [11, 13, 15], 20]
    ], [
      20.0,
      ["idle"]
    ], [
      21.5,
      ["peaks", [11, 13, 15], 160]
    ], [
      23.2,
      ["deeps", [11, 13, 15], 20],
      ["idle"]
    ], [
      25.0,
      ["peaks", [11, 13, 15], 160],
      ["idle"]
    ], [
      27.0,
      ["deeps", [11, 13, 15], 20]
    ], [
      28.0,
      ["idle"]
    ], [
      29.0,
      ["peaks", [11, 13, 15], 160]
    ], [
      30.0,
      ["idle"]
    ], [
      31.0,
      ["deeps", [11, 13, 15], 20]
    ], [
      32.0,
      ["idle"]
    ], [
      33.0,
      ["peaks", [11, 13, 15], 160]
    ], [
      34.0,
      ["idle"]
    ], [
      34.5,
      ["deeps", [11, 13, 15], 20]
    ], [
      36.0,
      ["idle"]
    ], [
      37.0,
      ["peaks", [11, 13, 15], 160]
    ], [
      38.4,
      ["deeps", [11, 13, 15], 20],
      ["idle"]
    ], [
      40.2,
      ["peaks", [11, 13, 15], 160],
      ["idle"]
    ], [
      42.0,
      ["deeps", [11, 13, 15], 20]
    ], [
      43.0,
      ["idle"]
    ], [
      44.0,
      ["peaks", [11, 13, 15], 160]
    ], [
      45.0,
      ["idle"]
    ], [
      46.0,
      ["deeps", [11, 13, 15], 20]
    ], [
      47.5,
      ["peaks", [11, 13, 15], 160],
      ["idle"]
    ], [
      48.0,
      ["idle"]
    ], [
      49,
      ["deeps", [11, 13, 15], 20]
    ], [
      50.0,
      ["idle"]
    ], [
      51,
      ["peaks", [11, 13, 15], 160]
    ]], [[
      3.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      4.0,
      ["idle"]
    ], [
      7.3,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      8.0,
      ["idle"]
    ], [
      10.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      11.0,
      ["idle"]
    ], [
      15.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      15.0,
      ["idle"]
    ], [
      17.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      19.0,
      ["idle"]
    ], [
      22.2,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      23.0,
      ["idle"]
    ], [
      25.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      29.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]],
      ["idle"]
    ], [
      32.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]],
      ["idle"]
    ], [
      34.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      35.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]],
      ["idle"]
    ], [
      39.0,
      ["idle"]
    ], [
      42.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      43.0,
      ["idle"]
    ], [
      44.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      46.0,
      ["idle"]
    ], [
      48.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      51.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      52.0,
      ["idle"]
    ], [
      53.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      55.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      57.0,
      ["idle"]
    ], [
      59.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ], [
      61.0,
      ["idle"]
    ], [
      62.0,
      ["deeps", [11, 12, 14], [110, 120]],
      ["deeps", [12, 11, 13], [110, 120]]
    ], [
      64.0,
      ["idle"]
    ], [
      65.0,
      ["peaks", [11, 12, 14], [100, 110]],
      ["peaks", [12, 11, 13], [100, 110]]
    ]], [[
      2.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      3.0,
      ["idle"]
    ], [
      3.7,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      5.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40],
      ["idle"]
    ], [
      6.0,
      ["idle"]
    ], [
      7.0,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      8.4,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40],
      ["idle"]
    ], [
      10.3,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      11.0,
      ["idle"]
    ], [
      12.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      13.0,
      ["idle"]
    ], [
      13.7,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      15.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40],
      ["idle"]
    ], [
      16.0,
      ["idle"]
    ], [
      17.0,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      18.0,
      ["idle"]
    ], [
      18.5,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      19.5,
      ["idle"]
    ], [
      20.0,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      21.0,
      ["idle"]
    ], [
      22.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      23.0,
      ["idle"]
    ], [
      24.0,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      25.0,
      ["idle"]
    ], [
      26.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      27.0,
      ["idle"]
    ], [
      27.4,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      29.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40],
      ["idle"]
    ], [
      30.0,
      ["idle"]
    ], [
      31.5,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      32.5,
      ["idle"]
    ], [
      33.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      34.0,
      ["idle"]
    ], [
      35.0,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      36.0,
      ["idle"]
    ], [
      36.5,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ], [
      37.5,
      ["idle"]
    ], [
      38.5,
      ["deeps", [12, 14, 16], 135],
      ["peaks", [0, 24], 40]
    ], [
      39.5,
      ["idle"]
    ], [
      40.0,
      ["peaks", [12, 14, 16], 160],
      ["deeps", [0, 24], 40]
    ]], [[
      6.0,
      ["peaks", [12, 24], 25]
    ], [
      10.0,
      ["deeps", [12, 24], 10]
    ], [
      16.0,
      ["peaks", [12, 24], 25]
    ], [
      19.0,
      ["deeps", [12, 24], 10]
    ], [
      25.5,
      ["peaks", [12, 24], 25]
    ], [
      28.0,
      ["deeps", [12, 24], 10]
    ], [
      34.0,
      ["peaks", [12, 24], 25]
    ], [
      37.0,
      ["deeps", [12, 24], 10]
    ]], [[
      8,
      ["peaks", [12, 24], 15],
      ["peaks", [14, 12, 24], 150]
    ], [
      14,
      ["deeps", [12, 24], 5],
      ["deeps", [14, 12, 24], 15]
    ], [
      19,
      ["peaks", [12, 24], 15],
      ["peaks", [14, 12, 24], 150]
    ], [
      23.7,
      ["deeps", [12, 24], 5],
      ["deeps", [14, 12, 24], 15]
    ], [
      27.7,
      ["peaks", [12, 24], 15],
      ["peaks", [14, 12, 24], 150]
    ], [
      32.4,
      ["deeps", [12, 24], 5],
      ["deeps", [14, 12, 24], 15]
    ], [
      36.5,
      ["peaks", [12, 24], 15],
      ["peaks", [14, 12, 24], 150]
    ], [
      40.5,
      ["deeps", [12, 24], 5],
      ["deeps", [14, 12, 24], 15]
    ], [
      44.8,
      ["peaks", [12, 24], 15],
      ["peaks", [14, 12, 24], 150]
    ], [
      48.7,
      ["deeps", [12, 24], 5],
      ["deeps", [14, 12, 24], 15]
    ], [
      52.5,
      ["peaks", [12, 24], 15],
      ["peaks", [14, 12, 24], 150]
    ], [
      56.4,
      ["deeps", [12, 24], 5],
      ["deeps", [14, 12, 24], 15]
    ], [
      63.4,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      68,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ], [
      72.4,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      76,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ], [
      79.4,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      83,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ], [
      86.6,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      91,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ], [
      95.5,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      99.4,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ], [
      104.7,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      108,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ], [
      111.8,
      ["peaks", [11, 23], 15],
      ["peaks", [13, 11, 23], 150]
    ], [
      115,
      ["deeps", [11, 23], 5],
      ["deeps", [13, 11, 23], 15]
    ]], [[
      26.7,
      ["deeps", [11, 23, 25], 100]
    ], [
      29.9,
      ["peaks", [11, 23, 25], 150]
    ], [
      33.0,
      ["deeps", [11, 23, 25], 100]
    ], [
      36.3,
      ["peaks", [11, 23, 25], 150]
    ], [
      40.8,
      ["deeps", [11, 23, 25], 100]
    ], [
      43.8,
      ["peaks", [11, 23, 25], 150]
    ], [
      47.0,
      ["deeps", [11, 23, 25], 100]
    ], [
      50.0,
      ["peaks", [11, 23, 25], 150]
    ], [
      52.8,
      ["deeps", [11, 23, 25], 100]
    ], [
      56.0,
      ["peaks", [11, 23, 25], 150]
    ], [
      59.0,
      ["deeps", [11, 23, 25], 100]
    ], [
      61.8,
      ["peaks", [11, 23, 25], 150]
    ], [
      65.0,
      ["deeps", [11, 23, 25], 100]
    ], [
      68.0,
      ["peaks", [11, 23, 25], 150]
    ], [
      72.0,
      ["deeps", [11, 23, 25], 100]
    ], [
      74.0,
      ["peaks", [11, 23, 25], 150]
    ], [
      76.8,
      ["deeps", [11, 23, 25], 100]
    ], [
      80.0,
      ["peaks", [11, 23, 25], 150]
    ], [
      98.0,
      ["deeps", [12, 24, 26], 100]
    ], [
      101.0,
      ["peaks", [12, 24, 26], 150]
    ], [
      103.9,
      ["deeps", [12, 24, 26], 100]
    ], [
      107.0,
      ["peaks", [12, 24, 26], 150]
    ], [
      110.7,
      ["deeps", [12, 24, 26], 100]
    ], [
      113.7,
      ["peaks", [12, 24, 26], 150]
    ], [
      119.0,
      ["deeps", [12, 24, 26], 100]
    ], [
      121.8,
      ["peaks", [12, 24, 26], 150]
    ], [
      124.0,
      ["deeps", [12, 24, 26], 100]
    ], [
      127.0,
      ["peaks", [12, 24, 26], 150]
    ], [
      130.0,
      ["deeps", [12, 24, 26], 100]
    ], [
      132.9,
      ["peaks", [12, 24, 26], 150]
    ], [
      136.7,
      ["deeps", [12, 24, 26], 100]
    ], [
      139.6,
      ["peaks", [12, 24, 26], 150]
    ], [
      142.7,
      ["deeps", [12, 24, 26], 100]
    ], [
      145.0,
      ["peaks", [12, 24, 26], 150]
    ], [
      148.8,
      ["deeps", [12, 24, 26], 100]
    ], [
      151.0,
      ["peaks", [12, 24, 26], 150]
    ]]
  ];

  therapistId = null;
  private recordingInProgress = false;
  private audioMediaStream!: MediaStream;
  private canvasCall: any;
  private unityCanvasVideoTrack: MediaStreamTrack | null = null;
  private placeholderCanvas: HTMLCanvasElement | null = null;
  private placeholderDrawInterval: any = null;
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
    private skeletonService: SkeletonService,
    private patientScoreService: PatientScoreService,
    private http: HttpClient,
    private audioRecordingService: AudioRecordingService,
    private alertService: AlertService,
    private ngRedux: NgRedux<IAppState>,
    private gameSettingsService: GameSettingsService
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
        //console.log("=======this.isInGame===",this.isInGame);
        if (!isInGame) {
          this.cleanupSessionProgressBarCompletely();          
          this.gameId = null;
          this.resetTracking();
        }else{
           // Initialize camera pose tracking for ALL games EXCEPT Unity games
          if (this.localVideo && this.gameId !== 20) {
            console.log("======before call initializeCameraPoseModels");
           this.initializeCameraPoseModels();
            
            // For studio games, ensure pose analysis runs regardless of disabledSkeleton
           /* if (this.gameId === 3) {
              console.log(`[PATIENT-${this.currentUser?.peerId}] Studio game detected - ensuring pose analysis runs`);
              setTimeout(() => {
                if (this.cameraPose && this.localVideo) {
                  this.processVideoFrames();
                }
              }, 2000);
            }*/
          } else if (this.gameId === 20) {
            console.log(`[PATIENT-${this.currentUser?.peerId}] Unity game (Grill) started - using existing skeleton tracking`);
            console.log(`[PATIENT-${this.currentUser?.peerId}] Camera stream status:`, {
              localVideo: !!this.localVideo,
              localStream: !!this.localStream,
              videoSrcObject: !!this.localVideo?.srcObject,
              videoPaused: this.localVideo?.paused,
              videoReadyState: this.localVideo?.readyState
            });
            
            // Ensure skeleton tracking is enabled for Unity games
            if (this.isBodyTrackingAvailable && !this.trackBody) {
              console.log(`[PATIENT-${this.currentUser?.peerId}] Enabling skeleton tracking for Unity game`);
              this.trackBody = true;
              if (therapistToPatientConnection) {
                therapistToPatientConnection.send({ type: 'track_body', payload: this.trackBody });
              }
              this.handlePosenetLoad();
            }
          } else {
            console.log(`[PATIENT-${this.currentUser?.peerId}] Game started but localVideo not available yet`);
          }
        }
        if (therapistToPatientConnection) {
          therapistToPatientConnection.send(this.getGameUrlMessage(isInGame));
        }
      })
    );
    this.subscription.add(
      this.gameId$.subscribe((gameId) => {
        const previousGameId = this.gameId;
        this.gameId = gameId;
        
        // Reset Unity canvas flag if game changed away from Grill
        if (previousGameId === 20 && gameId !== 20) {
          console.log(`[PATIENT-${this.currentUser?.peerId}] Game changed away from Grill, resetting Unity canvas stream flag`);
          this.unityCanvasStreamActive = false;
          // Stop and clear the canvas stream reference
          if (this.unityCanvasStream) {
            this.unityCanvasStream.getVideoTracks().forEach(track => track.stop());
            this.unityCanvasStream = null;
          }
        }
        
        if (this.gameId === 20 && this.currentCall && this.currentCall.peerConnection) {
          // Reset canvas active flag when switching to Grill to ensure fresh start
          this.unityCanvasStreamActive = false;
          // Close any existing canvas call to ensure fresh connection
          try {
            if (this.canvasCall) {
              try { this.canvasCall.close?.(); } catch (_) {}
              this.canvasCall = null;
            }
          } catch (_) {}
          // Stop old canvas stream
          try {
            if (this.unityCanvasStream) {
              this.unityCanvasStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
              this.unityCanvasStream = null as any;
            }
          } catch (_) {}
          
          setTimeout(async () => {
            await this.replaceVideoStream(false);
          }, 300);
          
          // Also start polling to ensure canvas call is created even if unity-canvas-ready doesn't fire
          let pollTries = 0;
          const maxPollTries = 30;
          const canvasPoll = setInterval(async () => {
            pollTries++;
            if (this.gameId !== 20 || this.unityCanvasStreamActive) {
              clearInterval(canvasPoll);
              return;
            }
            try {
              const canvas = document.getElementById('unity-canvas') as HTMLCanvasElement | null;
              if (canvas && typeof (canvas as any).captureStream === 'function') {
                await this.replaceVideoStream(false);
                clearInterval(canvasPoll);
              }
            } catch (_) {}
            if (pollTries >= maxPollTries) {
              clearInterval(canvasPoll);
            }
          }, 1000);
        }
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

    /* this.patientWebRtcService.therapistInfo$.subscribe(info => {
      this.connectedTherapist = info;
    });
    */
    this.subscription.add(
      this.gameSettingsService.gameSettings$.subscribe((settings) => {
        if (settings) {
          this.handleGameSettings(settings);
        }
      })
    );

    this.skeltonVideoService.gameVideoElement$.subscribe(async (iframeaction) => {
      if (typeof iframeaction === 'string' ) {
        const action = JSON.parse(iframeaction);
        if (action.msg && action.msg.gameSummaryContent == 'Session Ended') {
          console.log(`[PATIENT-${this.currentUser?.peerId}] Session Ended detected! Sending game summary immediately`);
          this.videoTitle = this.currentGameSettings[this.videoIndex]?.Title?.trim();
          this.clipId = this.currentGameSettings[this.videoIndex]?.fileName?.trim();
          this.video_fdk_level = this.currentGameSettings[this.videoIndex]?.video_feedback_level?.trim();
          const results = await this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
          
          // Calculate final score from the results
          const mainComments = results.filter((data) => data.PatientTimestamp != undefined);
          const allAnalysis = results.flatMap(r => r.Analysis);
          const mainLength = allAnalysis.length;
          const performedAnalysis = mainComments.flatMap(r => r.Analysis);
          const updateLength = performedAnalysis.filter(a => a.Condition === 'Good').length;
          const finalScore = mainLength > 0 ? Math.floor((updateLength / mainLength) * 100) : 0;
          
          console.log(`[PATIENT-${this.currentUser?.peerId}] Session end data:`, {
            round: (this.videoIndex ?? 0) + 1,
            score: finalScore,
            clipId: this.clipId,
            clipName: this.videoTitle,
            settings: this.video_fdk_level,
            summary: this.clipSummary,
            CheckpointsArray: results,
          });
          
          // Send game summary immediately for session end (not debounced)
          this.sendGameSummaryImmediate({
            round: (this.videoIndex ?? 0) + 1,
            score: finalScore, // Use calculated score instead of barPercentage
            clipId: this.clipId,
            clipName: this.videoTitle,
            settings: this.video_fdk_level,
            summary: this.clipSummary,
            CheckpointsArray: results,
          });
          
          this.resetTracking();
        }
        if (action.msg && action.msg.type == 'pause_video') {
          this.showMarker = false;
        }
        if (action.msg && action.msg.data && action.msg.data.shouldPlay) {
          this.duration = action.msg.data.currentPlayTime.duration;
          this.videoTime = action.msg.data.currentPlayTime.vidTime;
          this.currentPlayTime = new Date(action.msg.data.currentPlayTime.sysTime).getSeconds();
          if (this.videoIndex == action.msg.data.index) {
            this.showMarker = true;
            this.startTime = Date.now() - Math.floor(this.videoTime * 1000);
            // const closestVideoIndex = this.videoMinMax.reduce((closestIdx, currentItem, currentIndex, array) => {
            //   const currentDiff = Math.abs(currentItem[0] - this.videoTime);
            //   const closestDiff = Math.abs(array[closestIdx][0] - this.videoTime);
            //   return currentDiff < closestDiff ? currentIndex : closestIdx;
            // }, 0);
            // const closestPatientIndex = this.matchingCameraData.reduce((closestIdx, currentItem, currentIndex, array) => {
            //   const currentDiff = Math.abs(+currentItem.timestamp - this.videoTime);
            //   const closestDiff = Math.abs(+array[closestIdx].timestamp - this.videoTime);
            //   return currentDiff < closestDiff ? currentIndex : closestIdx;
            // }, 0);
            // this.currentVideoIndex = closestVideoIndex;
            // this.matchingCameraData = this.matchingCameraData.slice(0, closestPatientIndex);
            this.cdr.detectChanges();
            
            // Also set showProgressBar to true in the IF block since this is the path being taken
            this.skeltonProgressBarService.setShowProgressBar('true');
          } else {
            // New video/round starting - reset only score bar display, not tracking data
            console.log(`[PATIENT-${this.currentUser?.peerId}] New video/round starting - resetting score bar display only`);
            
            // Reset only the score bar display (visual percentage)
            this.skeltonProgressBarService.setBarElement('' + 0);
            this.barPercentage = 0;
            this.barThumbsUp = 0;
            
            // Send reset message to therapist for score bar display
            if (therapistToPatientConnection) {
              console.log(`[PATIENT-${this.currentUser?.peerId}] Sending score bar reset to therapist: 0%`);
              therapistToPatientConnection.send({
                type: 'progress_bar',
                data: { userId: this.currentUser, barPercentage: 0, barThumbsUp: 0, showProgressBar: 'true' },
              });
            }
            
            const videoName = action.msg?.data?.source?.split('/').at(-2);
            this.skeltonProgressBarService.setShowProgressBar('true');
            // this.ajaxService.getGameMetaData(videoName).subscribe(async (gamesettings) => {
            //   if (gamesettings.length > 0) {
            this.firstTimeSpeech = true;

            if (this.videoSeconds == 0) {
              this.videoSeconds = this.currentPlayTime;
            }

            if (
              Math.abs(this.videoSeconds - this.currentPlayTime) > 1 ||
              this.videoTime > 0 ||
              action.msg.data.index > 0
            ) {
              this.videoSeconds = this.currentPlayTime;
              if (!this.startTime) {
                this.startTime = Date.now();
              }
          
              
              if (this.videoIndex != action.msg.data.index) {
                console.log(`[PATIENT-${this.currentUser?.peerId}] Video index changing from ${this.videoIndex} to ${action.msg.data.index}`);
                if (this.videoIndex > -1) {
                  if (this.videoIndex != undefined && this.currentGameSettings) {
                    this.videoTitle = this.currentGameSettings[this.videoIndex]?.Title?.trim();
                    this.clipId = this.currentGameSettings[this.videoIndex]?.fileName?.trim();
                    this.video_fdk_level = this.currentGameSettings[this.videoIndex]?.video_feedback_level?.trim();
                  }
                  const results = await this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
                  console.log('[STUDIO DEBUG] Raw results from matchClipAndPatientData:', results);
                  console.log('[STUDIO DEBUG] Results type:', typeof results);
                  console.log('[STUDIO DEBUG] Results is array:', Array.isArray(results));
                  
                  // Calculate final score from the results
                  const mainComments = results.filter((data) => data.PatientTimestamp != undefined);
                  const allAnalysis = results.flatMap(r => r.Analysis);
                  const mainLength = allAnalysis.length;
                  const performedAnalysis = mainComments.flatMap(r => r.Analysis);
                  const updateLength = performedAnalysis.filter(a => a.Condition === 'Good').length;
                  const finalScore = mainLength > 0 ? Math.floor((updateLength / mainLength) * 100) : 0;
                  
                  console.log(`[PATIENT-${this.currentUser?.peerId}] Round completed - sending game summary for round ${(this.videoIndex ?? 0) + 1}`);
                  console.log(`[PATIENT-${this.currentUser?.peerId}] Calculated final score: ${finalScore}%`);
                  console.log(`[PATIENT-${this.currentUser?.peerId}] Current barPercentage: ${this.barPercentage}`);
                  console.log(`[PATIENT-${this.currentUser?.peerId}] Current barThumbsUp: ${this.barThumbsUp}`);
                  
                  this.sendGameSummary({
                    round: (this.videoIndex ?? 0) + 1,
                    score: finalScore, // Use calculated score instead of barPercentage
                    clipId: this.clipId,
                    clipName: this.videoTitle,
                    settings: this.video_fdk_level,
                    summary: this.clipSummary,
                    CheckpointsArray: results, // This should be an array of objects
                  });
                  this.lastVideoMinMax = this.videoMinMax;
                  this.resetTracking();
                }

                this.currentVideoIndex = 0;
                this.startTime = Date.now();
                this.videoIndex = action.msg.data.index;
                this.videoMinMax = this.gameMetadata[this.videoIndex];
                const combinedLandmarks = Array.from(new Set(this.videoMinMax.flatMap(arr => arr.slice(1).filter(entry => entry[1]).flatMap(entry => entry[1]))));
                // console.log(combinedLandmarks, "combinedLandmarks");
                this.landmarks = combinedLandmarks;
                this.initializeCameraPoseModels()
                this.lastVideoName = videoName;
              }
            }
          }
        }
      }
    });
  }

  handleGameSettings(settings: any) {
    this.currentGameSettings = settings;
    // Example: Set posture range
    if (settings[0]?.postureRange) {
      this.leftPostureRange = settings[0].postureRange.left || [];
      this.rightPostureRange = settings[0].postureRange.right || [];
    }
  }

  sendGameSummary = debounce((summaryData: any) => {
    console.log('[STUDIO DEBUG] sendGameSummary (debounced) called with:', summaryData);
    console.log('[STUDIO DEBUG] Summary score value:', summaryData.score);
    console.log('[STUDIO DEBUG] Summary score type:', typeof summaryData.score);
    console.log('[STUDIO DEBUG] CheckpointsArray type:', typeof summaryData.CheckpointsArray);
    console.log('[STUDIO DEBUG] CheckpointsArray is array:', Array.isArray(summaryData.CheckpointsArray));
    console.log('[STUDIO DEBUG] CheckpointsArray content:', summaryData.CheckpointsArray);
    console.log('[STUDIO DEBUG] Current gameScoreSummaryData length before push:', this.gameScoreSummaryData.length);
    
    const token = this.ngRedux.getState().global.gameSessionToken;
    this.gameScoreSummaryData.push(summaryData);
    console.log('[STUDIO DEBUG] After push, gameScoreSummaryData length:', this.gameScoreSummaryData.length);
    console.log('[STUDIO DEBUG] gameScoreSummaryData content:', this.gameScoreSummaryData);
    
    // Update patient-specific score data
    if (this.currentUser?.peerId) {
      console.log(`[PATIENT] Adding score for patient ${this.currentUser.peerId}:`, summaryData);
      this.patientScoreService.addPatientScore(this.currentUser.peerId, summaryData);
    } else {
      // console.log('[PATIENT] No peerId available for patient');
    }
    
    const payload = {
      gameSummary: {
        gameScore: summaryData,                // always present
        compScore: {}          // if missing, send empty object
      },
      token: token
    };
    this.ajaxService.updateGameSummary(payload).subscribe((res) => {
      console.log('[STUDIO DEBUG] Game summary sent successfully (debounced):', res);
    }, (error) => {
      console.error('[STUDIO DEBUG] Error sending game summary (debounced):', error);
    });
    
    // Send score data via WebRTC to therapist
    if (therapistToPatientConnection) {
      const scoreMessage = {
        type: 'patient_score_data',
        patientPeerId: this.currentUser?.peerId,
        scoreData: summaryData,
        timestamp: new Date().toISOString()
      };
      
      // Send as object directly (not JSON string)
      try {
        therapistToPatientConnection.send(scoreMessage);
        console.log('[STUDIO DEBUG] Score message sent to therapist successfully (debounced)');
      } catch (error) {
        console.error(`[PATIENT] Error sending score message:`, error);
      }
    }
  }, 5000);

  sendGameSummaryImmediate(summaryData: any) {   
    const token = this.ngRedux.getState().global.gameSessionToken;
    
    this.gameScoreSummaryData.push(summaryData);
   
    // Update patient-specific score data
    if (this.currentUser?.peerId) {
      this.patientScoreService.addPatientScore(this.currentUser.peerId, summaryData);
    } else {
      // console.log('[PATIENT] No peerId available for patient');
    }
    
    const payload = {
      gameSummary: summaryData,
      token: token,
    };
    this.ajaxService.updateGameSummary(payload).subscribe((res) => {
      console.log('[STUDIO DEBUG] Game summary sent successfully:', res);
    }, (error) => {
      console.error('[STUDIO DEBUG] Error sending game summary:', error);
    });
    
    // Send score data via WebRTC to therapist
    if (therapistToPatientConnection) {
      const scoreMessage = {
        type: 'patient_score_data',
        patientPeerId: this.currentUser?.peerId,
        scoreData: summaryData,
        timestamp: new Date().toISOString()
      };
      
      // Send as object directly (not JSON string)
      try {
        therapistToPatientConnection.send(scoreMessage);
        //console.log('[STUDIO DEBUG] Score message sent to therapist successfully');
      } catch (error) {
        console.error(`[PATIENT] Error sending score message:`, error);
      }
    }
  }
  private drawSeatFrame(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    results: any
  ) {
    if (this.countdownActive) return; 
    this.countdownActive = true;  
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const img = new Image();
    img.src = "../../../../assets/skel/bgimagevideo.png"; // silhouette 
  
    img.onload = () => {
      const frameduration = 4 * 1000; // 4s countdown
      const framestart = Date.now();
      let lastCountdown = -1;
      let angleCaptured = false;  
      const draw = () => {
        const frameelapsed = Date.now() - framestart;
        const frameremaining = Math.max(0, frameduration - frameelapsed);  
        // ✅ stable countdown
        const framecountdown = Math.max(0, Math.floor(frameremaining / 1000));  
        // 🔹 only log/draw when it actually changes
        if (framecountdown !== lastCountdown) {
          console.log("=framecountdown===", framecountdown);
          lastCountdown = framecountdown;
        }  
        ctx.clearRect(0, 0, width, height);  
        // background
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);  
        // video
        ctx.drawImage(video, 0, 0, width, height);  
        // mask
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
  
        // faint silhouette
        ctx.globalAlpha = 0.1;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
  
        // countdown circle
        if (framecountdown >= 0) {
          const radius = 30;
          const cx = width / 2;
          const cy = height - 60;
          const circleWidth = 5;  
          // bg circle
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = circleWidth;
          ctx.stroke();  
          // progress arc
          const progress = frameremaining / frameduration;
          const endAngle = -Math.PI / 2 + (1 - progress) * 2 * Math.PI;  
          ctx.beginPath();
          ctx.arc(cx, cy, radius, -Math.PI / 2, endAngle);
          ctx.strokeStyle = "white";
          ctx.lineWidth = circleWidth;
          ctx.shadowColor = "white";
          ctx.shadowBlur = 15;
          ctx.stroke();  
          // number
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = "white";
          ctx.font = "bold 22px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(framecountdown.toString(), cx, cy);
        }  
        // pose capture when reaches 0
        if (framecountdown === 0 && !angleCaptured) {
          if (results && !this.baselineCaptured) {
            this.captureBaselinePose(results);
            angleCaptured = true;
          }
        }  
        // keep looping until finished
        if (frameelapsed < frameduration) {
          requestAnimationFrame(draw);
        } else {
          ctx.clearRect(0, 0, width, height);
          this.countdownActive = false; // ✅ allow next countdown
        }
      };  
      draw();
    };
  }
   
   
  private captureBaselinePose(results: any) {
    if (!results.poseLandmarks) return;
  
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    if (!leftShoulder || !rightShoulder) return;
  
    // ✅ Save baseline positions only
    this.baselineLeftShoulder = { 
      x: leftShoulder.x, 
      y: leftShoulder.y, 
      z: leftShoulder.z 
    };
    this.baselineRightShoulder = { 
      x: rightShoulder.x, 
      y: rightShoulder.y, 
      z: rightShoulder.z 
    };
  
    this.baselineCaptured = true;
    this.baselineCaptureInit = false;
  
    console.log("📍 Baseline Left Shoulder:", this.baselineLeftShoulder);
    console.log("📍 Baseline Right Shoulder:", this.baselineRightShoulder);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes.startTracking) {
      // console.log("changes occured===",changes.startTracking);
      if (this.startTracking) {
        // console.log("====game loaded compensation flag ",this.startTracking);
        this.startAngleTracking=true; 
      } else {
        this.startAngleTracking=false;
      }
    }
    if (changes['gameSummary']?.currentValue) {
      const summary = changes['gameSummary'].currentValue;
      // console.log("✅ Received game summary in WebRtcVideoComponent:", summary);
  
      const currentRoundAlerts = this.compensationAlerts.filter(a => a.round === this.roundNumber);
  
      const payload = {
        gameScore: summary,
        compScore: currentRoundAlerts.length > 0
          ? {
              round: this.roundNumber,
              leftElbowComp: this.roundLeftElbowTotal,
              rightElbowComp: this.roundRightElbowTotal,
              leftShoulderComp: this.roundLeftShoulderTotal,
              rightShoulderComp: this.roundRightShoulderTotal,
              trunkLeftComp: this.roundTrunkLeftTotal,
              trunkRightComp: this.roundTrunkRightTotal,
              trunkForwardComp: this.roundTrunkForwardTotal,
              trunkBackwardComp: this.roundTrunkBackwardTotal,              
              settings: this.compSettings
            }
          : {}          
      };
      console.log("Saved before value ",payload);
      const token = this.ngRedux.getState().global.gameSessionToken;
      const payload1 = {gameSummary:payload,token:token}  
      this.ajaxService.updateGameSummary(payload1).subscribe((res) => {
        console.log('Game summary submitted:', res);
      });
  
      // ✅ Prepare for next round
      this.roundNumber += 1;
      this.roundLeftElbowTotal = 0;
      this.roundRightElbowTotal = 0;
      this.roundLeftShoulderTotal = 0;
      this.roundRightShoulderTotal = 0;
      this.roundTrunkLeftTotal = 0;
      this.roundTrunkRightTotal = 0;
      this.roundTrunkForwardTotal = 0;
      this.roundTrunkBackwardTotal = 0;  
      this.leftElbowCounter = 0;
      this.rightElbowCounter = 0;
      this.leftShoulderCounter = 0;
      this.rightShoulderCounter = 0;
      this.trunkLeftCounter = 0;
      this.trunkRightCounter = 0;
      this.trunkForwardCounter = 0;
      this.trunkBackwardCounter = 0;  
      this.compensationAlerts = [];
      this.lastCheckTime = Date.now();  
      console.log(`🔄 Round ${this.roundNumber} started after summary`);
    }
  
    if (changes['gameId'] && this.currentUser?.patientId && changes['gameId'].currentValue) {
      const newGameId = changes['gameId'].currentValue;
      this.roundNumber = 1;
      this.roundLeftElbowTotal = 0;
      this.roundRightElbowTotal = 0;
      this.roundLeftShoulderTotal = 0;
      this.roundRightShoulderTotal = 0;
      this.roundTrunkLeftTotal = 0;
      this.roundTrunkRightTotal = 0;
      this.roundTrunkForwardTotal = 0;
      this.roundTrunkBackwardTotal = 0;  
      this.leftElbowCounter = 0;
      this.rightElbowCounter = 0;
      this.leftShoulderCounter = 0;
      this.rightShoulderCounter = 0;
      this.trunkLeftCounter = 0;
      this.trunkRightCounter = 0;
      this.trunkForwardCounter = 0;
      this.trunkBackwardCounter = 0;  
      this.compensationAlerts = [];
      this.lastCheckTime = Date.now();
  
      console.log(`🎮 New Game (${newGameId}) started → Round ${this.roundNumber} initialized`);
        // show the video to seat in frame for each new game       
        this.baselineCaptureInit=true;
        this.baselineCaptured=false;
      this.compSettingsLoaded = false;
      this.loadCompSettings(this.currentUser.patientId, newGameId);
    }
    if (changes.currentGameName?.currentValue) {
      //console.log('[SESSION DEBUG] currentGameName changed from', changes.currentGameName.previousValue, 'to', changes.currentGameName.currentValue);
      this.currentGameName = changes.currentGameName.currentValue;
      // Show session scorebar only when studio game is active and not screen sharing
      this.shouldShowSessionScorebar = this.currentGameName === 'studio' && !this.isShareScreen;
     // console.log('[SESSION DEBUG] shouldShowSessionScorebar set to:', this.shouldShowSessionScorebar);
      
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
      //console.log('[SESSION DEBUG] Change detection triggered in ngOnChanges');
      
      // Clear game score summary data when leaving studio game
      if (this.currentGameName !== 'studio') {
        //console.log('[SESSION DEBUG] Leaving studio game, manually hiding session progress bar');
        
        // Manual approach that works - hide ALL scores-bar-container elements
        const scoresBarContainers = document.querySelectorAll('.scores-bar-container');
        //console.log('[SESSION DEBUG] Found', scoresBarContainers.length, 'scores-bar-container elements in ngOnChanges');
        
        scoresBarContainers.forEach((container, index) => {
         // console.log('[SESSION DEBUG] Manually hiding scores-bar-container', index + 1, 'from ngOnChanges');
          (container as HTMLElement).style.display = 'none';
        });
      } else {
        // Ensure session scorebar is only shown for studio game
        this.shouldShowSessionScorebar = this.currentGameName === 'studio' && !this.isShareScreen;
        //console.log('[SESSION DEBUG] In studio game, shouldShowSessionScorebar:', this.shouldShowSessionScorebar);
        
        // Show session progress bar for studio game
        if (this.shouldShowSessionScorebar) {
          //console.log('[SESSION DEBUG] Studio game detected - showing session progress bar via Angular');
          
          // Simple Angular approach - just ensure data is fresh
          this.gameScoreSummaryData = [];
          
          // Force change detection to update UI
          this.cdr.detectChanges();
          
          // ALWAYS move session progress bar below video - every time we show it
          setTimeout(() => {
           // console.log('[SESSION DEBUG] Calling ensureSessionScorebarPosition from ngOnChanges');
            this.ensureSessionScorebarPosition();
          }, 300);
          
          // Additional call with longer delay to ensure it works
          setTimeout(() => {
           // console.log('[SESSION DEBUG] Calling ensureSessionScorebarPosition again with longer delay');
            this.ensureSessionScorebarPosition();
          }, 600);
        }
      }
      
      // Session scorebar positioning is now handled by CSS flexbox order
      
      // Ensure session progress bar visibility is correct
      setTimeout(() => {
        this.updateSessionProgressBarVisibility();
      }, 50);
      
      if (therapistToPatientConnection) {
        therapistToPatientConnection.send({ type: 'update_game_name', gameName: this.currentGameName });
      }
    }
    
    if (changes.isShareScreen?.currentValue !== undefined) {
     // console.log('[SESSION DEBUG] isShareScreen changed to:', changes.isShareScreen.currentValue);
      this.isShareScreen = changes.isShareScreen.currentValue;
      // Hide session scorebar when screen sharing is active
      this.shouldShowSessionScorebar = this.currentGameName === 'studio' && !this.isShareScreen;
     // console.log('[SESSION DEBUG] After isShareScreen change - shouldShowSessionScorebar:', this.shouldShowSessionScorebar);
      
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
     // console.log('[SESSION DEBUG] Change detection triggered for isShareScreen change');
      
      // Ensure session progress bar visibility is correct
      setTimeout(() => {
        this.updateSessionProgressBarVisibility();
      }, 50);
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

  onGameSelected(game: any) {
    console.log('Selected Game in Parent:', game);
  }

  ensureSessionScorebarPosition() {
   // console.log('[SESSION DEBUG] ensureSessionScorebarPosition called');
    
    // Only proceed if session scorebar should be shown
    if (!this.shouldShowSessionScorebar) {
      console.log('[SESSION DEBUG] Session scorebar should not be shown, skipping positioning');
      return;
    }
    
    const sessionScorebar = document.querySelector('app-session-scorebar');
    const videosWrapper = document.querySelector('.videos-wrapper');    
   
    
    if (sessionScorebar && videosWrapper) {
      console.log('[SESSION DEBUG] Elements found, ensuring correct positioning');
      
      // Check if session scorebar is already positioned correctly
      const isCorrectlyPositioned = sessionScorebar.parentNode === videosWrapper.parentNode && 
                                   sessionScorebar.previousElementSibling === videosWrapper;
      
      if (!isCorrectlyPositioned) {
        console.log('[SESSION DEBUG] Repositioning session scorebar below video');
        videosWrapper.parentNode?.insertBefore(sessionScorebar, videosWrapper.nextSibling);
        console.log('[SESSION DEBUG] Session scorebar repositioned');
      } else {
        console.log('[SESSION DEBUG] Session scorebar already positioned correctly');
      }
    } else {
      console.log('[SESSION DEBUG] Elements not found');
    }
  }

  async ngOnInit() {
    if (this.isMobile) {
      this.THERAPIST_REGULAR_VIDEO_CLASS = 'therapist-video-regular-video-mobile';
      this.THERAPIST_ENLARGE_VIDEO_CLASS = 'therapist-video-enlarge-video-mobile';
    }
    // console.log('updateP0');
    // Set initial status to unavailable
    this.updatePatientAvailabilityStatus('unavailable');
    
    // Initialize session scorebar visibility based on current game name and screen sharing status
    // console.log('[SESSION DEBUG] ngOnInit - currentGameName:', this.currentGameName);
    // console.log('[SESSION DEBUG] ngOnInit - isShareScreen:', this.isShareScreen);
    this.shouldShowSessionScorebar = this.currentGameName === 'studio' && !this.isShareScreen;
    // console.log('[SESSION DEBUG] ngOnInit - shouldShowSessionScorebar set to:', this.shouldShowSessionScorebar);
    
    // Make component globally accessible for testing
    (window as any).webRtcVideoComponent = this;
    // console.log('[SESSION DEBUG] Component made globally accessible as window.webRtcVideoComponent');
    
    // Move session scorebar below video after view init - ALWAYS call this
    setTimeout(() => {
      // console.log('[SESSION DEBUG] Calling ensureSessionScorebarPosition from ngOnInit');
      this.ensureSessionScorebarPosition();
    }, 100);
    
    // Additional call to ensure it works every time
    setTimeout(() => {
      // console.log('[SESSION DEBUG] Calling ensureSessionScorebarPosition again from ngOnInit');
      this.ensureSessionScorebarPosition();
    }, 500);
    
    // Ensure session progress bar visibility is correct after initialization
    setTimeout(() => {
      this.updateSessionProgressBarVisibility();
    }, 150);

    // If Grill canvas notifies readiness, ALWAYS create a fresh canvas call to avoid stale connections
    window.addEventListener('unity-canvas-ready', async () => {
      try {
        console.log('[GRILL] unity-canvas-ready event received, gameId:', this.gameId, 'patientPeer:', !!this.patientPeer, 'therapistId:', !!this.therapistId);
        if (this.gameId === 20 && this.patientPeer && this.therapistId) {
          console.log('[GRILL] Creating fresh canvas call on unity-canvas-ready');
          // Always close old canvas call first to ensure fresh connection
          try {
            if (this.canvasCall) {
              console.log('[GRILL] Closing old canvas call');
              try { this.canvasCall.close?.(); } catch (_) {}
              this.canvasCall = null;
            }
          } catch (_) {}
          // Stop old canvas stream
          try {
            if (this.unityCanvasStream) {
              this.unityCanvasStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
            }
          } catch (_) {}
          this.unityCanvasStream = null as any;
          this.unityCanvasStreamActive = false;
          
          // Now create fresh canvas call
          if (this.currentCall && this.currentCall.peerConnection) {
            console.log('[GRILL] Calling replaceVideoStream to create canvas call');
            await this.replaceVideoStream(false);
          } else {
            console.warn('[GRILL] currentCall not available, cannot create canvas call');
          }
        } else {
          console.warn('[GRILL] unity-canvas-ready but conditions not met:', { gameId: this.gameId, hasPatientPeer: !!this.patientPeer, hasTherapistId: !!this.therapistId });
        }
      } catch (e) {
        console.error('[GRILL] Error in unity-canvas-ready handler:', e);
      }
    });
    // If Grill is quitting/restarting, proactively clear canvas stream and notify therapist
    window.addEventListener('unity-canvas-quit', () => {
      try {
        console.log('[GRILL] unity-canvas-quit event received');
        this.handleUnityCanvasEnded();
      } catch (_) {}
    });
    
    // Start global polling for Grill canvas (runs regardless of gameId changes)
    // This ensures canvas call is created even if unity-canvas-ready doesn't fire
    setInterval(async () => {
      try {
        if (this.gameId === 20 && this.patientPeer && this.therapistId && this.currentCall && this.currentCall.peerConnection) {
          // Only poll if canvas is not active
          if (!this.unityCanvasStreamActive) {
            const canvas = document.getElementById('unity-canvas') as HTMLCanvasElement | null;
            if (canvas && typeof (canvas as any).captureStream === 'function') {
              console.log('[GRILL] Polling detected canvas, creating call');
              await this.replaceVideoStream(false);
            }
          }
        }
      } catch (_) {}
    }, 2000); // Check every 2 seconds

    // Lightweight polling: if Grill is active, periodically attempt to attach Unity canvas
    if (this.gameId === 20) {
      let tries = 0;
      const maxTries = 30; // ~30s
      const poll = setInterval(async () => {
        tries++;
        if (this.unityCanvasStreamActive || this.gameId !== 20) {
          clearInterval(poll);
          return;
        }
        try {
          const canvas = document.getElementById('unity-canvas') as HTMLCanvasElement | null;
          if (canvas && this.currentCall && this.currentCall.peerConnection) {
            await this.replaceVideoStream(false);
          }
        } catch (_) {}
        if (tries >= maxTries) {
          clearInterval(poll);
        }
      }, 1000);
    }

    // Check for camera and microphone
    this.userHasCamera = await this.hasUserCamera();
    this.userHasMicrophone = await this.hasUserMicrophone();
    this.isCameraCheckComplete = true;

    // Handle camera availability
    this.handleCameraAvailability();

    // Handle mobile availability
    this.handleMobileAvailability(this.isMobile);

    // For mobile devices, wait 22 seconds before making available
    if (this.isMobile) {
      setTimeout(() => {
        if (!this.currentUser.isDoNotDisturb) {
          this.updatePatientAvailabilityStatus('available');
        }
      }, 22000);
    }

    // For desktop, wait for MediaPipe hand detection
    if (!this.isMobile) {
      // Check model initialization status periodically
      const checkModelInterval = setInterval(() => {
        if (
          this.webCamSkeletonService.modelInitialized &&
          this.posenetLoadingTimePassed &&
          !this.currentUser.isDoNotDisturb
        ) {
          this.updatePatientAvailabilityStatus('available');
          clearInterval(checkModelInterval);
        }
      }, 1000);
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
              // For Grill game, always use Unity canvas, not skeleton
              if (this.gameId === 20) {
                this.replaceVideoStream(false);
              } else {
                this.replaceVideoStream(true);
              }
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
    // console.log('[SESSION DEBUG] ngAfterViewInit called');
    
    // Ensure session progress bar is positioned correctly after view init
    setTimeout(() => {
      this.ensureSessionScorebarPosition();
    }, 100);
    
    setTimeout(() => {
      this.ensureSessionScorebarPosition();
    }, 500);
    
    // const iframeVideo = document.getElementById('game-video-iframe');
    // iframeVideo.onload = () => {
    //   this.videoPlayer = iframeVideo['contentWindow'].document.body.getElementsByTagName('video')[0];
    //   console.log("this.videoPlayer===", this.videoPlayer);
    // };
    this.skeletonBtn = document.getElementById('skeleton-border-wrap');
    this.skeletonLoadingBar();

    // if (this.currentUser.id == 1802 || this.currentUser.id == 1793) {
    // this.initializeCamera();
    this.initializePoseModels();
    // }
  }

  ngAfterViewChecked() {
    // Only run if session scorebar should be shown
    if (this.shouldShowSessionScorebar) {
      this.ensureSessionScorebarPosition();
    }
  }

  handleCameraAvailability() {
    clearInterval(this.searchCameraInterval);
    this.ajaxService.updatePatientCameraAvailability(this.currentUser.patientId, this.userHasCamera);
    this.isCameraCheckComplete = true;

    // If no camera is available, keep status as unavailable
    if (!this.userHasCamera) {
      console.log('updateP6');
      this.updatePatientAvailabilityStatus('unavailable');
    }
  }

  handleMobileAvailability(isMobile) {
    console.log('going to save mobile device', isMobile);
    this.ajaxService.updatePatientMobileAvailability(this.currentUser.patientId, isMobile);
  }

  skeletonLoadingBar = () => {
    console.log('skeletonLoadingBar called');
    if (this.isMobile) {
      return;
    }

    const loadBar = document.getElementById('loadingBar');
    const loadBarWrapper = document.getElementById('loadingBarWrapper');
    if (!loadBar || !loadBarWrapper) {
      return;
    }

    const startPercentage = 2;
    const maxPercentage = 95;
    const totalDuration = 5000;
    const intervalDelay = 100;
    const wrapperWidth = parseInt(getComputedStyle(loadBarWrapper).width);

    const startTime = Date.now();
    const loadingBarInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      this.loadingBarPercentage = Math.round(startPercentage + (maxPercentage - startPercentage) * progress);
      const currentWidth = (wrapperWidth * this.loadingBarPercentage) / 100;
      loadBar.style.width = `${currentWidth} px`;

      if (progress >= 1) {
        clearInterval(loadingBarInterval);
      }
    }, intervalDelay);
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
      'video/mp4',
    ];

    function getSupportedMimeType(): string | null {
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          return mimeType;
        }
      }
      return null; // No supported MIME type found
    }
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
    navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
      const audioTracks = stream.getAudioTracks();
      this.localStream.addTrack(audioTracks[0]);
      if (this.localStream.getAudioTracks()[0].muted) {
        this.handleMicMute();
      }
      this.monitorMicAudio();
    });
  };

  switchVideoStream(isDepth) {
    // CRITICAL: For Grill game, don't allow switchVideoStream to interfere with Unity canvas
    if (this.gameId === 20 && this.unityCanvasStreamActive) {
      console.log(`[PATIENT-${this.currentUser?.peerId}] ⚠️ Unity canvas stream active for Grill game, ignoring switchVideoStream call`);
      return;
    }
    
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
        (this.remoteVideo as any).srcObject = stream;
      } else if (navigator['mozGetUserMedia']) {
        (this.remoteVideo as any).mozSrcObject = stream;
      } else {
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

  async startAudioRecording(stream): Promise<void> {
    try {
      //console.log("therapist data stream:", stream);
      //const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      //console.log("Local stream:", localStream);
      // console.log("Remote stream:", stream);
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // Reduces echo
          noiseSuppression: true, // Reduces ambient noise
          autoGainControl: true, // Normalizes volume levels
        },
      });
      // console.log("Local stream:", localStream);
      const audioContext = new AudioContext();

      // Create sources for local and remote streams.
      const localAudioSource = audioContext.createMediaStreamSource(localStream);
      const remoteAudioSource = audioContext.createMediaStreamSource(stream);
      // Create a destination for the combined audio.
      const audioDestination = audioContext.createMediaStreamDestination();
      // Connect both audio sources to the destination.
      localAudioSource.connect(audioDestination);
      remoteAudioSource.connect(audioDestination);
      // The combined audio stream.
      const combinedStream = audioDestination.stream;
      // console.log("Combined stream:", combinedStream);
      // recording the combined audio stream using your audioRecordingService.
      this.audioRecordingService.startRecording(combinedStream);
    } catch (error) {
      console.error('Error starting audio recording:', error);
    }
  }

  async stopAudioRecording(): Promise<void> {
    try {
      const audioFile = await this.audioRecordingService.stopRecording();
      console.log('Recording complete. Audio file:', audioFile);
      let file: File;
      if (audioFile instanceof Blob && !(audioFile instanceof File)) {
        file = new File([audioFile], 'recording.mp3', { type: 'audio/mpeg' });
      } else {
        file = audioFile as File;
      }
      this.ajaxService.uploadCallAudioSession(file, this.currentUser.patientId, this.therapistId).subscribe({
        next: (response) => {
          console.log('File uploaded successfully:', response);
          /*if (response.summary) {
            // ✅ Send summary to therapist via data connection
            console.log("=====summary",response.summary);
            if (therapistToPatientConnection && therapistToPatientConnection.send) {
              console.log("=====going to send in socket ",response.summary);
              therapistToPatientConnection.send({
                type: 'transcript_summary',
                msg: response.summary,
              });
            }
            console.log("===after send summary to therapist====",therapistToPatientConnection);             
          }*/
        },
        error: (error) => {
          console.error('Error uploading file:', error);
        },
      });
    } catch (error) {
      console.error('Error stopping audio recording:', error);
    }
  }

  downloadRecordedFile(file: File) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name; // File name, e.g., 'recording.mp3'
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url); // Cleanup after the download
  }

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
      (this.remoteVideo as any).srcObject = stream;
    } else if (navigator['mozGetUserMedia']) {
      (this.remoteVideo as any).mozSrcObject = stream;
    } else {
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
            //this.processVideoFrames();
            if (this.isBodyTrackingAvailable) {
              const patientCanvasId = 'patient-canvas';
              console.log(`[PATIENT-${this.currentUser?.peerId}] Initializing pose detection with canvas: ${patientCanvasId}`);
              this.webCamSkeletonService.bindPage(this.localVideoForSkeleton, true, patientCanvasId);
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
          
          // CRITICAL FIX: If grill game is already active when therapist requests game URL,
          // ensure canvas stream is established and notify therapist
          if (this.gameId === 20 && this.isInGame && this.currentCall && this.currentCall.peerConnection) {
            console.log(`[PATIENT-${this.currentUser?.peerId}] Therapist requested game URL while Grill is active - ensuring canvas stream`);
            // Ensure canvas stream is established
            setTimeout(async () => {
              if (this.gameId === 20 && this.isInGame && this.currentCall && this.currentCall.peerConnection) {
                await this.replaceVideoStream(false).catch(err => {
                  console.error(`[PATIENT-${this.currentUser?.peerId}] Failed to establish canvas stream when therapist requested game URL:`, err);
                });
                // Re-send canvas active status if stream is active
                if (this.unityCanvasStreamActive && therapistToPatientConnection) {
                  const canvasTrack = this.unityCanvasStream?.getVideoTracks()[0];
                  if (canvasTrack) {
                    console.log(`[PATIENT-${this.currentUser?.peerId}] Re-sending grill_canvas_active=true after therapist requested game URL`);
                    therapistToPatientConnection.send({ type: 'grill_canvas_active', active: true });
                    therapistToPatientConnection.send({ type: 'grill_canvas_id', id: canvasTrack.id });
                  }
                }
              }
            }, 300);
          }
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
          console.log('call going to close =====', this.currentCall);
          this.currentCall.close();
          this.stopAudioRecording();
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
        this.redirectToRdpRequest();
        break;
      default:
        break;
    }
  }

  redirectToHome() {
    // console.log('[SESSION DEBUG] redirectToHome called - comprehensive cleanup');
    
    // COMPREHENSIVE CLEANUP when leaving studio game
    this.cleanupSessionProgressBarCompletely();
    
    this.handleTherapistClickHome.emit();
  }

  /**
   * Handle close game event - hide session progress bar and emit close game event
   */
  handleCloseGame() {
    // console.log('[SESSION DEBUG] handleCloseGame called - hiding session progress bar');
    this.hideSessionProgressBar();
    this.closeGame.emit();
  }

  redirectToRdpRequest() {
    this.fetchRustDeskId();
    setTimeout(() => {
      this.openRustdeskModal(` You can Install Rustdesk Software first and share the rustdesk ID`);
    }, 100);
  }
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
    if (!this.rustdeskId) {
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
      linux: 'https://github.com/rustdesk/rustdesk/releases/download/1.4.0/rustdesk-1.4.0-x86_64.deb',
    };
    // Trigger the download without affecting the page session
    try {
      const link = document.createElement('a');
      link.href = links[platform];
      link.download =
        platform === 'win' ? 'RustDesk-Windows.exe' : platform === 'mac' ? 'RustDesk-Mac.dmg' : 'RustDesk-Linux.deb';
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
      therapistToPatientConnection.on('open', () => {
        therapistToPatientConnection.on('data', (data) => {
          this.handleMessage(data);
        });
        therapistToPatientConnection.on('close', () => {
          /* if (therapistToPatientConnection) {
             therapistToPatientConnection.close();
             therapistToPatientConnection = null;
           }*/
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
        therapistToPatientConnection.on('data', (data) => {
          if (data?.type === 'therapist-data') {
            console.log('Received therapist data:', data.data);
            // Use peerId for WebRTC calls, not database id
            const previousTherapistId = this.therapistId;
            this.therapistId = data.data?.peerId || data.data?.id;
            
            // CRITICAL FIX: If grill game is already active and therapistId was just set,
            // ensure canvas stream is established now that we have therapistId
            if (this.gameId === 20 && this.isInGame && this.therapistId && !previousTherapistId) {
              console.log(`[PATIENT-${this.currentUser?.peerId}] Therapist connected while Grill game is active - establishing canvas stream`);
              // Wait a bit for call to be established, then ensure canvas stream
              setTimeout(async () => {
                if (this.gameId === 20 && this.isInGame && this.currentCall && this.currentCall.peerConnection) {
                  await this.replaceVideoStream(false).catch(err => {
                    console.error(`[PATIENT-${this.currentUser?.peerId}] Failed to establish canvas stream after therapist connected:`, err);
                  });
                }
              }, 500);
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
    }, 20 * 1000);
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
            this.startAudioRecording(stream);
            console.log('final stream recieving =====', stream);
            this.gotRemoteMediaStream(stream);
            if (this.gameId === 20 && this.currentCall && this.currentCall.peerConnection) {
              // CRITICAL FIX: When call is accepted and grill game is already active,
              // ensure canvas stream is established immediately
              console.log(`[PATIENT-${this.currentUser?.peerId}] Call accepted while Grill game is active - establishing canvas stream`);
              this.replaceVideoStream(false).catch(err => {
                console.error(`[PATIENT-${this.currentUser?.peerId}] Failed to replace track when stream received:`, err);
              });
            } else if (this.trackBody) {
              this.replaceVideoStream(true).catch(() => {});
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
        'video/mp4',
      ];

      function getSupportedMimeType(): string | null {
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
          }
        }
        return null; // No supported MIME type found
      }
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
      // Ensure no non-microphone audio tracks are present (e.g., game/system audio)
      if (outgoingStream && (outgoingStream as any).getAudioTracks) {
        (outgoingStream as any).getAudioTracks().forEach((t) => {
          try { (outgoingStream as any).removeTrack(t); } catch (_) {}
        });
      }
      if (this.localVideo.srcObject) {
        const source = this.localVideo.srcObject.clone();
        const audioTrack = source.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          outgoingStream.addTrack(audioTrack);
        }
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
    const patientCanvasId = 'patient-canvas';
    console.log(`[PATIENT-${this.currentUser?.peerId}] Starting pose detection with canvas: ${patientCanvasId}`);
    this.webCamSkeletonService.bindPage(this.localVideoForSkeleton, false, patientCanvasId);
    // For Grill game, always use Unity canvas, not skeleton
    if (this.gameId === 20) {
      this.replaceVideoStream(false);
    } else {
      this.replaceVideoStream(true);
    }
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

  replaceVideoStream = async (showSkeleton) => {
    if (this.currentCall && this.currentCall.peerConnection) {
      let videoTrack;
      const sender = this.currentCall.peerConnection.getSenders().find(function (s) {
        return s.track && s.track.kind === 'video';
      });
      if (!sender) {
        return;
      }

      // For Grill, prefer Unity canvas stream if available
      if (this.gameId === 20) {
        try {
          const unityCanvas = document.getElementById('unity-canvas') as HTMLCanvasElement | null;
          if (unityCanvas && typeof (unityCanvas as any).captureStream === 'function') {
            // Ensure high native resolution before capture to avoid blur
            try {
              const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
              const targetWidth = 1920; // hard cap for bandwidth
              const targetHeight = 1080;
              const cssW = unityCanvas.clientWidth || targetWidth;
              const cssH = unityCanvas.clientHeight || targetHeight;
              const desiredW = Math.min(targetWidth, cssW * dpr);
              const desiredH = Math.min(targetHeight, cssH * dpr);
              if (unityCanvas.width !== desiredW || unityCanvas.height !== desiredH) {
                unityCanvas.width = desiredW;
                unityCanvas.height = desiredH;
              }
              unityCanvas.style.width = '100%';
              unityCanvas.style.height = 'auto';
            } catch (_) {}

            // Prefer 60fps for smoother visuals when possible
            let canvasStream: MediaStream = this.unityCanvasStream || unityCanvas.captureStream(60);
            if (!this.unityCanvasStream) {
              this.unityCanvasStream = canvasStream;
            }
            const canvasVideoTrack = canvasStream.getVideoTracks()[0];

            if (canvasVideoTrack) {
              try { (canvasVideoTrack as any).contentHint = 'detail'; } catch (_) {}
              // Ask the browser for full HD @30fps on the canvas track
              try {
                const desired: MediaTrackConstraints = { width: 1920, height: 1080, frameRate: 60 } as any;
                if ((canvasVideoTrack as any).applyConstraints) {
                  await (canvasVideoTrack as any).applyConstraints(desired);
                }
              } catch (_) {}

              // Start or update dedicated MediaConnection with the Unity canvas track
              await this.startCanvasConnection(new MediaStream([canvasVideoTrack]), canvasVideoTrack);
              this.unityCanvasStreamActive = true;
              return;
            }

            // Canvas exists but no video track yet - ensure placeholder call is active
            await this.ensurePlaceholderCanvasCall();
            // Retry shortly to swap placeholder with real canvas
            setTimeout(async () => {
              if (this.gameId === 20 && this.currentCall && this.currentCall.peerConnection && !this.unityCanvasStreamActive) {
                await this.replaceVideoStream(false);
              }
            }, 700);
            return;
          } else {
            // Unity canvas not yet available - ensure placeholder call is active
            await this.ensurePlaceholderCanvasCall();
            // Retry shortly
            setTimeout(async () => {
              if (this.gameId === 20 && this.currentCall && this.currentCall.peerConnection && !this.unityCanvasStreamActive) {
                await this.replaceVideoStream(false);
              }
            }, 700);
            return;
          }
        } catch (_) {
          // Fall back to camera/skeleton below
        }
      }

      if (!this.depthCameraSocketService.isDepthCameraConnected) {
        if (!showSkeleton && this.localVideo && this.localVideo.srcObject) {
          videoTrack = (this.localVideo.srcObject as MediaStream).getVideoTracks()[0];
        } else if (this.localStream) {
          videoTrack = this.localStream.getVideoTracks()[0];
        }
      } else {
        if (this.localVideo && this.localVideo.srcObject) {
          videoTrack = (this.localVideo.srcObject as MediaStream).getVideoTracks()[0];
        } else {
          const stream = await this.getLocalStream();
          if (stream) {
            videoTrack = stream.getVideoTracks()[0];
          }
        }
      }
      if (videoTrack) {
        // Ensure we are not forcing any Unity canvas track here; keep camera/skeleton as chosen
        this.unityCanvasStreamActive = false;
        await sender.replaceTrack(videoTrack);
        // If Grill is running, notify therapist that canvas is not active
        if (this.gameId === 20) {
          try {
            if (typeof therapistToPatientConnection !== 'undefined' && therapistToPatientConnection && therapistToPatientConnection.send) {
              therapistToPatientConnection.send({ type: 'grill_canvas_active', active: false });
            }
          } catch (_) {}
        }
      }
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

  private async ensurePlaceholderCanvasCall() {
    try {
      if (!this.placeholderCanvas) {
        this.placeholderCanvas = document.createElement('canvas');
        this.placeholderCanvas.width = 1920;
        this.placeholderCanvas.height = 1080;
      }
      const ctx = this.placeholderCanvas.getContext('2d');
      if (ctx) {
        let tick = 0;
        if (this.placeholderDrawInterval) {
          clearInterval(this.placeholderDrawInterval);
        }
        this.placeholderDrawInterval = setInterval(() => {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, this.placeholderCanvas!.width, this.placeholderCanvas!.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '36px Arial';
          const dots = '.'.repeat((tick % 3) + 1);
          ctx.fillText(`Loading Grill${dots}`, 480, 380);
          tick++;
        }, 300);
      }
      const stream = (this.placeholderCanvas as any).captureStream ? this.placeholderCanvas.captureStream(30) : null;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          await this.startCanvasConnection(stream, track);
        }
      }
    } catch (_) {}
  }

  private async startCanvasConnection(canvasStream: MediaStream, canvasVideoTrack: MediaStreamTrack) {
    try {
      console.log('[GRILL] startCanvasConnection called, trackId:', canvasVideoTrack.id, 'patientPeer:', !!this.patientPeer, 'therapistId:', this.therapistId, 'gameId:', this.gameId, 'isInGame:', this.isInGame);
      // Always send grill (Unity) canvas as video-only: strip any accidental audio tracks
      try {
        if ((canvasStream as any).getAudioTracks) {
          (canvasStream as any).getAudioTracks().forEach((t) => {
            try { (canvasStream as any).removeTrack(t); } catch (_) {}
          });
        }
      } catch (_) {}
      if (!this.patientPeer) {
        console.warn('[GRILL] Cannot create canvas call - missing patientPeer');
        return;
      }
      if (!this.therapistId) {
        // Try to infer therapistId from the active call if it wasn't set via data channel yet
        try {
          if (this.currentCall && this.currentCall.peer) {
            this.therapistId = this.currentCall.peer;
            console.log('[GRILL] therapistId inferred from currentCall.peer:', this.therapistId);
          }
        } catch (_) {}

        if (!this.therapistId) {
          console.warn('[GRILL] Cannot create canvas call - therapistId not set yet. Will retry when therapist connects.');
          // If therapistId is still not set, wait for it and retry
          if (this.gameId === 20 && this.isInGame) {
            let retries = 0;
            const maxRetries = 20;
            const checkTherapistId = setInterval(() => {
              retries++;
              if (this.therapistId) {
                clearInterval(checkTherapistId);
                console.log('[GRILL] therapistId now available, creating canvas call');
                this.startCanvasConnection(canvasStream, canvasVideoTrack);
              } else if (retries >= maxRetries) {
                clearInterval(checkTherapistId);
                console.error('[GRILL] Failed to get therapistId after', maxRetries * 500, 'ms');
              }
            }, 500);
          }
          return;
        }
      }

      // Track lifecycle of Unity canvas video; if it ends (e.g., game quit), clean up and notify therapist
      try {
        if (this.unityCanvasVideoTrack && this.unityCanvasVideoTrack !== canvasVideoTrack) {
          try { (this.unityCanvasVideoTrack as any).onended = null; } catch (_) {}
        }
        this.unityCanvasVideoTrack = canvasVideoTrack;
        const onEnded = () => {
          try {
            this.handleUnityCanvasEnded();
          } catch (_) {}
        };
        try { (this.unityCanvasVideoTrack as any).addEventListener?.('ended', onEnded); } catch (_) {}
        try { (this.unityCanvasVideoTrack as any).onended = onEnded; } catch (_) {}
      } catch (_) {}

      // If a canvas call already exists, check if it's healthy before trying to replace the track
      if (this.canvasCall && this.canvasCall.peerConnection) {
        const pc = this.canvasCall.peerConnection as RTCPeerConnection;
        // Check if connection is actually healthy (not closed/failed/disconnected)
        const isHealthy = pc.connectionState === 'connected' || pc.connectionState === 'connecting' || pc.connectionState === 'new';
        const iceHealthy = pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'new';
        
        if (isHealthy && iceHealthy) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            try { await sender.replaceTrack(canvasVideoTrack); } catch (_) {}
            // Push high-bitrate preferences for clarity
            try {
              const params = sender.getParameters ? sender.getParameters() : {} as any;
              if (params) {
                params.degradationPreference = 'maintain-resolution';
                if (!params.encodings || !params.encodings.length) {
                  params.encodings = [{} as RTCRtpEncodingParameters];
                }
                params.encodings[0].maxBitrate = 6_000_000; // ~6 Mbps
                params.encodings[0].maxFramerate = 60;
                params.encodings[0].scaleResolutionDownBy = 1;
                if (sender.setParameters) {
                  await sender.setParameters(params as RTCRtpSendParameters);
                }
              }
            } catch (_) {}
            // Notify therapist
            try {
              if (typeof therapistToPatientConnection !== 'undefined' && therapistToPatientConnection && therapistToPatientConnection.send) {
                therapistToPatientConnection.send({ type: 'grill_canvas_active', active: true });
                therapistToPatientConnection.send({ type: 'grill_canvas_id', id: canvasVideoTrack.id });
              }
            } catch (_) {}
            return; // Successfully replaced track, exit early
          }
        }
        // Connection is unhealthy or no sender found - close old call and create new one
        try {
          try { this.canvasCall.close?.(); } catch (_) {}
          this.canvasCall = null;
        } catch (_) {}
      }
      
      // Create new canvas call (either no existing call, or old one was unhealthy)
      if (!this.canvasCall) {
        console.log('[GRILL] Creating new canvas call with trackId:', canvasVideoTrack.id, 'therapistId:', this.therapistId, 'patientPeer:', !!this.patientPeer);
        try {
          this.canvasCall = this.patientPeer.call(this.therapistId, canvasStream, { metadata: 'grill_canvas' });
          console.log('[GRILL] Canvas call created successfully, call object:', !!this.canvasCall, 'peerConnection:', !!this.canvasCall?.peerConnection);
          this.canvasCall.on('close', () => { 
            console.log('[GRILL] Canvas call closed');
            this.canvasCall = null; 
          });
          this.canvasCall.on('error', (err) => { 
            console.error('[GRILL] Canvas call error:', err);
            this.canvasCall = null; 
          });
          // Monitor connection state
          if (this.canvasCall.peerConnection) {
            this.canvasCall.peerConnection.onconnectionstatechange = () => {
              console.log('[GRILL] Canvas call connection state:', this.canvasCall?.peerConnection?.connectionState);
            };
            this.canvasCall.peerConnection.oniceconnectionstatechange = () => {
              console.log('[GRILL] Canvas call ICE state:', this.canvasCall?.peerConnection?.iceConnectionState);
            };
          }
        } catch (err) {
          console.error('[GRILL] Error creating canvas call:', err);
          this.canvasCall = null;
          return;
        }
        // After the sender exists, set encoding preferences
        try {
          const trySetParams = () => {
            if (!this.canvasCall || !this.canvasCall.peerConnection) return;
            const s = this.canvasCall.peerConnection.getSenders().find((x) => x.track && x.track.kind === 'video');
            if (s) {
              try {
                const p = s.getParameters ? s.getParameters() : {};
                if (p) {
                  p.degradationPreference = 'maintain-resolution';
                  if (!p.encodings || !p.encodings.length) {
                    p.encodings = [{} as RTCRtpEncodingParameters];
                  }
                  p.encodings[0].maxBitrate = 6_000_000;
                  p.encodings[0].maxFramerate = 60;
                  p.encodings[0].scaleResolutionDownBy = 1;
                  if (s.setParameters) {
                    s.setParameters(p as RTCRtpSendParameters);
                  }
                }
              } catch (_) {}
            } else {
              setTimeout(trySetParams, 200);
            }
          };
          setTimeout(trySetParams, 200);
        } catch (_) {}
      }
      // CRITICAL: Notify therapist after canvas call is created
      // Wait a bit for the call to be established before sending notification
      setTimeout(() => {
        try {
          if (typeof therapistToPatientConnection !== 'undefined' && therapistToPatientConnection && therapistToPatientConnection.send) {
            console.log('[GRILL] Sending grill_canvas_active=true and grill_canvas_id:', canvasVideoTrack.id, 'canvasCall exists:', !!this.canvasCall);
            therapistToPatientConnection.send({ type: 'grill_canvas_active', active: true });
            therapistToPatientConnection.send({ type: 'grill_canvas_id', id: canvasVideoTrack.id });
          } else {
            console.warn('[GRILL] Cannot send grill_canvas_active - therapistToPatientConnection not available');
          }
        } catch (e) {
          console.error('[GRILL] Error sending grill_canvas_active:', e);
        }
      }, 500); // Wait 500ms for call to be established
    } catch (_) {}
  }

  private handleUnityCanvasEnded() {
    try {
      this.unityCanvasStreamActive = false;
      // Inform therapist to hide/reset overlay
      try {
        if (typeof therapistToPatientConnection !== 'undefined' && therapistToPatientConnection && therapistToPatientConnection.send) {
          therapistToPatientConnection.send({ type: 'grill_canvas_active', active: false });
        }
      } catch (_) {}
      // Close dedicated canvas call if present
      try {
        if (this.canvasCall) {
          try { this.canvasCall.close?.(); } catch (_) {}
          this.canvasCall = null;
        }
      } catch (_) {}
      // Stop any existing canvas stream tracks
      try {
        if (this.unityCanvasStream) {
          this.unityCanvasStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        }
      } catch (_) {}
      this.unityCanvasStream = null as any;
      // Clear stored track listener
      try { if (this.unityCanvasVideoTrack) { (this.unityCanvasVideoTrack as any).onended = null; } } catch (_) {}
      this.unityCanvasVideoTrack = null;
    } catch (_) {}
  }

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

  updatePatientAvailabilityStatus(status: 'offline' | 'unavailable' | 'available' | 'do_not_disturb') {
    // console.log('updateP7');
    // console.log('currentUser', this.currentUser, this.currentUser?.patientId, 'status', status);
    if (this.currentUser?.patientId) {
      this.ajaxService.updatePatientAvailabilityStatus(this.currentUser.patientId, status).subscribe(
        () => {
          // console.log(`Patient availability status updated to ${status}`);
          // Update the current user's status locally
          if (this.currentUser) {
            this.currentUser.availabilityStatus = status;
          }
        },
        (error) => {
          console.error('Error updating patient availability status:', error);
          // Retry once after a short delay
          setTimeout(() => {
            this.ajaxService.updatePatientAvailabilityStatus(this.currentUser.patientId, status).subscribe(
              () => {
                console.log(`Patient availability status retry successful: ${status}`);
                if (this.currentUser) {
                  this.currentUser.availabilityStatus = status;
                }
              },
              (retryError) => console.error('Error updating patient availability status on retry:', retryError)
            );
          }, 1000);
        }
      );
    }
  }

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

  /**
   * Hide session progress bar using Angular approach
   */
  hideSessionProgressBar() {
    // console.log('[SESSION DEBUG] hideSessionProgressBar called - using Angular approach');
    
    // Simple Angular approach
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    this.cdr.detectChanges();
    
    // console.log('[SESSION DEBUG] Session progress bar hidden via Angular');
  }


  /**
   * Debug method to check session progress bar state - can be called from browser console
   */
  debugSessionProgressBar() {
    // console.log('[SESSION DEBUG] === SESSION PROGRESS BAR DEBUG ===');
    // console.log('[SESSION DEBUG] shouldShowSessionScorebar:', this.shouldShowSessionScorebar);
    // console.log('[SESSION DEBUG] currentGameName:', this.currentGameName);
    // console.log('[SESSION DEBUG] isShareScreen:', this.isShareScreen);
    // console.log('[SESSION DEBUG] gameScoreSummaryData length:', this.gameScoreSummaryData?.length || 0);
    // console.log('[SESSION DEBUG] isInGame:', this.isInGame);
    // console.log('[SESSION DEBUG] === END DEBUG ===');
    
    // Also check if the DOM element exists
    const sessionScorebarElement = document.querySelector('app-session-scorebar');
    // console.log('[SESSION DEBUG] Session scorebar DOM element exists:', !!sessionScorebarElement);
    if (sessionScorebarElement) {
      // console.log('[SESSION DEBUG] Session scorebar element:', sessionScorebarElement);
    }
    
    // Check all possible selectors
    const allSelectors = [
      '.scores-bar-container',
      'app-session-scorebar',
      '.web-rtc-area app-session-scorebar',
      '.web-rtc-area-mobile app-session-scorebar'
    ];
    
    allSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`[SESSION DEBUG] Found ${elements.length} elements for selector: ${selector}`);
      elements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element);
        console.log(`[SESSION DEBUG] Element ${index + 1} for ${selector}:`, {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          hasForceHidden: element.classList.contains('force-hidden')
        });
      });
    });
  }

  /**
   * Clean up any hidden session progress bars to prevent duplicates
   */
  cleanupHiddenSessionProgressBars() {
    // console.log('[SESSION DEBUG] cleanupHiddenSessionProgressBars called');
    
    // Method 1: Clear Angular data to prevent recreation
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    
    // Method 2: Force Angular change detection to update UI
    this.cdr.detectChanges();
    
    // Method 3: Target ALL possible selectors and properly destroy them
    const allSelectors = [
      '.scores-bar-container',
      'app-session-scorebar',
      '.web-rtc-area app-session-scorebar',
      '.web-rtc-area-mobile app-session-scorebar'
    ];
    
    allSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`[SESSION DEBUG] Found ${elements.length} elements for cleanup selector: ${selector}`);
      
      elements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element);
        const isHidden = computedStyle.display === 'none' || 
                        computedStyle.visibility === 'hidden' || 
                        computedStyle.opacity === '0' ||
                        element.classList.contains('force-hidden');
        
        if (isHidden) {
          console.log(`[SESSION DEBUG] Properly destroying hidden element ${index + 1} for ${selector}`);
          
          // Try to get Angular component reference
          const componentRef = (element as any).__ngContext__;
          if (componentRef) {
            console.log(`[SESSION DEBUG] Found Angular component reference, destroying it`);
            try {
              componentRef.destroy();
            } catch (error) {
              console.log(`[SESSION DEBUG] Error destroying component:`, error);
            }
          }
          
          // Remove from DOM
          element.remove();
        }
      });
    });
    
    // Method 4: Additional cleanup - remove any orphaned elements
    setTimeout(() => {
      const orphanedElements = document.querySelectorAll('app-session-scorebar');
      console.log(`[SESSION DEBUG] Found ${orphanedElements.length} orphaned session scorebar elements`);
      
      orphanedElements.forEach((element, index) => {
        console.log(`[SESSION DEBUG] Removing orphaned element ${index + 1}`);
        element.remove();
      });
    }, 100);
    
    // console.log('[SESSION DEBUG] Cleanup completed');
  }

  /**
   * Aggressively destroy ALL session progress bars - can be called from browser console
   */
  aggressiveDestroyAllSessionProgressBars() {
    // console.log('[SESSION DEBUG] aggressiveDestroyAllSessionProgressBars called');
    
    // Method 1: Clear Angular data
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    this.cdr.detectChanges();
    
    // Method 2: Find and destroy ALL session progress bar elements
    const allElements = document.querySelectorAll('app-session-scorebar, .scores-bar-container');
    console.log(`[SESSION DEBUG] Found ${allElements.length} total session progress bar elements to destroy`);
    
    allElements.forEach((element, index) => {
      console.log(`[SESSION DEBUG] Destroying element ${index + 1}`);
      
      // Try to destroy Angular component
      const componentRef = (element as any).__ngContext__;
      if (componentRef) {
        try {
          componentRef.destroy();
          console.log(`[SESSION DEBUG] Angular component destroyed for element ${index + 1}`);
        } catch (error) {
          console.log(`[SESSION DEBUG] Error destroying Angular component:`, error);
        }
      }
      
      // Remove from DOM
      element.remove();
    });
    
    // Method 3: Force garbage collection if available
    if (window.gc) {
      // console.log('[SESSION DEBUG] Running garbage collection');
      window.gc();
    }
    
    // console.log('[SESSION DEBUG] Aggressive destroy completed');
  }

  /**
   * Manual method to hide ALL session progress bars - can be called from browser console
   */
  manualHideAllSessionProgressBars() {
    
    // Target ALL possible selectors
    const allSelectors = [
      '.scores-bar-container',
      'app-session-scorebar',
      '.web-rtc-area app-session-scorebar',
      '.web-rtc-area-mobile app-session-scorebar',
      '[ng-reflect-ng-if="true"] app-session-scorebar',
      'div:has(app-session-scorebar)'
    ];
    
    allSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`[SESSION DEBUG] Found ${elements.length} elements for selector: ${selector}`);
        
        elements.forEach((element, index) => {
          console.log(`[SESSION DEBUG] Manually hiding element ${index + 1} for ${selector}`);
          
          // Add force-hidden class
          element.classList.add('force-hidden');
          
          // Set multiple hiding styles
          (element as HTMLElement).style.setProperty('display', 'none', 'important');
          (element as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
          (element as HTMLElement).style.setProperty('opacity', '0', 'important');
          (element as HTMLElement).style.setProperty('height', '0', 'important');
          (element as HTMLElement).style.setProperty('overflow', 'hidden', 'important');
          (element as HTMLElement).style.setProperty('max-height', '0', 'important');
          (element as HTMLElement).style.setProperty('min-height', '0', 'important');
        });
      } catch (error) {
        console.log(`[SESSION DEBUG] Error with selector ${selector}:`, error);
      }
    });
    
    // Force change detection
    this.cdr.detectChanges();
    
    // console.log('[SESSION DEBUG] Manual hide completed');
  }

  /**
   * Safe method to hide session progress bar - can be called from browser console
   */
  safeHideSessionProgressBar() {
    
    // Only use Angular methods, no DOM manipulation
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    this.cdr.detectChanges();
    
    // console.log('[SESSION DEBUG] Safe hide completed');
  }

  /**
   * CSS-based method to hide session progress bar
   */
  cssHideSessionProgressBar() {
    // console.log('[SESSION DEBUG] cssHideSessionProgressBar called');
    
    // Add CSS class to hide the session progress bar - target specific elements
    const style = document.createElement('style');
    style.id = 'hide-session-progress-bar';
    style.textContent = `
      .scores-bar-container,
      .scores-bar-container.force-hidden {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      .scores-bar-wrapper {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      app-session-scorebar {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
    `;
    
    // Remove existing style if it exists
    const existingStyle = document.getElementById('hide-session-progress-bar');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add the new style
    document.head.appendChild(style);
    
    // console.log('[SESSION DEBUG] CSS hide completed');
  }

  /**
   * Remove CSS that hides session progress bar
   */
  cssShowSessionProgressBar() {
    // console.log('[SESSION DEBUG] cssShowSessionProgressBar called');
    
    // Remove the CSS style that hides the session progress bar
    const existingStyle = document.getElementById('hide-session-progress-bar');
    if (existingStyle) {
      existingStyle.remove();
      // console.log('[SESSION DEBUG] CSS hide style removed');
    }
  }

  /**
   * Emergency method to force hide session progress bar by DOM manipulation
   */
  emergencyHideSessionProgressBar() {
    // console.log('[SESSION DEBUG] emergencyHideSessionProgressBar called');
    
    // Set the property
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    
    // Force change detection multiple times
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    
    // Only target the specific session scorebar element and its direct parent
    const sessionScorebarElement = document.querySelector('app-session-scorebar');
    if (sessionScorebarElement) {
      // console.log('[SESSION DEBUG] Hiding session scorebar via DOM manipulation');
      (sessionScorebarElement as HTMLElement).style.display = 'none';
      
      // Hide the direct parent div that contains the session scorebar
      const parentDiv = sessionScorebarElement.parentElement;
      if (parentDiv && parentDiv.tagName === 'DIV') {
        // console.log('[SESSION DEBUG] Hiding parent div containing session scorebar');
        (parentDiv as HTMLElement).style.display = 'none';
      }
    }
    
    // More targeted approach - only hide divs that directly contain app-session-scorebar
    const divsWithSessionScorebar = document.querySelectorAll('div');
    divsWithSessionScorebar.forEach(div => {
      // Only hide if this div directly contains app-session-scorebar and has ngIf directive
      if (div.querySelector('app-session-scorebar') && div.hasAttribute('ng-reflect-ng-if')) {
        // console.log('[SESSION DEBUG] Hiding div with ng-reflect-ng-if containing session scorebar');
        (div as HTMLElement).style.display = 'none';
      }
    });
  }

  /**
   * Ultra-targeted method to hide session progress bar
   */
  ultraTargetedHide() {
    // console.log('[SESSION DEBUG] ultraTargetedHide called');
    
    // Target the specific scores-bar-container element
    const scoresBarContainer = document.querySelector('.scores-bar-container');
    if (scoresBarContainer) {
      // console.log('[SESSION DEBUG] Found scores-bar-container, hiding it');
      (scoresBarContainer as HTMLElement).style.display = 'none';
    }
    
    // Also target the scores-bar-wrapper if it exists
    const scoresBarWrapper = document.querySelector('.scores-bar-wrapper');
    if (scoresBarWrapper) {
      // console.log('[SESSION DEBUG] Found scores-bar-wrapper, hiding it');
      (scoresBarWrapper as HTMLElement).style.display = 'none';
    }
    
    // Also hide the session scorebar element itself
    const sessionScorebarElement = document.querySelector('app-session-scorebar');
    if (sessionScorebarElement) {
      // console.log('[SESSION DEBUG] Hiding session scorebar element');
      (sessionScorebarElement as HTMLElement).style.display = 'none';
    }
  }

  /**
   * Simple method to hide just the scores-bar-container
   */
  hideScoresBarContainer() {
    // console.log('[SESSION DEBUG] hideScoresBarContainer called');
    
    // Hide ALL scores-bar-container elements
    const scoresBarContainers = document.querySelectorAll('.scores-bar-container');
    // console.log('[SESSION DEBUG] Found', scoresBarContainers.length, 'scores-bar-container elements');
    
    scoresBarContainers.forEach((container, index) => {
      // console.log('[SESSION DEBUG] Hiding scores-bar-container', index + 1);
      (container as HTMLElement).style.display = 'none';
      
      // Also add a CSS class to ensure it stays hidden
      container.classList.add('force-hidden');
      
      // Add inline style as backup
      (container as HTMLElement).setAttribute('style', 'display: none !important; visibility: hidden !important; opacity: 0 !important;');
    });
    
    if (scoresBarContainers.length === 0) {
      // console.log('[SESSION DEBUG] No scores-bar-container elements found');
    }
  }

  /**
   * Refresh and show session progress bar for studio game
   */
  refreshSessionProgressBar() {
    // console.log('[SESSION DEBUG] refreshSessionProgressBar called');
    
    const scoresBarContainers = document.querySelectorAll('.scores-bar-container');
    // console.log('[SESSION DEBUG] Found', scoresBarContainers.length, 'scores-bar-container elements to refresh');
    
    scoresBarContainers.forEach((container, index) => {
      // console.log('[SESSION DEBUG] Refreshing scores-bar-container', index + 1);
      
      // Remove any force-hidden class
      container.classList.remove('force-hidden');
      
      // Reset all styles to show the element
      (container as HTMLElement).style.display = '';
      (container as HTMLElement).style.visibility = '';
      (container as HTMLElement).style.opacity = '';
      (container as HTMLElement).style.height = '';
      (container as HTMLElement).style.overflow = '';
      
      // Remove any inline styles that might be hiding it
      (container as HTMLElement).removeAttribute('style');
    });
    
    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
    
    // console.log('[SESSION DEBUG] Session progress bar refreshed');
  }

  /**
   * Forcefully hide session progress bar with multiple methods
   * Only call this when leaving games or going home - NOT when entering studio game
   */
  forceHideSessionProgressBar() {
    // console.log('[SESSION DEBUG] forceHideSessionProgressBar called');
    
    // Method 1: Hide via Angular property
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    
    // Method 2: Direct DOM manipulation - target ALL session progress bars
    const allSelectors = [
      '.scores-bar-container',
      'app-session-scorebar',
      '.web-rtc-area app-session-scorebar',
      '.web-rtc-area-mobile app-session-scorebar'
    ];
    
    allSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      // console.log('[SESSION DEBUG] Found', elements.length, 'elements for selector:', selector);
      
      elements.forEach((element, index) => {
        // console.log('[SESSION DEBUG] Force hiding element', index + 1, 'for selector:', selector);
        
        // Add force-hidden class
        element.classList.add('force-hidden');
        
        // Set multiple hiding styles
        (element as HTMLElement).style.display = 'none !important';
        (element as HTMLElement).style.visibility = 'hidden !important';
        (element as HTMLElement).style.opacity = '0 !important';
        (element as HTMLElement).style.height = '0 !important';
        (element as HTMLElement).style.overflow = 'hidden !important';
      });
    });
    
    // Method 3: Hide via CSS injection
    this.cssHideSessionProgressBar();
    
    // Method 4: Force change detection
    this.cdr.detectChanges();
    
    // console.log('[SESSION DEBUG] Session progress bar force hidden');
  }

  /**
   * Forcefully show session progress bar for studio game
   */
  forceShowSessionProgressBar() {
    // console.log('[SESSION DEBUG] forceShowSessionProgressBar called');
    
    // Method 1: Set Angular properties
    this.shouldShowSessionScorebar = true;
    
    // Start fresh - don't restore old data, let it populate naturally during the game
    this.gameScoreSummaryData = [];
    // console.log('[SESSION DEBUG] Starting fresh - cleared game data to let it populate naturally');
    
    // Method 2: Direct DOM manipulation to show elements - target ALL instances
    const allSelectors = [
      '.scores-bar-container',
      'app-session-scorebar',
      '.web-rtc-area app-session-scorebar',
      '.web-rtc-area-mobile app-session-scorebar'
    ];
    
    allSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      // console.log('[SESSION DEBUG] Found', elements.length, 'elements for selector:', selector);
      
      elements.forEach((element, index) => {
        // console.log('[SESSION DEBUG] Force showing element', index + 1, 'for selector:', selector);
        
        // Remove any hiding classes
        element.classList.remove('force-hidden');
        
        // Force show with important styles
        (element as HTMLElement).style.setProperty('display', 'block', 'important');
        (element as HTMLElement).style.setProperty('visibility', 'visible', 'important');
        (element as HTMLElement).style.setProperty('opacity', '1', 'important');
        (element as HTMLElement).style.setProperty('height', 'auto', 'important');
        (element as HTMLElement).style.setProperty('overflow', 'visible', 'important');
      });
    });
    
    // Method 3: Remove any CSS hiding rules
    this.cssShowSessionProgressBar();
    
    // Method 4: Force change detection
    this.cdr.detectChanges();
    
    // console.log('[SESSION DEBUG] Session progress bar force shown - ready for fresh data');
  }

  /**
   * Conditionally hide session progress bar - only hide if not in studio game
   */
  conditionalHideSessionProgressBar() {
    // console.log('[SESSION DEBUG] conditionalHideSessionProgressBar called, currentGameName:', this.currentGameName);
    
    // Only hide if we're NOT in the studio game
    if (this.currentGameName !== 'studio') {
      // console.log('[SESSION DEBUG] Not in studio game, hiding session progress bar');
      this.forceHideSessionProgressBar();
    } else {
      // console.log('[SESSION DEBUG] In studio game, keeping session progress bar visible');
    }
  }

  /**
   * Update session progress bar visibility based on current state
   */
  updateSessionProgressBarVisibility() {
    // console.log('[SESSION DEBUG] Current state - currentGameName:', this.currentGameName);
    // console.log('[SESSION DEBUG] Current state - isShareScreen:', this.isShareScreen);
    
    const shouldShow = this.currentGameName === 'studio' && !this.isShareScreen;
    // console.log('[SESSION DEBUG] Calculated shouldShow:', shouldShow);
    // console.log('[SESSION DEBUG] Current shouldShowSessionScorebar:', this.shouldShowSessionScorebar);
    
    if (!shouldShow && this.shouldShowSessionScorebar) {
      // console.log('[SESSION DEBUG] Hiding session progress bar');
      this.hideSessionProgressBar();
    } else if (shouldShow && !this.shouldShowSessionScorebar) {
      // console.log('[SESSION DEBUG] Showing session progress bar');
      this.shouldShowSessionScorebar = true;
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
      // console.log('[SESSION DEBUG] Change detection triggered for show');
      
      // ALWAYS move session progress bar below video when showing
      setTimeout(() => {
        // console.log('[SESSION DEBUG] Calling ensureSessionScorebarPosition from updateSessionProgressBarVisibility');
        this.ensureSessionScorebarPosition();
      }, 200);
    }
  }

  ngOnDestroy() {
    // console.log('[SESSION DEBUG] ngOnDestroy called - cleaning up session progress bar');
    
    // COMPREHENSIVE SESSION PROGRESS BAR CLEANUP
    this.cleanupSessionProgressBarCompletely();
    
    // Status update is now handled in AuthenticationService.logout()
    if (!this.isMobile) {
      this.webCamSkeletonService.stopPage();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.subscription.unsubscribe();
    this.patientPeer.destroy();
    if (this.cameraPose) {
      this.cameraPose.close(); // clean up
      this.cameraPose = null;
    }
  }

  cleanupSessionProgressBarCompletely() {
    // console.log('[SESSION DEBUG] cleanupSessionProgressBarCompletely called');
    
    // 1. Reset all Angular properties
    this.shouldShowSessionScorebar = false;
    this.gameScoreSummaryData = [];
    
    // 2. Force change detection to update UI
    this.cdr.detectChanges();
    
    // 3. Remove all session progress bar DOM elements
    const sessionScorebars = document.querySelectorAll('app-session-scorebar');
    const scoreContainers = document.querySelectorAll('.scores-bar-container');
    const scoreWrappers = document.querySelectorAll('.scores-bar-wrapper');
    
    // console.log('[SESSION DEBUG] Found elements to cleanup:', {
    //   sessionScorebars: sessionScorebars.length,
    //   scoreContainers: scoreContainers.length,
    //   scoreWrappers: scoreWrappers.length
    // });
    
    // 4. Destroy Angular components and remove DOM elements
    const allElements = [
      ...Array.from(sessionScorebars),
      ...Array.from(scoreContainers),
      ...Array.from(scoreWrappers)
    ];
    
    allElements.forEach(element => {
      try {
        // Try to destroy Angular component if it exists
        if (element['__ngContext__']) {
          // console.log('[SESSION DEBUG] Destroying Angular component');
          element['__ngContext__'].destroy();
        }
        
        // Remove from DOM
        if (element.parentNode) {
          element.parentNode.removeChild(element);
          // console.log('[SESSION DEBUG] Element removed from DOM');
        }
      } catch (error) {
        // console.log('[SESSION DEBUG] Error during cleanup:', error);
      }
    });
    
    // 5. Clear any remaining references
    setTimeout(() => {
      const remainingElements = document.querySelectorAll('app-session-scorebar, .scores-bar-container, .scores-bar-wrapper');
      if (remainingElements.length > 0) {
        // console.log('[SESSION DEBUG] Force removing remaining elements:', remainingElements.length);
        remainingElements.forEach(element => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      }
    }, 100);
    
    // console.log('[SESSION DEBUG] Session progress bar cleanup completed');
  }

  matchClipAndPatientData(matchingClipData: any[], matchingPatientData: any[]) {
    const results = [];
    const timeThreshold = 0.2; // seconds

    matchingClipData.forEach((data) => {
      const [clipTimestamp, ...clipEntry] = data;

      const movementEntries = clipEntry.filter(
        (entry) => Array.isArray(entry) && entry[0] !== 'posture' && entry[0] !== 'idle'
      );
      if (movementEntries.length === 0) return;
      const matchedPatient = matchingPatientData.find((patientEntry) => {
        return +patientEntry.timestamp >= clipTimestamp && +patientEntry.timestamp <= clipTimestamp + timeThreshold;
      });

      const patientDegArr = matchedPatient?.deg ?? [];
      const combinedAnalysis = movementEntries.map((movement, index) => {
        const clipDeg = movement[2];
        const clipType = movement[0];
        const clipLandmark = movement[1];

        const patientVal = patientDegArr[index];
        let isGood = false;

        if (clipDeg && clipDeg.length === 2) {
          isGood = patientVal >= clipDeg[0] && patientVal <= clipDeg[1];
        } else {
          if (clipType === 'peaks') {
            isGood = patientVal >= clipDeg;
          } else if (clipType === 'deeps') {
            isGood = patientVal <= clipDeg;
          }
        }

        return {
          ClipDeg: clipDeg,
          ClipType: clipType,
          ClipLandmark: clipLandmark,
          PatientDeg: patientVal ?? null,
          Comment: isGood ? 'Good' : 'Not Good',
          Condition: isGood ? 'Good' : 'Not Good',
        };
      });

      results.push({
        Analysis: combinedAnalysis,
        ClipTimestamp: clipTimestamp,
        PatientTimestamp: matchedPatient?.timestamp ?? null,
      });
    });

    return results;
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
    console.log('initializePoseModels');
    this.cameraPose = new Pose({ locateFile: (file) => `assets/pose/${file}` });

    const poseOptions: any = {
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    this.cameraPose.setOptions(poseOptions);

    this.showMarker = false;
    this.showDefaultMarker = true;
    const canvas = this.canvasElement2?.nativeElement as HTMLCanvasElement | undefined;
    const canvasCtx = canvas?.getContext?.('2d') ?? null;
    if (!canvas || !canvasCtx) {
      return;
    }
    this.cameraPose.onResults((results: Results) => {
      this.onPoseCameraResults(results, canvasCtx, canvas);
    });
  }

  private async resetTracking() {
    console.log(`[PATIENT-${this.currentUser?.peerId}] resetTracking() called - resetting all tracking data`);
    this.videoIndex = -1;
    this.videoSeconds = 0;
    this.skeltonProgressBarService.setBarElement('' + 0);
    clearInterval(this.newInterval);
    this.landmarks = [];
    this.videoMinMax = [];
    this.landmarksPostures = [];
    this.lastPerformedIndex = 0;
    this.currentVideoIndex = 0;
    this.leftPostureAngle = 0;
    this.rightPostureAngle = 0;
    this.matchingCameraData = [];
    this.landmarksLinePointer = [];
    this.lastIdleLength = 0;
    this.checkIdle = true;
    this.showMarker = false;
    this.callChatGPT = false;
    this.timeMatching = false;
    this.finalFeedback = false;
    this.lastTimeMatching = false;
    this.showDefaultMarker = true;
    this.clipSummary = '';
    this.videoTitle = '';
    this.clipId = '';
    this.video_fdk_level = '';
    this.isVideoPaused = false;
    this.landmarkColorCache = new Map();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (therapistToPatientConnection) {
      console.log(`[PATIENT-${this.currentUser?.peerId}] Sending reset message to therapist: 0%`);
      therapistToPatientConnection.send({
        type: 'progress_bar',
        data: { userId: this.currentUser, barPercentage: 0, barThumbsUp: 0, showProgressBar: 'true' },
      });
      
      // Send multiple reset messages to ensure it overrides any pending updates
      setTimeout(() => {
        if (therapistToPatientConnection) {
          console.log(`[PATIENT-${this.currentUser?.peerId}] Sending delayed reset message to therapist: 0%`);
          therapistToPatientConnection.send({
            type: 'progress_bar',
            data: { userId: this.currentUser, barPercentage: 0, barThumbsUp: 0, showProgressBar: 'true' },
          });
        }
      }, 1000);
      
      therapistToPatientConnection.send({
        type: 'skeleton_tracking',
        data: { userId: this.currentUser, frame: { joints: [], connections: [] } },
      });
    }
  }

  private async checkIdleCondition() {
    const threshold = 13;
    const results = await this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
    const mainComments = results.filter((data) => data.PatientTimestamp != undefined);

    const allAnalysis = results.flatMap(r => r.Analysis);
    const mainLength = allAnalysis.length;
    const performedAnalysis = mainComments.flatMap(r => r.Analysis);
    const performedLength = performedAnalysis.length;
    const performedPercentage = Math.floor((performedLength / mainLength) * 100);

    const updateLength = performedAnalysis.filter(a => a.Condition === 'Good').length;
    const thumbUpLength = mainComments.filter((r) => r.Analysis.every((a) => a.Condition === 'Good')).length;
    const percentage = Math.floor((updateLength / mainLength) * 100);
    this.barPercentage = percentage;
    this.barThumbsUp = thumbUpLength;
    this.skeltonProgressBarService.setBarElement('' + percentage);
    this.skeltonProgressBarService.setThumbUpElement('' + thumbUpLength);

    // if (performedPercentage >= 60 && !this.heygenActive) {
    //   this.heygenActive = true;
    //   this.heygenAPIService = new HeygenAPIService();
    //   this.heygenAPIService.onStart();
    // }

    // if (performedLength > 0 && performedLength % 3 === 0 && this.lastPerformedIndex < performedLength) {
    //   const lastThree = mainComments.slice(-3);
    //   if (lastThree.length < 3) {
    //     return { allLeftSame: false, allRightSame: false };
    //   }

    //   const isLeftSide = (landmarks) => landmarks[0] % 2 !== 0;
    //   const isRightSide = (landmarks) => landmarks[0] % 2 === 0;

    //   function extractPatientDeg(entries, sideCheckFn) {
    //     return entries.map(entry => {
    //       return entry.Analysis
    //         .filter(a => sideCheckFn(a.ClipLandmark))
    //         .map(a => a.PatientDeg);
    //     });
    //   }

    //   const lastLeft = extractPatientDeg(lastThree, isLeftSide);
    //   const lastRight = extractPatientDeg(lastThree, isRightSide);

    //   function allSame(arrays) {
    //     if (arrays.length < 3 || arrays[0].length === 0) return false;

    //     return !arrays.some((degArr, i, arr) => {
    //       if (i === 0) return false;
    //       return degArr.some((deg, j) => {
    //         const base = arr[0][j];
    //         return Math.abs(deg - base) > threshold;
    //       });
    //     });
    //   }

    //   const allLeftSame = allSame(lastLeft);
    //   const allRightSame = allSame(lastRight);

    //   const leftMessages = [
    //     'It looks like the left side has been idle for a while.',
    //     'No movement detected on the left side.',
    //     'The left side seems to be resting.',
    //     'Left side is showing signs of inactivity.',
    //     'Left side activity has paused.',
    //     'Left side remains unmoved.',
    //     'Stillness noticed in the left side.'
    //   ];

    //   const rightMessages = [
    //     'It looks like the right side has been idle for a while.',
    //     'No movement detected on the right side.',
    //     'The right side seems to be resting.',
    //     'Right side is showing signs of inactivity.',
    //     'Right side activity has paused.',
    //     'Right side remains unmoved.',
    //     'Stillness noticed in the right side.'
    //   ];

    //   const bothMessages = [
    //     'Idle movements detected for both sides.',
    //     'No activity observed from either side.',
    //     'Both sides appear to be inactive.',
    //     'Looks like both sides are idle.',
    //     'Neither side has shown movement.',
    //     'Both sides are staying still.',
    //     'Activity paused on both sides.'
    //   ];

    //   if (allLeftSame || allRightSame) {
    //     let content = "";
    //     this.checkIdle = false
    //     this.showMarker = false
    //     this.lastIdleLength = performedLength
    //     this.lastPerformedIndex = performedLength
    //     if (allLeftSame && allRightSame) {
    //       content = bothMessages[Math.floor(Math.random() * bothMessages.length)];
    //     } else if (allLeftSame) {
    //       content = leftMessages[Math.floor(Math.random() * leftMessages.length)];
    //     } else if (allRightSame) {
    //       content = rightMessages[Math.floor(Math.random() * rightMessages.length)];
    //     }

    //     this.patientWebRtcService.setShouldPauseGameState(true);
    //     this.playCommentAudio(content)
    //   }
    // }
  }

  private async generatefeedback(elbowAngle = false, elbowComment = '') {
    let content = '';
    let badLeftPercent = 0;
    let badRightPercent = 0;
    let feedbackPrompt = '';
    const matchPercent = 70;

    const resultss = await this.matchClipAndPatientData(this.videoMinMax, this.matchingCameraData);
    if (!this.finalFeedback) {
      const performedComments = resultss.filter((data) => data.PatientTimestamp != undefined);
      const currentPerformedComments = performedComments.slice(this.lastPerformedIndex);
      this.lastPerformedIndex = performedComments.length;

      const badLeftComments = currentPerformedComments.filter((data) =>
        data.LeftCondition.every((angle) => angle === 'Not Good')
      ).length;
      const badRightComments = currentPerformedComments.filter((data) =>
        data.RightCondition.every((angle) => angle === 'Not Good')
      ).length;

      badLeftPercent = Math.floor((badLeftComments / currentPerformedComments.length) * 100);
      badRightPercent = Math.floor((badRightComments / currentPerformedComments.length) * 100);

      if (badLeftPercent > matchPercent) {
        feedbackPrompt += `
        Compare "ClipDeg" with "PatientLeftDeg" from each object in the array for left side feedback.
        Summary should be specific to the left side movements.
      `;
      }

      if (badRightPercent > matchPercent) {
        feedbackPrompt += `
        Compare "ClipDeg" with "PatientRightDeg" from each object in the array for right side feedback.
        Summary should be specific to the right side movements.
      `;
      }

      if (badLeftPercent > matchPercent && badRightPercent > matchPercent) {
        feedbackPrompt += `Combine the feedback from both left and right sides.`;
      }
      if (badLeftPercent > matchPercent || badRightPercent > matchPercent) {
        feedbackPrompt +=
          'Check "PatientLeftDeg" or "PatientRightDeg" values in each object, if the values are similar continuously, then only give summary for idle movements, and exclude other feedback, in simple English within 6-7 words with no pointers.';
      }

      if (feedbackPrompt && !this.callChatGPT && this.checkIdle) {
        this.callChatGPT = true;
        this.showMarker = false;
        this.checkIdle = false;
        this.patientWebRtcService.setShouldPauseGameState(true);

        const body = {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `JSON Array: ${JSON.stringify(performedComments)}, ${feedbackPrompt}`,
            },
          ],
        };

        const data = await this.chatGPTAPI(JSON.stringify(body));
        if (data.choices && data.choices.length > 0) {
          content = data?.choices[0].message?.content;
          const wordCount = content.trim().split(/\s+/).length;

          setTimeout(async () => {
            if (wordCount > 12) {
              const bodys = {
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'user',
                    content: `
                    You are the virtual therapist.
                    Summary: ${content}. Convert this to simple English within 6-7 words with no pointers.
                  `,
                  },
                ],
              };
              const datas = await this.chatGPTAPI(JSON.stringify(bodys));
              if (datas.choices && datas.choices.length > 0) {
                content = datas?.choices[0].message?.content;
                console.log('content==', content);
              }
            }
            if (elbowAngle) {
              content = elbowComment + ' and ' + content;
            }
            this.playCommentAudio(content);
          }, 100);
        } else {
          content = 'Idle movements detected for both sides.';
          if (elbowAngle) {
            content = elbowComment + ' and ' + content;
          }
          this.playCommentAudio(content);
        }
      }
    } else {
      this.checkIdle = false
      this.callChatGPT = true
      const mainComments = resultss.map(data => ({
        ClipDeg: data.Analysis.ClipDeg,
        ClipTimestamp: data.ClipTimestamp,
        PatientTimestamp: data.PatientTimestamp,
        PatientLeftDeg: data.Analysis.PatientDeg,
      }));
      let timeout = 5000;
      const bodys = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `
            JSON Array: ${JSON.stringify(mainComments)}
            You are a supportive and encouraging virtual physical therapy expert specializing in both orthopedic and neurological rehab.
            Based on the JSON data, provide a specific and honest summary for the patient, highlighting their side movement performance. Treat each JSON index independently, and compare each the "ClipDeg" directly with "PatientDeg" for that entry—do not infer repetition cycles across frames.
            Note the number of successful repetitions, quality of motion, any compensations, and idle or missing movements. The summary should be simple, clear, constructive, and easy to understand—no bullet points, just a short, uplifting paragraph.
            Please add the final score as a percentage to the summary. ${this.barPercentage}%
            Summary should be up to 50 words.
          `,
          },
        ],
      };
      const datas = await this.chatGPTAPI(JSON.stringify(bodys));
      if (datas.choices && datas.choices.length > 0) {
        this.firstTimeSpeech = false;
        content = 'Congratulations! You have completed this exercise. ' + datas?.choices[0].message?.content;
        // setTimeout(() => {
        //   this.patientWebRtcService.setShouldPauseGameState(true);
        // }, 2000);
        this.clipSummary = content;
        this.playCommentAudio(content);
      }
      // if (content != "") {
      //   this.heygenShow = true;
      //   const response = await this.heygenAPIService.sendText(content);
      //   if (response && response.data && response.data.duration_ms) {
      //     timeout = response.data.duration_ms + 1000;
      //   }
      // }
      // setTimeout(() => {
      //   this.heygenShow = false;
      //   this.heygenActive = false;
      //   this.heygenAPIService.closeSession();
      //   this.patientWebRtcService.setShouldPauseGameState(false);
      // }, timeout);
    }
  }

  private async chatGPTAPI(body: string) {
    const apiKey =
      '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';
    // const apiKey = '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'
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    return response.json();
  }

 /* private initializeCameraPoseModels() {
    console.log('initializeCameraPoseModels');

    this.showMarker = true;
    this.showDefaultMarker = false;
  }*/
  private async initializeCameraPoseModels() {
    console.log('initializeCameraPoseModels');
    this.showMarker = true;
    this.showDefaultMarker = false;
    const video = this.cameraElement?.nativeElement as HTMLVideoElement | undefined;
    if (!video) {
      return;
    }
    await this.webCamSkeletonService.bindPage(video, false);
    const skeletonObservable = this.webCamSkeletonService.currentFullResults$;
    skeletonObservable.subscribe(results => {
      if (!results) return;
      const canvas = this.canvasElement2?.nativeElement as HTMLCanvasElement | undefined;
      const canvasCtx = canvas?.getContext?.('2d') ?? null;
      if (!canvas || !canvasCtx) return;
      if (this.gameId === 3) {
        this.onPoseCameraResults(results, canvasCtx, canvas);
      } else if (environment.gameIdWithComp.includes(String(this.gameId))) {
        this.calculateOtherGameAngles(results, canvasCtx, canvas);
      }
    });
  }

 // ================== LOAD COMP SETTINGS ==================
private loadCompSettings(patientId: number, gameId: number) {
  if (this.compSettingsLoaded) {
    return;
  }
  if (!environment.gameIdWithComp.includes(String(gameId))) {
    return;
  }
  this.ajaxService.getCompThresholdValue().pipe(
    catchError(() => of(null))
  ).subscribe({
    next: (res) => {
      if (res) {
        this.compThresholds = res;
      }
    }
  });
  this.ajaxService.getCompSettingsFromPatient(gameId, patientId).pipe(
    catchError(() => of(null))
  ).subscribe({
    next: (res) => {
      if (res) {
        this.compSettings = res;
        this.compSettingsLoaded = true;
        console.log("✅ Comp settings loaded:", this.compSettings);
        if (this.compSettings.comp_settings_flag && this.compThresholds) {
          if (this.compSettings.elbow_flag) {
            if (this.compSettings.comp_thresholds.EL > 0) {
              this.leftElbowThreshold = this.compThresholds.EL[this.compSettings.comp_thresholds.EL];
            }
            if (this.compSettings.comp_thresholds.ER > 0) {
              this.rightElbowThreshold = this.compThresholds.ER[this.compSettings.comp_thresholds.ER];
            }
          }
          if (this.compSettings.shoulder_flag) {
            if (this.compSettings.comp_thresholds.SL > 0) {
              this.leftShoulderThreshold = this.compThresholds.SL[this.compSettings.comp_thresholds.SL];
            }
            if (this.compSettings.comp_thresholds.SR > 0) {
              this.rightShoulderThreshold = this.compThresholds.SR[this.compSettings.comp_thresholds.SR];
            }
          }
          if (this.compSettings.trunk_left_right_flag) {
            if (this.compSettings.comp_thresholds.TL > 0) {
              this.trunkLeftThreshold = this.compThresholds.TL[this.compSettings.comp_thresholds.TL];
            }
            if (this.compSettings.comp_thresholds.TR > 0) {
              this.trunkRightThreshold = this.compThresholds.TR[this.compSettings.comp_thresholds.TR];
            }
          }
          if (this.compSettings.trunk_back_front_flag) {
            if (this.compSettings.comp_thresholds.TF > 0) {
              this.trunkForwardThreshold = this.compThresholds.TF[this.compSettings.comp_thresholds.TF];
            }
            if (this.compSettings.comp_thresholds.TB > 0) {
              this.trunkBackwardThreshold = this.compThresholds.TB[this.compSettings.comp_thresholds.TB];
            }
          }
          if (this.compSettings.alert_per_minute_flag) {
           this.COMPENSATION_INTERVAL =  (60 / this.compSettings.alert_per_minute);
          }
          if (this.compSettings.alert_volume_flag) {
            this.volumeLevelThreshold =  this.compSettings.alert_volume;
          }
        }
      } else {
        console.warn("⚠️ Empty response for comp_setting API");
      }
    }
  });
}
private async processVideoFrames() {
  this.showMarker = false;
  this.showDefaultMarker = true;
  const canvas = this.canvasElement2?.nativeElement as HTMLCanvasElement | undefined;
  const canvasCtx = canvas?.getContext?.('2d') ?? null;
  const video = this.cameraElement?.nativeElement as HTMLVideoElement | undefined;
  if (!canvas || !canvasCtx || !video) {
    return;
  }
  if (this.cameraPose) {
    this.cameraPose.onResults((results: Results) => {
      if (this.gameId && !this.baselineCaptured && this.baselineCaptureInit) {
        const canv = document.getElementById('patient-canvas') as HTMLCanvasElement;
        if (canv) this.drawSeatFrame(canv, this.localVideo, results);
      }
      if (this.gameId === 3) {
        this.onPoseCameraResults(results, canvasCtx, canvas);
      } else {
        this.calculateOtherGameAngles(results, canvasCtx, canvas);
      }
    });
  }

  const renderFrame = async () => {
    if (video.paused || video.ended) return;
    await this.cameraPose.send({ image: video });
    requestAnimationFrame(renderFrame);
  };
  renderFrame();
}


  private getCondition(type, angle, currentAngle) {
    if (angle && angle.length === 2) {
      return angle[0] <= currentAngle && currentAngle <= angle[1] ? 'Good' : 'Bad';
    } else {
      if (type === 'peaks') {
        return currentAngle >= angle ? 'Good' : 'Bad';
      } else if (type === 'deeps') {
        return currentAngle <= angle ? 'Good' : 'Bad';
      } else {
        return 'Good';
      }
    }
  }

  private getVerticalAngle(start, end) {
    const verticalX = 0;
    const verticalY = 1;
    const magVertical = 1;
    const vx = end.x - start.x;
    const vy = end.y - start.y;

    const magV = Math.sqrt(vx * vx + vy * vy);
    const dot = vx * verticalX + vy * verticalY;

    if (magV === 0) return 0;

    let cosTheta = dot / (magV * magVertical);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    const angleRad = Math.acos(cosTheta);
    const angleDeg = angleRad * (180 / Math.PI);

    return +angleDeg.toFixed(0);
  }

  private getHorizontalAngle(start, end) {
    const horizontalX = 1;
    const horizontalY = 0;
    const magHorizontal = 1;
    const hx = end.x - start.x;
    const hy = end.y - start.y;

    const magH = Math.sqrt(hx * hx + hy * hy);
    const dot = hx * horizontalX + hy * horizontalY;

    if (magH === 0) return 0;

    let cosTheta = dot / (magH * magHorizontal);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    const angleRad = Math.acos(cosTheta);
    const angleDeg = angleRad * (180 / Math.PI);

    return +angleDeg.toFixed(0);
  }

  private getAngle(landmark, poseLandmarks) {
    const videoName = this.lastVideoName.toLowerCase();
    if (landmark && landmark.length > 0) {
      if (landmark.length === 2) {
        return this.getVerticalAngle(poseLandmarks[landmark[0]], poseLandmarks[landmark[1]]);
      } else {
        if (videoName === "p033" || videoName === "p028") {
          return this.getAngleBetweenAllPoints(poseLandmarks[landmark[0]], poseLandmarks[landmark[1]], poseLandmarks[landmark[2]]);
        } else {
          return this.getAngleBetweenPoints(poseLandmarks[landmark[0]], poseLandmarks[landmark[1]], poseLandmarks[landmark[2]]);
        }
      }
    } else {
      return 0;
    }
  }

  private getAngleBetweenPoints(start, middle, end) {
    const radians = Math.atan2(end.y - middle.y, end.x - middle.x) - Math.atan2(start.y - middle.y, start.x - middle.x);
    const angle = Math.abs((radians * 180.0) / Math.PI);
    return +(angle > 180.0 ? 360 - angle : angle).toFixed(0);
  }

  private getAngleBetweenAllPoints(start, middle, end): number {
    const vectorA = {
      x: start.x - middle.x,
      y: start.y - middle.y,
      z: start.z - middle.z,
    };

    const vectorB = {
      x: end.x - middle.x,
      y: end.y - middle.y,
      z: end.z - middle.z,
    };

    const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
    const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2 + vectorA.z ** 2);
    const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2 + vectorB.z ** 2);

    const cosTheta = dotProduct / (magnitudeA * magnitudeB);
    const angleRadians = Math.acos(Math.min(Math.max(cosTheta, -1), 1));
    const angleDegrees = angleRadians * (180.0 / Math.PI);
    return +angleDegrees.toFixed(0);
  }
  private getTrunkLeftRight(
    results: any,
    canvasElement: HTMLCanvasElement
  ): number | null {
    if (!results.poseLandmarks) return null;  
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    const leftHip = results.poseLandmarks[23];
    const rightHip = results.poseLandmarks[24];  
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;  
    const imageWidth = canvasElement.width;
    const imageHeight = canvasElement.height;  
    // Midpoints (in pixel coords)
    const midShoulderX =
      ((leftShoulder.x + rightShoulder.x) / 2) * imageWidth;
    const midShoulderY =
      ((leftShoulder.y + rightShoulder.y) / 2) * imageHeight;
    const midHipX = ((leftHip.x + rightHip.x) / 2) * imageWidth;
    const midHipY = ((leftHip.y + rightHip.y) / 2) * imageHeight;  
    // Vector: shoulder → hip
    const dx = midHipX - midShoulderX;
    const dy = midHipY - midShoulderY;  
    // Angle from vertical
    let radians = Math.atan2(dx, dy); // note: dx vs dy swapped
    let angleDeg = radians * (180 / Math.PI);  
    // Normalize to -90..+90
    if (angleDeg < -90) angleDeg += 180;
    if (angleDeg > 90) angleDeg -= 180;  
    return +angleDeg.toFixed(2); // +ve = right tilt, -ve = left tilt
  }


  private getTrunkForwardBack(
    results: any,
    canvasElement: HTMLCanvasElement
  ): number | null {
    if (!results.poseLandmarks) return null;  
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    const leftHip = results.poseLandmarks[23];
    const rightHip = results.poseLandmarks[24];  
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;  
    // Midpoints
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };
    const midHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };
  
    // Torso vector (hip → shoulder)
    const torso = {
      x: midShoulder.x - midHip.x,
      y: midShoulder.y - midHip.y,
      z: midShoulder.z - midHip.z
    };
  
    const torsoLen = Math.sqrt(torso.x**2 + torso.y**2 + torso.z**2);
    if (torsoLen === 0) return null;  
    // Vertical axis (image space: y points down)
    const vertical = { x: 0, y: 1, z: 0 };  
    // Dot product torso vs vertical
    const dot = (torso.x * vertical.x + torso.y * vertical.y + torso.z * vertical.z);
    const angleDeg = Math.acos(dot / (torsoLen * Math.sqrt(vertical.x**2 + vertical.y**2 + vertical.z**2))) * (180 / Math.PI);
    // --- Forward / Backward sign ---
    // If shoulders are closer to camera (smaller z) than hips → forward lean
    let signedAngle = angleDeg;
    const depthDiff = midShoulder.z - midHip.z;
    if (depthDiff < 0) {
      signedAngle = angleDeg;   // Forward
    } else {
      signedAngle = -angleDeg;  // Backward
    }
    if (signedAngle < -90) signedAngle += 180;
    if (signedAngle > 90) signedAngle -= 180;
   // console.log("==== Trunk Forward/Back Angle ====", signedAngle.toFixed(2));
    return  +signedAngle.toFixed(2);
  }
  

    /**
   * Compare baseline and current shoulders to compute Right Shoulder Elevation Angle
   */
  private getRightShoulderElevation(
    results: any,
    canvasElement: HTMLCanvasElement
  ): number | null {
    if (
      !results.poseLandmarks ||
      !this.baselineLeftShoulder ||
      !this.baselineRightShoulder
    ) {
      return null;
    }

    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    if (!leftShoulder || !rightShoulder) return null;
    // Baseline positions (scaled to canvas space)
    const Lx_base = this.baselineLeftShoulder.x;
    const Ly_base = this.baselineLeftShoulder.y;
    const Rx_base = this.baselineRightShoulder.x;
    const Ry_base = this.baselineRightShoulder.y;
    // Current positions (scaled to canvas space)
    const Lx = leftShoulder.x;
    const Ly = leftShoulder.y;
    const Rx = rightShoulder.x;
    const Ry = rightShoulder.y;
    // Formula: arctan((Ry - R’y) / (R’x - L’x))
    const numerator = Ry - Ry_base;
    const denominator = Rx_base - Lx_base;
    if (denominator === 0) return null;
    const angleRad = Math.atan2(numerator, denominator);
    let angleDeg = angleRad * (180 / Math.PI);
    //console.log("📐 Right Shoulder Elevation:", angleDeg.toFixed(2));
    if (angleDeg < -90) angleDeg += 180;
    if (angleDeg > 90) angleDeg -= 180;
    //console.log("📐 Left Shoulder Elevation:after +-180", angleDeg.toFixed(2));
    return +angleDeg.toFixed(2);
  }

  /**
   * Compare baseline and current shoulders to compute Left Shoulder Elevation Angle
   */
  private getLeftShoulderElevation(
    results: any,
    canvasElement: HTMLCanvasElement
  ): number | null {
    if (
      !results.poseLandmarks ||
      !this.baselineLeftShoulder ||
      !this.baselineRightShoulder
    ) {
      return null;
    }
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    if (!leftShoulder || !rightShoulder) return null;
    // Baseline positions (scaled to canvas space)
    const Lx_base = this.baselineLeftShoulder.x;
    const Ly_base = this.baselineLeftShoulder.y;
    const Rx_base = this.baselineRightShoulder.x;
    // Current positions (scaled to canvas space)
    const Lx = leftShoulder.x ;
    const Ly = leftShoulder.y ;
    // Formula: arctan((Ly - L’y) / (L’x - R’x))
    const numerator = Ly - Ly_base;
    const denominator = Lx_base - Rx_base;
    if (denominator === 0) return null;
    const angleRad = Math.atan2(numerator, denominator);
    let angleDeg = angleRad * (180 / Math.PI);
    //console.log("📐 Left Shoulder Elevation:", angleDeg.toFixed(2));
    if (angleDeg < -90) angleDeg += 180;
    if (angleDeg > 90) angleDeg -= 180;
    //console.log("📐 Left Shoulder Elevation:after +-180", angleDeg.toFixed(2));
    return +angleDeg.toFixed(2);
  }

  private getShoulderTiltAngle( results: any, canvasElement: HTMLCanvasElement ): number | null { 
    if (!results.poseLandmarks) return null; 
    const leftShoulder = results.poseLandmarks[11]; 
    const rightShoulder = results.poseLandmarks[12]; 
    if (!leftShoulder || !rightShoulder) return null; 
    const imageWidth = canvasElement.width; 
    const imageHeight = canvasElement.height; 
    const x1 = leftShoulder.x * imageWidth;
    const y1 = leftShoulder.y * imageHeight; 
    const x2 = rightShoulder.x * imageWidth; 
    const y2 = rightShoulder.y * imageHeight; 
    let radians = Math.atan2(y2 - y1, x2 - x1); 
    let angleDeg = radians * (180 / Math.PI); 
    // Normalize tilt to -90..+90 
    if (angleDeg < -90) angleDeg += 180; 
    if (angleDeg > 90) angleDeg -= 180; 
    //console.log("====angleDeg final===",angleDeg); 
    return +angleDeg.toFixed(2); 
  }

  // ================== SHOW + SEND ALERT ==================
  private showAndSendCompensationAlert(alertMsg: string | null) {
    if (!alertMsg) return;
        // Show locally (patient UI)
      if (alertMsg) {
        console.log("send the alerts in compensation alert component  end ",alertMsg);
        this.alertService.showAlert(alertMsg);
      }
      try {
      if (therapistToPatientConnection && therapistToPatientConnection.open) {
        console.log("send the alerts in therapist end ",alertMsg);
          therapistToPatientConnection.send(({
              type: 'compensation_msg_alerts',
              message: alertMsg
            }));
        }
      } catch (err) {
        console.warn('Failed to send compensation alert to therapist', err);
      }
  }
  // ================== COMPENSATION ALERT ==================
  /*private buildCompensationAlert(): string | null { 
    if (this.trunkLeftCounter > 0 || this.trunkRightCounter > 0 || 
      this.trunkForwardCounter > 0 || this.trunkBackwardCounter > 0) {    return "Sit straight";  }
    if (this.rightElbowCounter > 0 || this.leftElbowCounter > 0) {    return "Straighten your elbows";  }  
    if (this.rightShoulderCounter > 0 || this.leftShoulderCounter > 0) {   return "Lower your shoulders";  } 
  }*/
  private buildCompensationAlert(): string | null {
    const alerts: string[] = [];
    if (
      this.trunkLeftCounter > 0 ||
      this.trunkRightCounter > 0 ||
      this.trunkForwardCounter > 0 ||
      this.trunkBackwardCounter > 0
    ) {
      alerts.push(" Sit straight ");
    }
    if (this.rightElbowCounter > 0 || this.leftElbowCounter > 0) {
      alerts.push(" Straighten your elbows ");
    }
    if (this.rightShoulderCounter > 0 || this.leftShoulderCounter > 0) {
      alerts.push(" Lower your shoulders ");
    }
    if (alerts.length === 0) return null;
    return alerts.join(" and ");
  }
  private getTotalCompensationCount(): number {
    return (
      this.roundLeftElbowTotal +
      this.roundRightElbowTotal +
      this.roundLeftShoulderTotal +
      this.roundRightShoulderTotal +
      this.roundTrunkLeftTotal +
      this.roundTrunkRightTotal +
      this.roundTrunkForwardTotal +
      this.roundTrunkBackwardTotal
    );
  }
  // ================== ANGLE CALCULATION ==================
  private calculateOtherGameAngles(
    results: Results,
    canvasCtx: CanvasRenderingContext2D,
    canvasElement: HTMLCanvasElement
  ) {
    console.log("==========firse section call=====",this.startAngleTracking);
    if (!this.startAngleTracking) return;
    const elapsedTime = +((Date.now() - this.startTime) / 1000).toFixed(1);
    const now = Date.now();
    if (now - this.lastCheckTime >= this.COMPENSATION_INTERVAL * 1000) {
      // ✅ STOP CONDITION — if total compensation reaches 10, do not count anymore
     if (this.getTotalCompensationCount() >= 40) {
        console.log("🚫 Compensation limit reached (10). Ignoring further compensations.");
        return; // <-- stops further processing
      }
      const leftElbowAngle = this.getAngle([11, 13, 15], results.poseLandmarks);
      const rightElbowAngle = this.getAngle([12, 14, 16], results.poseLandmarks);
      console.log("left right elbow angle===",leftElbowAngle,rightElbowAngle)
      if (leftElbowAngle > this.leftElbowThreshold) {
        this.leftElbowCounter++; 
        console.log("✅ Left elbow",leftElbowAngle,this.leftElbowThreshold);
      }
      if (rightElbowAngle > this.rightElbowThreshold) {
        this.rightElbowCounter++;
        console.log("✅ right elbow",rightElbowAngle,this.rightElbowThreshold);
      }
      /*const rightShoulderDiff = this.getRightShoulderElevation(results, canvasElement);
      const leftShoulderDiff = this.getLeftShoulderElevation(results, canvasElement);
      if (rightShoulderDiff !== null && rightShoulderDiff > this.rightShoulderThreshold) {
        this.rightShoulderCounter++;
      }
      if (leftShoulderDiff !== null && leftShoulderDiff < -this.leftShoulderThreshold) {
        this.leftShoulderCounter++;
      }*/
      // --- SHOULDERS --- const 
      const shoulderTilt = this.getShoulderTiltAngle(results, canvasElement); 
      if (shoulderTilt !== null) { 
        if (shoulderTilt > this.rightShoulderThreshold) {
          this.rightShoulderCounter++; 
          console.log("✅ Left Shoulder",shoulderTilt,this.rightShoulderThreshold);
        }
        if (shoulderTilt < -this.leftShoulderThreshold){
          this.leftShoulderCounter++; 
          console.log("✅ RIGHT Shoulder",shoulderTilt,this.leftShoulderThreshold);
        } 
      }
      const leftHip = results.poseLandmarks?.[23];
      const rightHip = results.poseLandmarks?.[24];
      const isHipVisible =
      (leftHip && leftHip.visibility > 0.5) ||
      (rightHip && rightHip.visibility > 0.5);

      if (isHipVisible) {
        // --- TRUNK ---
        const trunkLR = this.getTrunkLeftRight(results, canvasElement);
        let trunkFB = this.getTrunkForwardBack(results, canvasElement);
        trunkFB += 4; 
        if (trunkLR !== null) {
          if (trunkLR > this.trunkRightThreshold) this.trunkRightCounter++;
          else if (trunkLR < -this.trunkLeftThreshold) this.trunkLeftCounter++;
        }
        if (trunkFB !== null) {
          if (trunkFB > this.trunkBackwardThreshold) this.trunkBackwardCounter++;
          else if (trunkFB < -this.trunkForwardThreshold) this.trunkForwardCounter++;
        }
      } else {
      console.log("⛔ Skipping trunk compensation (Hip NOT visible / NOT detected)");
      }
      this.roundLeftElbowTotal += this.leftElbowCounter;
      this.roundRightElbowTotal += this.rightElbowCounter;
      this.roundLeftShoulderTotal += this.leftShoulderCounter;
      this.roundRightShoulderTotal += this.rightShoulderCounter;
      this.roundTrunkLeftTotal += this.trunkLeftCounter;
      this.roundTrunkRightTotal += this.trunkRightCounter;
      this.roundTrunkForwardTotal += this.trunkForwardCounter;
      this.roundTrunkBackwardTotal += this.trunkBackwardCounter;
      // --- Build alert object ---
      const alertMsg = this.buildCompensationAlert();
      this.speakText(alertMsg, this.volumeLevelThreshold);
      this.showAndSendCompensationAlert(alertMsg);
      // --- Build alert object ---
      const alert = {
        round: this.roundNumber,
        timestamp: elapsedTime,
        leftElbowAngle,
        rightElbowAngle,
        leftElbowCounter: this.leftElbowCounter,
        rightElbowCounter: this.rightElbowCounter,
        leftShoulderCounter: this.leftShoulderCounter,
        rightShoulderCounter: this.rightShoulderCounter,
        trunkLeftCounter: this.trunkLeftCounter,
        trunkRightCounter: this.trunkRightCounter,
        trunkForwardCounter: this.trunkForwardCounter,
        trunkBackwardCounter: this.trunkBackwardCounter,
        roundLeftElbowTotal: this.roundLeftElbowTotal,
        roundRightElbowTotal: this.roundRightElbowTotal,
        roundLeftShoulderTotal: this.roundLeftShoulderTotal,
        roundRightShoulderTotal: this.roundRightShoulderTotal,
        roundTrunkLeftTotal: this.roundTrunkLeftTotal,
        roundTrunkRightTotal: this.roundTrunkRightTotal,
        roundTrunkForwardTotal: this.roundTrunkForwardTotal,
        roundTrunkBackwardTotal: this.roundTrunkBackwardTotal,
        alertMessage: this.buildCompensationAlert()
      };    
      this.compensationAlerts.push(alert);
      this.leftElbowCounter = 0;
      this.rightElbowCounter = 0;
      this.leftShoulderCounter = 0;
      this.rightShoulderCounter = 0;
      this.trunkLeftCounter = 0;
      this.trunkRightCounter = 0;
      this.trunkForwardCounter = 0;
      this.trunkBackwardCounter = 0;
      this.lastCheckTime = now;
    }
  }

  private speakText(text: string, userVolume: number): void {
    if (!text) return;
    const volume = Math.min(Math.max(userVolume / 5, 0), 1);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = volume; 
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang === 'en-US') || voices[0];
    window.speechSynthesis.speak(utterance);
  }
  private onPoseCameraResults(results: Results, canvasCtx: CanvasRenderingContext2D, canvasElement: HTMLCanvasElement) {
    console.log("======results====",results,this.showMarker);
    console.log("======canvasCtx====",canvasCtx,this.showDefaultMarker);
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      if (results.poseLandmarks) {
        if (this.showDefaultMarker) {
          results.poseLandmarks.forEach((landmark, index) => {
            const renderedIndexs = [0, 11, 12, 13, 15, 14, 16, 23, 24, 25, 26, 27, 28];
            const drawJoint = (index: number, landmark: any, color: string, size: number = 2) => {
              canvasCtx.beginPath();
              canvasCtx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, size, 0, 2 * Math.PI);
              canvasCtx.fillStyle = color;
              canvasCtx.fill();
            };
            if (renderedIndexs.includes(index)) {
              drawJoint(index, landmark, 'rgb(25=======this.showMarker=========5, 255, 255)', 2);
            }
          });
        }
       if (this.showMarker) { 
          let currentAngle = [];
          const TIME_TOLERANCE = 0.2;
          const elapsedTime = +((Date.now() - this.startTime) / 1000).toFixed(1);
          const withinTimeTolerance = (time: number, target: number, toleranceSec: number) =>
            time >= target && time <= target + toleranceSec;
          const currentVideoAngle = this.videoMinMax[this.currentVideoIndex];     
          if (this.duration > 10) {
            const timeDiff = Math.abs(elapsedTime - this.duration);
            if (timeDiff <= 2 && !this.isVideoPaused) {
              //this.isVideoPaused = true;
              //this.patientWebRtcService.setShouldPauseGameState(true);
            }
            if (timeDiff <= 7 && !this.finalFeedback) {
              this.finalFeedback = true;
              this.generatefeedback();
            }
          }
          if (currentVideoAngle) {
            const [clipTimestamp, ...metaData] = currentVideoAngle;
            this.timeMatching = withinTimeTolerance(elapsedTime, clipTimestamp, TIME_TOLERANCE);
            
            if (this.timeMatching) {
              this.isIdle = true;
              const angleData = [];
              metaData.forEach((data, index) => {
                const [type, landmark, angle] = data;
                currentAngle[index] = this.getAngle(landmark, results.poseLandmarks);
                this.currentCondition[index] = this.getCondition(type, angle, currentAngle[index]);
                // if (this.currentCondition[index] === 'Bad') {
                // console.log(currentAngle[index], angle, clipTimestamp, elapsedTime, landmark, type, this.currentCondition[index]);
                // console.log(type, results.poseWorldLandmarks[landmark[0]], results.poseWorldLandmarks[landmark[1]]);
                // }

                const isPostureOrIdle = type === 'posture' || type === 'idle';
                if (isPostureOrIdle && this.isIdle) {
                  this.isIdle = false;
                  this.checkIdleCondition();
                } else {
                  angleData.push(currentAngle[index]);
                }
                // console.log(angleData)
                if (index == metaData.length - 1 && angleData.length > 0) {
                  this.matchingCameraData.push({
                    timestamp: `${elapsedTime}`,
                    deg: angleData,
                  });
 
                  // For studio games, call checkIdleCondition more frequently to update progress
                  if (this.gameId === 3) {
                    this.checkIdleCondition();
                  }
                }
              });
            }
            if (this.duration > 10) {
              const timeDiff = Math.abs(elapsedTime - this.duration);
              if (timeDiff <= 2 && !this.isVideoPaused) {
                //this.isVideoPaused = true;
               // this.patientWebRtcService.setShouldPauseGameState(true);
              }
              if (timeDiff <= 5 && !this.finalFeedback) {
                this.finalFeedback = true;
                this.checkIdleCondition();
                this.generatefeedback();
              }
            }

            this.timeMatching, 'this.timeMatching';
            if (!this.timeMatching && (this.timeMatching !== this.lastTimeMatching || elapsedTime > clipTimestamp)) {
              this.currentVideoIndex++;
              this.currentCondition = [];
            }

            this.lastTimeMatching = this.timeMatching;

            // this.timeLog.push({
            //   elapsedTime,
            //   timeMatching: this.timeMatching,
            //   leftAngle,
            //   rightAngle,
            //   leftCondition: this.leftCondition,
            //   rightCondition: this.rightCondition,
            //   currentVideoIndex: this.currentVideoIndex,
            //   currentVideoAngle
            // });
            const joints = [];

            this.landmarks.forEach((landmarkIndex) => {
              const drawJoint = (index: number, landmark: any, color: string, size: number = 2) => {
                canvasCtx.beginPath();
                canvasCtx.arc(
                  landmark.x * canvasElement.width,
                  landmark.y * canvasElement.height,
                  size,
                  0,
                  2 * Math.PI
                );
                canvasCtx.fillStyle = color;
                canvasCtx.fill();
                joints.push({ index, color });
              };

              let size = 2;
              let jointColor = 'rgb(255, 255, 255)';

              const now = Date.now();

              const cached = this.landmarkColorCache.get(landmarkIndex);
              if (cached && cached.expiresAt > now) {
                size = 6;
                jointColor = cached.color;
              } else if (this.timeMatching) {
                const metaIndex = metaData.findIndex((meta) => meta[1] && meta[1][1] === landmarkIndex);

                if (metaIndex !== -1) {
                  const meta = metaData[metaIndex];
                  const isPosture = meta[0] === 'posture';
                  const condition = this.currentCondition[metaIndex];

                  if (isPosture && condition === 'Good') {
                    jointColor = 'rgb(255, 255, 255)';
                  } else {
                    size = 6;
                    jointColor = condition === 'Good' ? 'rgb(0, 255, 0)' : 'rgb(255, 0, 0)';
                    this.landmarkColorCache.set(landmarkIndex, {
                      color: jointColor,
                      expiresAt: now + 500,
                    });
                  }
                }
              }

              drawJoint(landmarkIndex, results.poseLandmarks[landmarkIndex], jointColor, size);
            });
            if (therapistToPatientConnection) {
              therapistToPatientConnection.send({
                type: 'skeleton_tracking',
                data: { userId: this.currentUser, frame: { joints } },
              });
              therapistToPatientConnection.send({
                type: 'progress_bar',
                data: {
                  userId: this.currentUser,
                  barPercentage: this.barPercentage,
                  barThumbsUp: this.barThumbsUp,
                  showProgressBar: 'true',
                  gameScoreSummaryData: this.gameScoreSummaryData,
                },
              });
            }
            this.cdr.detectChanges();
          }
        }
      }
      // if (therapistToPatientConnection && this.landmarks.length == 0) {
      //   therapistToPatientConnection.send({ type: 'skeleton_tracking', data: { userId: this.currentUser, frame: { joints: [] } } });
      //   therapistToPatientConnection.send({ type: 'progress_bar', data: { userId: this.currentUser, barPercentage: 0, barThumbsUp: 0, showProgressBar: 'false' } });
      // }
    }
  }

  async playCommentAudio(commentText: string) {
    const firstTimeText = this.firstTimeSpeech ? 'I paused the video to tell you this: ' : '';
    if (commentText === '') {
      this.checkIdle = true;
      this.showMarker = true;
      this.callChatGPT = false;
      this.patientWebRtcService.setShouldPauseGameState(false);
      return;
    }
    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': 'sk_e860ad577bda185b1f347aad2430e78bd067afdda73e6529',
        },
        body: JSON.stringify({
          text: firstTimeText + commentText,
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      this.checkIdle = true;
      this.showMarker = true;
      this.callChatGPT = false;
      this.firstTimeSpeech = false;
      this.lastTriggerTime = Date.now();
      this.patientWebRtcService.setShouldPauseGameState(false);
    } else if (contentType && (contentType.includes('audio/') || contentType.includes('application/octet-stream'))) {
      if (!this.isVideoPaused) {
        this.showMarker = false
        //this.isVideoPaused = true
        //this.patientWebRtcService.setShouldPauseGameState(true);
      }
      const blobData = await response.blob();
      const audioUrl = URL.createObjectURL(blobData);
      this.audio = new Audio(audioUrl);
      this.audio.volume = 0.8;
      this.audio.play();
      this.audio.onended = () => {
        this.checkIdle = true;
        this.showMarker = true;
        this.callChatGPT = false;
        this.firstTimeSpeech = false;
        this.lastTriggerTime = Date.now();
        this.patientWebRtcService.setShouldPauseGameState(false);
      };
    }
  }
}

export class HeygenAPIService {
  API_CONFIG = {
    apiKey: 'NmU1MGQyNGE4YzZjNDQyZjllODM3Y2JjZDljMjY4NWUtMTczNTIwNzQ1Nw==', // Yoram
    // apiKey: "ZThmY2JiZWQ0MDUxNGYzNmEwZmFlYTdhOWE2ZTBiN2MtMTcxMTEwMTQ1NQ==", // Raghav
    // apiKey: "ZWE1NjlmOGZmNGIzNDg1M2FjYWY3Mzg",
    serverUrl: 'https://api.heygen.com',
  };

  newSessionInfo: any = null;
  private room: any = null;
  mediaStream: MediaStream | null = null;
  webSocket: WebSocket | null = null;
  sessionToken: string | null = null;

  avatarID: string = '';
  voiceID: string = '';
  taskInput: string = '';
  statusMessages: string[] = [];

  updateNewStatus(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.statusMessages.push(`[${timestamp}] ${message}`);
  }

  async getSessionToken() {
    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.create_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.API_CONFIG.apiKey,
      },
    });

    const data = await response.json();
    this.sessionToken = data.data.token;
    this.updateNewStatus('Session token obtained');
  }

  async connectWebSocket(sessionId: string) {
    const params = new URLSearchParams({
      session_id: sessionId,
      session_token: this.sessionToken!,
      silence_response: 'false',
      opening_text: '',
      stt_language: 'en',
    });

    const wsUrl = `wss://${new URL(this.API_CONFIG.serverUrl).hostname}/v1/ws/streaming.chat?${params}`;
    this.webSocket = new WebSocket(wsUrl);

    this.webSocket.addEventListener('message', (event: MessageEvent) => {
      const eventData = JSON.parse(event.data);
      // console.log("Raw WebSocket event:", eventData);
    });
  }

  async createNewSession() {
    if (!this.sessionToken) {
      await this.getSessionToken();
    }

    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        quality: 'high',
        avatar_name: 'Ann_Therapist_public',
        voice: {
          voice_id: this.voiceID,
          rate: 1.0,
        },
        version: 'v2',
        video_encoding: 'H264',
      }),
    });

    const data = await response.json();
    // console.log("data : ", data)
    this.newSessionInfo = data.data;

    this.room = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: LivekitClient.VideoPresets.h720.resolution,
      },
    });

    this.room.on(LivekitClient.RoomEvent.DataReceived, (message: any) => {
      const data = new TextDecoder().decode(message);
      // console.log("Room message:", JSON.parse(data));
    });

    this.mediaStream = new MediaStream();
    this.room.on(LivekitClient.RoomEvent.TrackSubscribed, (track: any) => {
      if (track.kind === 'video' || track.kind === 'audio') {
        this.mediaStream!.addTrack(track.mediaStreamTrack);
        if (this.mediaStream!.getVideoTracks().length > 0 && this.mediaStream!.getAudioTracks().length > 0) {
          const mediaElement = document.getElementById('mediaElement') as HTMLVideoElement;
          mediaElement.srcObject = this.mediaStream;
          this.updateNewStatus('Media stream ready');
        }
      }
    });

    this.room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track: any) => {
      const mediaTrack = track.mediaStreamTrack;
      if (mediaTrack) {
        this.mediaStream!.removeTrack(mediaTrack);
      }
    });

    this.room.on(LivekitClient.RoomEvent.Disconnected, (reason: any) => {
      this.updateNewStatus(`Room disconnected: ${reason}`);
    });

    await this.room.prepareConnection(this.newSessionInfo.url, this.newSessionInfo.access_token);
    this.updateNewStatus('Connection prepared');

    await this.connectWebSocket(this.newSessionInfo.session_id);
    this.updateNewStatus('Session created successfully');
  }

  async startStreamingSession() {
    const startResponse = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
      }),
    });

    await this.room.connect(this.newSessionInfo.url, this.newSessionInfo.access_token);
    this.updateNewStatus('Connected to room');
  }

  async sendText(text: string, taskType: string = 'talk') {
    if (!this.newSessionInfo) {
      this.updateNewStatus('No active session');
      return;
    }

    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
        text: text,
      }),
    });

    this.updateNewStatus(`Sent text (${taskType}): ${text}`);
    return response.json();
  }

  async closeSession() {
    if (!this.newSessionInfo) {
      this.updateNewStatus('No active session');
      return;
    }

    await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    this.updateNewStatus('Session closed');
  }

  onStart() {
    this.createNewSession().then(() => this.startStreamingSession());
  }

  onClose() {
    this.closeSession();
  } 
}
