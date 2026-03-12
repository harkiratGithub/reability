import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  Input,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import { GameHistorySessionComponent } from '../game-history-session/game-history-session.component';
import { User } from '../../../common/models/user';
import { SkeltonVideoService } from '../../../common/services/skelton-video.service';
import { GameSettingsService } from '../../services/game-settings.service';
import { SkeletonProgressBarService } from '../../../common/services/skeleton-progress-bar.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { FeatureFlagService } from '../../../common/services/feature-flag.service';
import { log } from 'console';

// Unity WebGL Integration TypeScript Declarations
declare global {
  interface Window {
    OpeningSceneManager?: {
      init: (unityInstance: any) => void;
      initializeOpeningScene: () => void;
      sendModeAndConfigToUnity: (mode: string, config: any) => void;
      onConfigSent?: (configJson: string) => void;
      onQuitRequested?: () => void;
    };
    angularApp?: {
      onGrillConfigUpdated?: (config: any) => void;
    };
    unityInstance?: any;
  }
}
@Component({
  selector: 'app-game-wrapper',
  templateUrl: './game_wrapper.component.html',
  styleUrls: ['./game_wrapper.component.scss'],
})
export class GameWrapperComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('unityCanvas') unityCanvasRef!: ElementRef<HTMLCanvasElement>;
  currentGameUrl;
  iframeEl;
  gameId;
  // Dedupe only the patient session start block to avoid duplicate logs/calls
  private patientSessionStarted = false;
  // Cache latest ICE servers for assessment settings send
  private latestIceServers: any[] = [];
  // Ensure assessment settings are sent only once per iframe src
  private assessmentSettingsSent = false;
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
  private isDestroying = false;
  private unityProgressInterval: any;
  // Exposed to template to control loading placeholder visibility
  public unityGameLoaded = false;
  private unityInstance: any = null;
  private lastAssessmentLogTs: number = 0;
  useIframeFallback = false;
  // Elephant-specific lightweight watchdog (patient side)
  private elephantAckReceived: boolean = false;
  private elephantReloadAttempts: number = 0;
  private elephantWatchdogTimer: any = null;
  private elephantDebugFlag: boolean = false;
  // Tracks iframe initial load for placeholder logic
  public isIframeLoaded: boolean = false;
  // Therapist-side black-screen placeholder
  public showTherapistPlaceholder: boolean = false;
  private therapistVideoWatchTimer: any = null;

  // Derived flag for template: show branded placeholder only for Grill,
  // and hide it strictly when Unity signals ready (handleGameReady).
  public get showPlaceholder(): boolean {
    const isGrill =
      this.gameId === 20 ||
      ((this.currentGameName || '').toLowerCase() === 'grill') ||
      ((this.gameName || '').toLowerCase() === 'grill');

    if (!isGrill || this.isTherapist) {
      return false;
    }
    // For debugging: show placeholder AFTER Unity reports ready
    return this.unityGameLoaded;
  }
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
  @Input() connectedUser: any;
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
  @Output() gameSummaryEvent = new EventEmitter<any>();
  carouselText: string[] = [];
  currentTextIndex: number = 0;
  showCarouselText: boolean = false;
  isPopupVisible = false;
  unityInitialized = false;
  timer: any = null;
  elapsedTime: number = 0;
  currentVideoID = '';
  currentUser: User;
  currentGameSettings = null;
  public isCarouselEnabled = this.flagService.isEnabled('STUDIO_CAROUSEL_FLAG');
  
  // Queue initial session message if iframe not ready yet
  private pendingIsTherapistMessage: any = null;
  leftWrist: any = { x: 1, y: 2, z: 3 };
  rightWrist: any = { x: 4, y: 5, z: 6 };
  // Reduce log spam: only log game settings check when index/videoId changes
  private lastLoggedGameSettingsIndex: number | null = null;
  private lastLoggedGameSettingsVideoId: string | null = null;
  // Cache latest hands for combined body+fingers send
  private lastHandLandmarks: any[] | null = null;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('iframeRef', { static: false }) iframeRef!: ElementRef;
  @ViewChild('unityCanvas', { static: false }) unityCanvas!: ElementRef;

  // ===== Elephant Debug Helpers =====
  private isElephantActive(): boolean {
    try {
      const nameMatch = (this.currentGameName || '').toLowerCase() === 'elephant';
      const urlMatch = ('' + (this.currentGameUrl || '')).toLowerCase().includes('elephant');
      return nameMatch || urlMatch;
    } catch (_) {
      return false;
    }
  }
  private eleLog(tag: string, data?: any): void {
    if (!this.elephantDebugFlag) return;
    try { console.log('[ELEPHANT-DBG]', tag, data !== undefined ? data : ''); } catch (_) {}
  }
  private eleBreak(tag: string): void {
    try {
      const v = (window && window.localStorage) ? window.localStorage.getItem('ELEPHANT_DEBUG') : '0';
      const level = parseInt(v || '0', 10);
      const shouldBreak = (isNaN(level) ? v === '2' : level >= 2);
      if (!this.elephantDebugFlag || !shouldBreak) return;
    } catch (_) {
      if (!this.elephantDebugFlag) return;
    }
    try { console.log('[ELEPHANT-DBG][BREAK]', tag); } catch (_) {}
    // tslint:disable-next-line:no-debugger
    // eslint-disable-next-line no-debugger
    debugger;
  }
  constructor(
    private patientWebRtcService: PatientWebRtcService,
    private ajax: AjaxService,
    private authenticationService: AuthenticationService,
    private bodyService: BodyHandleService,
    private webCamSkeletonService: WebCamSkeletonService,
    private ngRedux: NgRedux<IAppState>,
    private dialog: MatDialog,
    private appActions: AppActions,
    private menuOptionsAppActions: MenuOptionsAppActions,
    private skeltonVideoService: SkeltonVideoService,
    private gameSettingsService: GameSettingsService,
    private skeltonProgressBarService: SkeletonProgressBarService,
    private router: Router,
    private flagService: FeatureFlagService,
  ) {
    // Enable Elephant debugging from localStorage (set ELEPHANT_DEBUG to '1' for logs, '2' for logs+breakpoints)
    try {
      const v = (window && window.localStorage) ? window.localStorage.getItem('ELEPHANT_DEBUG') : '0';
      this.elephantDebugFlag = (v && v !== '0') ? true : false;
      if (this.elephantDebugFlag) this.eleLog('Debugging enabled');
    } catch (_) { this.elephantDebugFlag = false; }

    this.subscription.add(
      this.currentGameUrl$.subscribe((currentGame) => {
        // Reset patient session dedupe when iframe src changes
        if (currentGame && currentGame !== this.currentGameUrl) {
          this.patientSessionStarted = false;
          // Reset Elephant watchdog on URL change
          this.elephantAckReceived = false;
          this.elephantReloadAttempts = 0;
          if (this.elephantWatchdogTimer) {
            clearTimeout(this.elephantWatchdogTimer);
            this.elephantWatchdogTimer = null;
          }
          this.eleLog('currentGameUrl changed', { from: this.currentGameUrl, to: currentGame });
        }
        this.currentGameUrl = currentGame;
        // this.updateIframeUrl (this.currentGameUrl);
      })
    );
    this.subscription.add(
      this.authenticationService.currentUser.subscribe((user) => {
        this.currentUser = user;
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

  private isGrillForTherapist(): boolean {
    return !!(
      this.isTherapist &&
      (this.gameIdTherapist === 20 || this.gameId === 20 || (this.gameName || '').toLowerCase() === 'grill')
    );
  }

  private startTherapistOverlayWatch(): void {
    if (!this.isGrillForTherapist()) {
      this.showTherapistPlaceholder = false;
      return;
    }
    let attempts = 0;
    const maxAttempts = 40; // ~20 seconds at 500ms interval

    const update = () => {
      const video = document.getElementById('grill-video-' + this.connectionId) as HTMLVideoElement | null;
      const hasFrame = !!(video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
      // Show while black screen (no frames yet)
      this.showTherapistPlaceholder = !hasFrame;

      // If frames arrived, stop watching and hide placeholder
      if (hasFrame && this.therapistVideoWatchTimer) {
        clearInterval(this.therapistVideoWatchTimer);
        this.therapistVideoWatchTimer = null;
        return;
      }

      // Hard stop after maxAttempts to avoid infinite loading overlay
      attempts++;
      if (attempts >= maxAttempts) {
        this.showTherapistPlaceholder = false;
        if (this.therapistVideoWatchTimer) {
          clearInterval(this.therapistVideoWatchTimer);
          this.therapistVideoWatchTimer = null;
        }
      }
    };
    update();
    if (this.therapistVideoWatchTimer) {
      clearInterval(this.therapistVideoWatchTimer);
    }
    this.therapistVideoWatchTimer = setInterval(update, 500);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When therapist connects (inTherapistSession becomes true),
    // immediately clear the carousel — it must never show in supervised mode.
    if (changes['inTherapistSession'] && changes['inTherapistSession'].currentValue === true) {
      this.isPopupVisible = false;
      this.carouselText = [];
      this.resetTimer();
    }
  }

  ngAfterViewInit() {
    // Load Unity only for Grill game (id: 20) on patient side
    if (!this.isTherapist && !this.unityInitialized && this.gameId === 20) {
      this.loadUnity();
      this.unityInitialized = true;
    }
  }








  ngOnInit() {
    console.log("====isCarouselEnabled===",this.isCarouselEnabled);
    this.connectionId = this.connectionId;

    // Setup Unity OpeningSceneManager integration
    this.setupUnityOpeningSceneManager();
    
    // Expose test functions globally for debugging
    (window as any).testSendUnityGameConfig = () => this.testSendUnityGameConfig();
    (window as any).testSendUnityGameConfigViaIframe = () => this.sendUnityGameConfigViaIframe();
    // Expose Grill score hook expected by Unity
    try { (window as any).SendConfigToWebGL = (value: any) => this.handleGrillUnityScore(value); } catch (_) {}
    
    
    window.addEventListener('message', (event) => {
     
      
      if (event.data) {
        this.skeltonVideoService.setGameVideoElement(event.data); // Pass video element to the service
       
      }
      
      // Listen for Unity game responses
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'UNITY_RESPONSE') {
          console.log('📨 [IFRAME MESSAGE DEBUG] Unity Response:', event.data);
        } else if (event.data.type === 'UNITY_READY') {
          console.log('[UNITY] Unity game is ready!');
          // Notify WebRTC layer that Unity canvas is ready to capture
          try {
            const evt = new CustomEvent('unity-canvas-ready', { detail: { gameId: this.gameId, id: 'unity-canvas' } });
            window.dispatchEvent(evt);
          } catch (_) {}

          // Hint Unity's own resize logic to recompute the canvas size,
          // which is what currently happens only after a manual window resize.
          try {
            setTimeout(() => {
              try { window.dispatchEvent(new Event('resize')); } catch (_) {}
            }, 50);
            setTimeout(() => {
              try { window.dispatchEvent(new Event('resize')); } catch (_) {}
            }, 300);
          } catch (_) {}
        } else if (event.data.type === 'UNITY_ERROR') {
          console.error('[UNITY] Unity game error:', event.data.error);
        } else {
          // Generic logger for Elephant debugging (non-Unity messages)
          if (this.isElephantActive()) {
            this.eleLog('window message (object)', event.data);
          }
        }
      } else if (typeof event.data === 'string') {
        // Some games use stringified JSON; safe log for Elephant debugging
        if (this.isElephantActive()) {
          this.eleLog('window message (string)', event.data);
        }
      }
    });

    // Start therapist-side overlay watchdog to cover black screen until frames arrive
    try { setTimeout(() => this.startTherapistOverlayWatch(), 600); } catch (_) {}
    if (!this.isTherapist) {
      // removed debug log: patient end
      this.initPatientCallbacks();
      this.initPatientSubscriptions();
      // Resolve patientId robustly for fetching settings
      let patientId =
        (this.connectedUser && this.connectedUser.patientId)
          ? this.connectedUser.patientId
          : (this.authenticationService.currentUserValue && this.authenticationService.currentUserValue.patientId)
            ? this.authenticationService.currentUserValue.patientId
            : (this.currentUser && (this.currentUser as any).patientId)
              ? (this.currentUser as any).patientId
              : this.currentUser?.id;

      // Optional override for assessment debugging
      try {
        const overrideId = (window && window.localStorage)
          ? window.localStorage.getItem('ASSESSMENT_PATIENT_ID_OVERRIDE')
          : null;
        if (this.gameId === 21 && overrideId && /^\d+$/.test(overrideId)) {
          patientId = +overrideId;
        // removed debug log: assessment override patientId
        }
      } catch (_) {}

      try {
        // no-op: removed debug log (assessment resolved patientId)
      } catch (_) {}

      if (patientId && this.gameId) {
                
        this.ajax.getGameSettings(this.gameId, patientId).subscribe((gamesettings) => {
          // Normalize response: support both { current_set: {...} } and flat object
          const normalizedSettings = (gamesettings && gamesettings.current_set) ? gamesettings.current_set : (gamesettings || {});
          this.currentGameSettings = normalizedSettings;
          // Log captured ROM/history entries for assessment game
          try {
            if (this.gameId === 21) {
              const historyRows = Array.isArray(this.currentGameSettings)
                ? (this.currentGameSettings as any[])
                : (this.currentGameSettings && Array.isArray((this.currentGameSettings as any).results))
                  ? (this.currentGameSettings as any).results
                  : [];
              const sample = Array.isArray(historyRows) ? historyRows.slice(0, 3) : [];
            }
          } catch (_) {}
          // If this is the Unity Grill game, send settings to Unity as soon as we have them
          if (this.gameId === 20) {
            try {
              this.sendGameSettingsOnce();
            } catch (err) {
              console.warn('[UNITY] Could not send settings immediately, will retry after Unity loads.', err);
            }
          }
          this.gameSettingsService.setGameSettings(this.currentGameSettings);

          // For assessment (gameId 21), attempt to send settings to iframe once data is ready
          if (this.gameId === 21) {
            this.trySendAssessmentSettingsToIframe();
          }
        });
      }
    } else {
      this.handleTherapistCallbacks();
    }

    window.addEventListener('message', (event) => {
      
      if (event.data) {
        let parsedResponse;
        
        // Handle both JSON strings and objects
        if (typeof event.data === 'string') {
          try {
            parsedResponse = JSON.parse(event.data);
          } catch (error) {
            return;
          }
        } else if (typeof event.data === 'object') {
          parsedResponse = event.data;
        } else {
          return;
        }
        
        // Debug logging for studio game messages
        if (this.currentGameName === 'studio') {
        }
        
        const type = parsedResponse.msg?.type;
        const index = parsedResponse.msg?.data?.index;
        const shouldPlay = parsedResponse.msg?.data?.shouldPlay;
        const vidTime = parsedResponse.msg?.data?.currentPlayTime?.vidTime;
        const sourceUrl = parsedResponse.msg?.data?.source;

        const videoIdMatch = sourceUrl?.match(/P\d+/);
        const videoId = videoIdMatch ? videoIdMatch[0] : null;

        if (this.currentVideoID !== videoId) {
          this.resetTimer();
        }

        const integerVidTime = Math.floor(vidTime);
        this.currentVideoID = videoId;
        
        // Log only when index or videoId changes to avoid repeated logs
        if (index !== this.lastLoggedGameSettingsIndex || videoId !== this.lastLoggedGameSettingsVideoId) {
          // console.log('📨 [IFRAME MESSAGE DEBUG] Checking Game Settings:', {
          //   index: index,
          //   videoId: videoId,
          //   currentGameSettings: this.currentGameSettings,
          //   hasCurrentGameSettings: !!this.currentGameSettings,
          //   currentGameSettingsType: typeof this.currentGameSettings
          // });
          this.lastLoggedGameSettingsIndex = index;
          this.lastLoggedGameSettingsVideoId = videoId;
        }
        
        if (index != undefined && this.currentGameSettings && this.currentGameSettings[index]?.fileName === videoId) {
          const additionalInfo = this.currentGameSettings[index]?.additionalInfo?.trim();
         console.log("@dev=====additionalInfo====",additionalInfo);
          this.carouselText = additionalInfo ? [additionalInfo] : [];
        } else {
          this.carouselText = [];
        }

        if (type === 'sync_video_data') {
          if (this.isEmpty(this.carouselText) || this.inTherapistSession) {
            this.isPopupVisible = false;
          }

          if (!this.timer) {
            this.startTimer();
          }

          if (!this.inTherapistSession && this.elapsedTime >= 2 && integerVidTime >= 2 && !this.isPopupVisible && !this.isEmpty(this.carouselText)) {
            this.isPopupVisible = true;
            this.startCarousel();
          } else if (integerVidTime < 2 || this.isEmpty(this.carouselText) || this.inTherapistSession) {
            this.isPopupVisible = false;
          }
        }
        
        // Forward sync_video_data messages to skeltonVideoService for video index change handling
        if (parsedResponse.msg && parsedResponse.msg.type === 'sync_video_data') {
          // removed debug log
          this.skeltonVideoService.setGameVideoElement(JSON.stringify(parsedResponse));
        }
        
        if (type === 'studio_started') {
          this.skeltonProgressBarService.setShowProgressBar('true');
        }
      }
    });

    (window as any).receiveMessageFromUnity = (data: any) => {
      console.log('📩 Received message from Unity:', data);
      try {
        const parsed = JSON.parse(data);
        console.log('Parsed Unity data:', parsed);
        // Handle game score or status here
      } catch {
        console.log('Raw data:', data);
      }
    };
  }

  isEmpty(array: string[]): boolean {
    return !array || array.length === 0 || array.every((item) => item.trim() === '');
  }



  resetTimer() {
    clearInterval(this.timer);
    this.timer = null;
    this.elapsedTime = 0;
  }

  startTimer() {
    this.timer = setInterval(() => {
      this.elapsedTime += 1;
      if (!this.inTherapistSession && this.elapsedTime >= 2 && !this.isPopupVisible && !this.isEmpty(this.carouselText)) {
        this.isPopupVisible = true;
        this.startCarousel();
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.introductionProgressEnded.emit(false);
    this.gameReadyToStart.emit(false);
    if (!this.isTherapist) {
      this.appActions.updateInitGameSettings({});
    }
    this.gotGameSettings = false;
    this.appActions.resetGameScore();
    this.appActions.stopTimer(false);

    // Ensure Unity audio is stopped when component is destroyed
    try {
      if (this.unityInstance && typeof this.unityInstance.Quit === 'function') {
        this.unityInstance.Quit();
      }
      if (this.unityInstance && typeof this.unityInstance.SendMessage === 'function') {
        this.unityInstance.SendMessage('WebGLAudioController', 'StopAllAudio');
      }
    } catch (_) {}
    try {
      const iframeUnityInstance = (this.iframeEl as any)?.contentWindow?.unityInstance;
      if (iframeUnityInstance && typeof iframeUnityInstance.SendMessage === 'function') {
        iframeUnityInstance.SendMessage('WebGLAudioController', 'StopAllAudio');
      }
    } catch (_) {}

    // Clean up Unity progress
    if (this.unityProgressInterval) {
      clearInterval(this.unityProgressInterval);
      this.unityProgressInterval = null;
    }
    this.unityGameLoaded = false;
    this.unityInstance = null;
    this.useIframeFallback = false;
    
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
    // Clear therapist overlay watchdog timer
    if (this.therapistVideoWatchTimer) {
      clearInterval(this.therapistVideoWatchTimer);
      this.therapistVideoWatchTimer = null;
    }
  }


  sendUnityLandmarkData(skeletonBuffer: any[]) {
    if (skeletonBuffer && skeletonBuffer.length >= 33) {
      const leftWrist = skeletonBuffer[16]; 
      const rightWrist = skeletonBuffer[15];

      const MIN_VISIBILITY = 0.1;
      if (leftWrist.visibility < MIN_VISIBILITY && rightWrist.visibility < MIN_VISIBILITY) {
        return;
      }

      const leftWristX = leftWrist.x || 0;
      const leftWristY = leftWrist.y || 0;
      const leftWristZ = leftWrist.z || 0;
      const rightWristX = rightWrist.x || 0;
      const rightWristY = rightWrist.y || 0;
      const rightWristZ = rightWrist.z || 0;
      
      this.drawHandTrackingOnCanvas(leftWrist, rightWrist);
      
    } else {
      // console.warn('[UNITY] Invalid skeleton buffer length:', skeletonBuffer?.length);
    }
  }

  drawHandTrackingOnCanvas = (leftWrist: any, rightWrist: any) => {
    if (!this.unityCanvas || !this.unityCanvas.nativeElement) {
      return;
    }

    const canvas = this.unityCanvas.nativeElement as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (leftWrist && leftWrist.visibility > 0.1) {
      const leftX = leftWrist.x * canvas.width;
      const leftY = leftWrist.y * canvas.height;
      
      ctx.fillStyle = '#00ff00'; 
      ctx.beginPath();
      ctx.arc(leftX, leftY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('L', leftX - 4, leftY + 4);
    }

    // Draw right hand tracking point
    if (rightWrist && rightWrist.visibility > 0.1) {
      const rightX = rightWrist.x * canvas.width;
      const rightY = rightWrist.y * canvas.height;
      
      ctx.fillStyle = '#ff0000'; // Red for right hand
      ctx.beginPath();
      ctx.arc(rightX, rightY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('R', rightX - 4, rightY + 4);
    }
  };

  sendGrillGameConfigViaPostMessage(handTrackingData: any) {
    try {
      if (this.iframeEl && this.iframeEl.contentWindow) {
        const messages = [
          {
            type: 'grillGameConfig',
            data: handTrackingData
          },
          {
            type: 'UNITY_GRILL_CONFIG',
            config: handTrackingData
          },
          {
            type: 'handTrackingConfig',
            mode: 'handTracking',
            leftWrist: handTrackingData.leftWrist,
            rightWrist: handTrackingData.rightWrist,
            timestamp: handTrackingData.timestamp
          }
        ];
        
        messages.forEach((message, index) => {
          this.iframeEl.contentWindow.postMessage(message, '*');
          console.log(`[UNITY] 📤 Sent grillGameConfig message format ${index + 1}:`, message);
        });
        
        console.log('[UNITY] 📤 All grillGameConfig messages sent via postMessage');
        return true;
      }
    } catch (error) {
      console.error('[UNITY] ❌ Error sending grillGameConfig via postMessage:', error);
    }
    
    return false;
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
      (gameSummary) => {
        console.log("📩 Summary received in GameWrapper:", gameSummary);    
        // ✅ emit immediately (no debounce delay)
        this.gameSummaryEvent.emit(gameSummary);
      }
    );

    communicationUtil.registerToCallback(
      MESSAGES.SESSION_FEEDBACK,
      debounce((gameFeedback) => {
        this.ajax.updateGameFeedback(gameFeedback).subscribe(() => { });
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
          console.log('showing end game modal', new Date());
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
      if (this.iframeEl) communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_READY_TO_START);
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
// console.log("@dev===skeletonBuffer==== start",skeletonBuffer);
            if (this.gameId === 20) {

            }
            const updated_skeleton = handleWebCamBuffer(
              skeletonBuffer,
              false,
              this.authenticationService.currentUserValue.peerId,
              this.iframeEl
            );
            communicationUtil.sendMessageToIframe(this.iframeEl, updated_skeleton, MESSAGES.SKELETON);

            // Send full pose landmarks only for non-Unity (assessment) games
            if (this.gameId !== 20) {
              // Throttled human-readable log of key joints for quick verification
              const now = Date.now();
              if (now - this.lastAssessmentLogTs > 1000 && Array.isArray(skeletonBuffer) && skeletonBuffer.length >= 33) {
                const LM = (i: number) => {
                  const p = skeletonBuffer[i] || {};
                  return { x: +(p.x ?? 0).toFixed(3), y: +(p.y ?? 0).toFixed(3), z: +(p.z ?? 0).toFixed(3), v: +(p.visibility ?? 0).toFixed(2) };
                };
                this.lastAssessmentLogTs = now;
              }
              const body = Array.isArray(skeletonBuffer)
                ? skeletonBuffer.map((lm: any) => ({
                    x: lm?.x ?? 0,
                    y: lm?.y ?? 0,
                    z: lm?.z ?? 0,
                    visibility: lm?.visibility ?? 0,
                  }))
                : [];
              this.sendBodyAndFingersMessage(body);
              if (this.gameId === 21) {
                const poseLandmarks = body;
                communicationUtil.sendMessageToIframe(
                  this.iframeEl,
                  { poseLandmarks, count: poseLandmarks.length, timestamp: Date.now() },
                  'pose_landmarks'
                );
              }
            }
          } else {
            // removed debug log
            communicationUtil.sendMessageToIframe(this.iframeEl, skeletonBuffer, MESSAGES.SKELETON);
          }
        }
      })
    );

    // Subscribe to hands landmarks to keep latest fingers cached
    /*this.subscription.add(
      this.webCamSkeletonService.currentHandResults$?.subscribe((multiHandLandmarks) => {
        this.lastHandLandmarks = Array.isArray(multiHandLandmarks) ? multiHandLandmarks : null;
      })
    );*/
    
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

        if (this.iframeEl) {
          communicationUtil.sendMessageToIframe(this.iframeEl, settings, MESSAGES.NEW_SETTINGS);
        }
        if (!this.isTherapist) {
          this.ajax.saveGameSettings(this.gameId, settings);
        }
      })
    );

    this.subscription.add(
      this.gameId$.subscribe((gameId) => {
        this.gameId = gameId;
        // Handle Unity games (Grill game ID: 20) - only on patient side
        if (gameId === 20 && !this.isTherapist) {
          console.log('[UNITY] Detected Grill game, starting Unity loading process...');
          this.handleUnityGameLoading();
          this.enableBodyTrackingForUnity();
          if (!this.unityInitialized) {
            this.loadUnity();
            this.unityInitialized = true;
          }
        }
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

  // Send combined body + fingers message to iframe (assessment)
  private sendBodyAndFingersMessage(body: any[]): void {
    if (!this.iframeEl || !this.iframeEl.contentWindow) return;
    if (this.gameId === 20) return; // Unity handled separately
    const hands = this.lastHandLandmarks; //[]; //this.lastHandLandmarks; comment this for remove hand landmark only send bodylandmark
    // console.log("@dev====hands======",hands);
    const left = Array.isArray(hands?.[0]) ? hands[0] : [];
    const right = Array.isArray(hands?.[1]) ? hands[1] : [];
    // console.log("@dev===final data sending ======",{
    //   type: 'body',
    //   msg: {
    //     body,
    //     fingers: { left, right },
    //     count: Array.isArray(body) ? body.length : 0,
    //     timestamp: Date.now(),
    //   },
    // });
    this.iframeEl.contentWindow.postMessage(
      {
        type: 'body',
        msg: {
          body,
          fingers: { left, right },
          count: Array.isArray(body) ? body.length : 0,
          timestamp: Date.now(),
        },
      },
      '*'
    );
  }

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
        console.log('End game modal data:', { 
          peerId: data?.peerId, 
          showModal: data?.showModal,
          currentPeerId: this.peerId 
        });
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

  handleUnityGameLoading = () => {
    // Don't load Unity on therapist side
    if (this.isTherapist) {
      console.log('[UNITY] Skipping Unity game loading on therapist side');
      return;
    }
    
    console.log('[UNITY] Starting comprehensive Unity game loading...');
    
    // Clear any existing interval
    if (this.unityProgressInterval) {
      clearInterval(this.unityProgressInterval);
    }
    
    // Start with 0% progress
    this.gameProgress = 0;
    this.updateGameProgress(0);
    
    // Simulate realistic Unity loading progress
    let progress = 0;
    const progressSteps = [
      { step: 10, delay: 500, message: 'Loading Unity Framework...' },
      { step: 25, delay: 1000, message: 'Loading Game Assets...' },
      { step: 40, delay: 800, message: 'Initializing WebGL...' },
      { step: 60, delay: 1200, message: 'Loading Game Data...' },
      { step: 80, delay: 1000, message: 'Preparing Game Scene...' },
      { step: 95, delay: 800, message: 'Finalizing...' },
      { step: 100, delay: 500, message: 'Game Ready!' }
    ];
    
    let currentStep = 0;
    
    const updateProgress = () => {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        progress = step.step;
        
        console.log(`[UNITY] ${step.message} - ${progress}%`);
        this.gameProgress = progress;
        this.updateGameProgress(progress);
        
        currentStep++;
        
        if (currentStep < progressSteps.length) {
          setTimeout(updateProgress, step.delay);
        } else {
          // Game fully loaded
          this.unityGameLoaded = true;
          console.log('[UNITY] Game loading completed successfully!');
          this.initializeUnityCanvas();
          this.handleGameReady();
        }
      }
    };
    
    // Start the progress updates
    setTimeout(updateProgress, 1000);
  };

  initializeUnityCanvas = () => {
    console.log('[UNITY] Initializing Unity canvas for direct game loading...');
    
    if (this.unityCanvas && this.unityCanvas.nativeElement) {
      const canvas = this.unityCanvas.nativeElement as HTMLCanvasElement;
      
      // Set canvas properties for Unity WebGL
      canvas.width = 800;
      canvas.height = 600;
      
      // Load Unity game directly in canvas
      // this.loadUnityGameInCanvas(canvas);
      
      console.log('[UNITY] ✅ Unity canvas initialized successfully');
    } else {
      console.error('[UNITY] ❌ Unity canvas element not found');
    }
  };


  loadUnityLoaderScriptWithTimeout = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[UNITY] Loading Unity loader script with timeout...');
      
      const existingScript = document.querySelector('script[src*="UnityLoader"]');
      if (existingScript) {
        console.log('[UNITY] Unity loader script already exists');
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://grillgamedemo.z13.web.core.windows.net/Build/UnityLoader.js';
      
      // Set timeout for script loading
      const timeout = setTimeout(() => {
        console.error('[UNITY] ❌ Unity loader script loading timeout');
        script.remove();
        reject(new Error('Unity loader script loading timeout'));
      }, 10000); // 10 second timeout
      
      script.onload = () => {
        clearTimeout(timeout);
        // removed debug log
        resolve();
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        console.error('[UNITY] ❌ Failed to load Unity loader script');
        script.remove();
        reject(new Error('Unity loader script failed to load'));
      };
      
      document.head.appendChild(script);
    });
  };

  tryAlternativeUnityLoaders = (canvas: HTMLCanvasElement) => {
    console.log('[UNITY] Trying alternative Unity loader approaches...');
    
    // Try different Unity loader URLs
    const alternativeUrls = [
      'https://grillgamedemo.z13.web.core.windows.net/Build/unity.loader.js',
      'https://grillgamedemo.z13.web.core.windows.net/Build/loader.js',
      'https://grillgamedemo.z13.web.core.windows.net/UnityLoader.js',
      'https://grillgamedemo.z13.web.core.windows.net/unity.loader.js'
    ];
    
    let currentIndex = 0;
    
    const tryNextLoader = () => {
      if (currentIndex >= alternativeUrls.length) {
        console.error('[UNITY] ❌ All Unity loader URLs failed');
        this.showUnityErrorOnCanvas(canvas, 'Unity loader not available. Click to try iframe fallback.');
        return;
      }
      
      const script = document.createElement('script');
      script.src = alternativeUrls[currentIndex];
      
      script.onload = () => {
        console.log(`[UNITY] ✅ Alternative Unity loader loaded from: ${alternativeUrls[currentIndex]}`);
        // this.createUnityInstanceInCanvas(canvas);
      };
      
      script.onerror = () => {
        console.log(`[UNITY] ⚠️ Failed to load Unity loader from: ${alternativeUrls[currentIndex]}`);
        currentIndex++;
        tryNextLoader();
      };
      
      document.head.appendChild(script);
    };
    
    tryNextLoader();
  };

  loadUnityLoaderScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[UNITY] Loading Unity loader script...');
      
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="UnityLoader"]');
      if (existingScript) {
        console.log('[UNITY] Unity loader script already exists');
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://grillgamedemo.z13.web.core.windows.net/Build/UnityLoader.js';
      script.onload = () => {
        // removed debug log
        resolve();
      };
      script.onerror = () => {
        console.error('[UNITY] ❌ Failed to load Unity loader script');
        reject(new Error('Unity loader script failed to load'));
      };
      document.head.appendChild(script);
    });
  };

  loadUnityLoader = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[UNITY] Loading Unity WebGL loader...');
      
      const loaderUrls = [
        'https://grillgamedemo.z13.web.core.windows.net/Build/Grill_OB.loader.js'
      ];
      
      let currentIndex = 0;
      
      const tryNextLoader = () => {
        if (currentIndex >= loaderUrls.length) {
          console.error('[UNITY] ❌ All Unity loader URLs failed');
          reject(new Error('All Unity loader URLs failed'));
          return;
        }
        
        const script = document.createElement('script');
        script.src = loaderUrls[currentIndex];
        script.onload = () => {
          console.log(`[UNITY] ✅ Unity loader loaded successfully from: ${loaderUrls[currentIndex]}`);
          
          // Load Unity WebGL helper script as per documentation
          this.loadUnityWebGLHelper().then(() => {
            // Test Unity loader integrity
            this.testUnityLoaderIntegrity().then(() => {
              resolve();
            }).catch((error) => {
              console.error('[UNITY] ❌ Unity loader integrity test failed:', error);
              reject(error);
            });
          }).catch((error) => {
            console.error('[UNITY] ❌ Unity WebGL helper failed:', error);
            reject(error);
          });
        };
        script.onerror = () => {
          console.log(`[UNITY] ⚠️ Failed to load Unity loader from: ${loaderUrls[currentIndex]}`);
          currentIndex++;
          tryNextLoader();
        };
        document.head.appendChild(script);
      };
      
      tryNextLoader();
    });
  };

  checkCanvasConflicts = (canvas: HTMLCanvasElement) => {
    console.log('[UNITY] Checking for canvas conflicts...');
    
    // Check if canvas is properly attached to DOM
    if (!document.contains(canvas)) {
      console.error('[UNITY] ❌ Canvas is not attached to DOM');
      return false;
    }
    
    // Check canvas dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.error('[UNITY] ❌ Canvas has zero dimensions:', { width: canvas.width, height: canvas.height });
      return false;
    }
    
    // Check if canvas is visible
    const computedStyle = window.getComputedStyle(canvas);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      console.error('[UNITY] ❌ Canvas is not visible:', { 
        display: computedStyle.display, 
        visibility: computedStyle.visibility 
      });
      return false;
    }
    
    // Check for other WebGL contexts in the page
    const allCanvases = document.querySelectorAll('canvas');
    let webglContextCount = 0;
    allCanvases.forEach((c, index) => {
      const ctx = c.getContext('webgl') || c.getContext('webgl2') || c.getContext('experimental-webgl');
      if (ctx) {
        webglContextCount++;
        console.log(`[UNITY] Found WebGL context on canvas ${index}:`, c.id || c.className || 'unnamed');
      }
    });
    
    if (webglContextCount > 0) {
      console.log(`[UNITY] ⚠️ Found ${webglContextCount} existing WebGL contexts - this might cause conflicts`);
    }
    
    console.log('[UNITY] ✅ Canvas conflict check completed');
    return true;
  };

  fixCanvasForWebGL = (canvas: HTMLCanvasElement) => {
    console.log('[UNITY] 🔧 Fixing canvas for WebGL compatibility...');
    
    try {
      // Ensure canvas has proper dimensions
      if (canvas.width < 1 || canvas.height < 1) {
        console.log('[UNITY] Setting canvas dimensions to 960x600');
        canvas.width = 960;
        canvas.height = 600;
      }
      
      // Remove any problematic CSS that might interfere with WebGL
      const computedStyle = window.getComputedStyle(canvas);
      console.log('[UNITY] Canvas computed style:', {
        position: computedStyle.position,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        width: computedStyle.width,
        height: computedStyle.height,
        transform: computedStyle.transform,
        opacity: computedStyle.opacity
      });
      
      // Ensure canvas is visible and not transformed in a way that breaks WebGL
      if (computedStyle.display === 'none') {
        console.log('[UNITY] Making canvas visible');
        canvas.style.display = 'block';
      }
      
      if (computedStyle.visibility === 'hidden') {
        console.log('[UNITY] Making canvas visible');
        canvas.style.visibility = 'visible';
      }
      
      // Remove any transforms that might interfere with WebGL
      if (computedStyle.transform && computedStyle.transform !== 'none') {
        console.log('[UNITY] Removing transform that might interfere with WebGL');
        canvas.style.transform = 'none';
      }
      
      // Ensure canvas is properly attached to DOM
      if (!document.contains(canvas)) {
        console.error('[UNITY] ❌ Canvas not in DOM - this will prevent WebGL context creation');
        return false;
      }
      
      // Force a reflow to ensure canvas is properly rendered
      canvas.offsetHeight;
      
      console.log('[UNITY] ✅ Canvas WebGL compatibility fixes applied');
      return true;
      
    } catch (error) {
      console.error('[UNITY] ❌ Error fixing canvas for WebGL:', error);
      return false;
    }
  };

  testFreshCanvas = () => {
    console.log('[UNITY] 🧪 Testing WebGL with fresh canvas...');
    
    try {
      // Create a completely fresh canvas
      const freshCanvas = document.createElement('canvas');
      freshCanvas.width = 800;
      freshCanvas.height = 600;
      freshCanvas.id = 'unity-test-canvas';
      
      // Add it to the DOM temporarily
      document.body.appendChild(freshCanvas);
      
      console.log('[UNITY] Fresh canvas created and added to DOM');
      
      // Test WebGL contexts on fresh canvas
      const contextTypes = ['webgl2', 'webgl', 'experimental-webgl'];
      let freshContext = null;
      
      for (const contextType of contextTypes) {
        console.log(`[UNITY] Testing fresh canvas with ${contextType}...`);
        try {
          freshContext = freshCanvas.getContext(contextType);
          if (freshContext) {
            console.log(`[UNITY] ✅ Fresh canvas ${contextType} SUCCESS!`);
            console.log(`[UNITY] Fresh context details:`, {
              constructor: freshContext.constructor.name,
              contextAttributes: freshContext.getContextAttributes ? freshContext.getContextAttributes() : 'N/A'
            });
            break;
          } else {
            console.log(`[UNITY] ❌ Fresh canvas ${contextType} returned NULL`);
          }
        } catch (error) {
          console.log(`[UNITY] ❌ Fresh canvas ${contextType} error:`, error.message);
        }
      }
      
      // Clean up
      document.body.removeChild(freshCanvas);
      
      if (freshContext) {
        console.log('[UNITY] ✅ Fresh canvas WebGL test SUCCESS - WebGL works, issue is with Unity canvas');
      } else {
        console.log('[UNITY] ❌ Fresh canvas WebGL test FAILED - WebGL not working in browser');
      }
      
    } catch (error) {
      console.error('[UNITY] ❌ Fresh canvas test error:', error);
    }
  };

  loadUnityWebGLHelper = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[UNITY] Loading Unity WebGL helper script...');
      
      // Try to load the OpeningSceneWebHelper.js as per Unity documentation
      const helperUrls = [
        'https://grillgamedemo.z13.web.core.windows.net/Build/OpeningSceneWebHelper.js',
        'https://grillgamedemo.z13.web.core.windows.net/StreamingAssets/OpeningSceneWebHelper.js'
      ];
      
      let currentIndex = 0;
      
      const tryNextHelper = () => {
        if (currentIndex >= helperUrls.length) {
          console.log('[UNITY] ⚠️ Unity WebGL helper not found, continuing without it');
          resolve(); // Don't fail if helper is missing
          return;
        }
        
        const script = document.createElement('script');
        script.src = helperUrls[currentIndex];
        script.onload = () => {
          console.log(`[UNITY] ✅ Unity WebGL helper loaded from: ${helperUrls[currentIndex]}`);
          resolve();
        };
        script.onerror = () => {
          console.log(`[UNITY] ⚠️ Failed to load Unity WebGL helper from: ${helperUrls[currentIndex]}`);
          currentIndex++;
          tryNextHelper();
        };
        
        document.head.appendChild(script);
      };
      
      tryNextHelper();
    });
  };

  testUnityLoaderIntegrity = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[UNITY] Testing Unity loader integrity...');
      
      // Check if createUnityInstance function exists
      if (typeof (window as any).createUnityInstance !== 'function') {
        reject(new Error('createUnityInstance function not found after loading Unity loader'));
        return;
      }
      
      // Check if Unity loader has proper structure
      const unityLoader = (window as any).createUnityInstance;
      if (typeof unityLoader !== 'function') {
        reject(new Error('createUnityInstance is not a function'));
        return;
      }
      
      console.log('[UNITY] ✅ Unity loader integrity test passed');
      console.log('[UNITY] Unity loader function type:', typeof unityLoader);
      console.log('[UNITY] Unity loader function name:', unityLoader.name);
      
      resolve();
    });
  };

  showLoadingMessageOnCanvas = (canvas: HTMLCanvasElement, message: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw loading background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw loading message
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Draw loading dots animation
    const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
    ctx.fillText(dots, canvas.width / 2, canvas.height / 2 + 30);
  };


  loadUnity() {
    // Don't load Unity on therapist side
    if (this.isTherapist) {
      console.log('[UNITY] Skipping Unity load on therapist side');
      return;
    }
    
    const loaderUrl = 'https://grillgamedemo.z13.web.core.windows.net/Build/Grill_OB.loader.js';
    const script = document.createElement('script');
    script.src = loaderUrl;
    // removed debug log
    try {
      script.onload = () => {
        // removed debug log
        // Set canvas size to 1280x720
        const canvas = document.querySelector('#unity-canvas') as HTMLCanvasElement;
        if (!canvas) {
          console.error('[UNITY] ❌ Unity canvas not found, cannot create Unity instance');
          return;
        }
        
        canvas.width = 1280;
        canvas.height = 720;
        
        // @ts-ignore
        createUnityInstance(canvas, {
          dataUrl: 'https://grillgamedemo.z13.web.core.windows.net/Build/Grill_OB.data.gz',
          frameworkUrl: 'https://grillgamedemo.z13.web.core.windows.net/Build/Grill_OB.framework.js.gz',
          codeUrl: 'https://grillgamedemo.z13.web.core.windows.net/Build/Grill_OB.wasm.gz',
          streamingAssetsUrl: 'StreamingAssets',
          companyName: 'Reability',
          productName: 'Physiotherapy Game',
          productVersion: '1.0',
        }).then((instance: any) => {
          this.unityInstance = instance;
          console.log('✅ Unity loaded successfully (direct loading)');

          this.sendLandmarkData();
          this.sendModeAndConfigToUnity();
        }).catch((error: any) => {
          console.error('Error in Unity direct loading:', error);
        });
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error in loadUnityDirectly:', error);
    }
  }

  setupUnityCallbacks(UnityIntegrationService: any) {
    // Setup score change callback
    UnityIntegrationService.setOnScoreChange((score: number) => {
      console.log('Score changed:', score);
      // Handle score change in Angular component
      this.handleScoreChange(score);
    });

    // Setup settings update callback
    UnityIntegrationService.setOnSettingsUpdate((settings: any) => {
      console.log('Settings updated:', settings);
      // Handle settings update in Angular component
      this.handleSettingsUpdate(settings);
    });

    // Setup game event callback
    UnityIntegrationService.setOnGameEvent((eventType: string, data: any) => {
      console.log('Game event:', eventType, data);
      // Handle game events in Angular component
      this.handleGameEvent(eventType, data);
    });

    // Setup debug message callback
    UnityIntegrationService.setOnDebugMessage((message: string) => {
      // removed debug log
    });
  }

  handleScoreChange(score: number) {
    // Update score in Angular component
    // This can be connected to your existing score handling logic
    console.log('Handling score change:', score);
  }

  handleSettingsUpdate(settings: any) {
    // Update settings in Angular component
    // This can be connected to your existing settings handling logic
    console.log('Handling settings update:', settings);
  }

  handleGameEvent(eventType: string, data: any) {
    // Handle game events in Angular component
    // This can be connected to your existing event handling logic
    console.log('Handling game event:', eventType, data);
  }


  sendModeAndConfigToUnity() {
    // Send game settings once
    this.sendGameSettingsOnce();
  }

  sendGameSettingsOnce() {
    console.log('🔍 [UNITY CONFIG DEBUG] ===== SENDING MODE AND CONFIG TO UNITY =====');
    const objectName = 'SimplifiedOpeningSceneManager';
    const methodName = 'OnModeAndConfigReceived';
    const gameSettings = this.currentGameSettings;
    
    // Log where game settings are coming from
    console.log('🔍 [UNITY CONFIG DEBUG] Game Settings Source:', {
      currentGameSettings: this.currentGameSettings,
      isNull: this.currentGameSettings === null,
      isUndefined: this.currentGameSettings === undefined,
      type: typeof this.currentGameSettings
    });
    
    // Provide default settings if currentGameSettings is undefined
    const defaultSettings = {
      m_TimeInSeconds: 60,
      m_Lives: 3,
      m_Temperature: 'High',
      m_Handedness: 'RightHanded',
      m_IngredientsPerSkewer: 5,
      m_NumberOfSkewersForPreparation: 5,
      m_SkewerSlots: 3
    };
    
    const settings = gameSettings || defaultSettings;
    // Ensure default mode if not provided; avoid overwriting default with undefined
    const { mode: incomingMode, ...restSettings } = settings || {};
    const finalMode = (incomingMode === undefined || incomingMode === null || incomingMode === '') ? 'patient' : incomingMode;
    const value = {
      mode: finalMode,
      ...restSettings,
    };
    
    console.log('🔍 [UNITY CONFIG DEBUG] Final Configuration Being Sent:', {
      objectName: objectName,
      methodName: methodName,
      originalGameSettings: gameSettings,
      defaultSettings: defaultSettings,
      finalSettings: settings,
      finalValue: value,
      jsonString: JSON.stringify(value)
    });
    
    console.log('🔍 [UNITY CONFIG DEBUG] ===== END CONFIG DEBUG =====');
    this.callUnityFunction(objectName, methodName, value);
  } 
    
  callUnityFunction(objectName: string, methodName: string, value: any) {
    if (!this.unityInstance) {
      // console.error('❌ [UNITY SEND] Unity instance not ready!');
      return;
    }
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // console.log('📤 [UNITY SEND] ===== SENDING TO UNITY =====');
    // console.log('📤 [UNITY SEND] Unity Instance Status:', {
    //   exists: !!this.unityInstance,
    //   hasSendMessage: !!this.unityInstance.SendMessage,
    //   unityInstanceKeys: this.unityInstance ? Object.keys(this.unityInstance) : 'N/A'
    // });
    
    // console.log('📤 [UNITY SEND] Message Details:', {
    //   objectName: objectName,
    //   methodName: methodName,
    //   valueType: typeof value,
    //   value: value,
    //   stringValue: stringValue,
    //   stringLength: stringValue.length
    // });
    
    try {
      this.unityInstance.SendMessage(
        objectName,
        methodName,
        stringValue
      );
      // console.log('✅ [UNITY SEND] Message sent successfully to Unity');
    } catch (error) {
      console.error('❌ [UNITY SEND] Error sending message to Unity:', error);
    }
    
    // console.log('📤 [UNITY SEND] ===== END SEND DEBUG =====');
  }


  sendLandmarkData() {
    // Start continuous real-time camera skeleton detection
    this.startRealTimeHandTracking();
  }

  startRealTimeHandTracking() {
    // Subscribe to real-time skeleton data from camera
    this.subscription.add(
      this.webCamSkeletonService.currentSkeletonFromWebCamBuffer.subscribe((skeletonBuffer) => {
        if (skeletonBuffer && skeletonBuffer.length >= 33) {
          const leftWrist = skeletonBuffer[16];  // Left wrist landmark (original)
          const rightWrist = skeletonBuffer[15]; // Right wrist landmark (original)
          
          const MIN_VISIBILITY = 0.1;
          let landmarkData;
          
          if (leftWrist.visibility < MIN_VISIBILITY && rightWrist.visibility < MIN_VISIBILITY) {
            // removed debug log
            
            // Center hands when not detected
            landmarkData = {
              leftWristX: 0.0,   // Center position
              leftWristY: 0.0,
              leftWristZ: 0.0,
              rightWristX: 0.0,  // Center position
              rightWristY: 0.0,
              rightWristZ: 0.0
            };
            
            // Draw centered hands on canvas
            const centeredLeftWrist = { x: 0.0, y: 0.0, z: 0.0, visibility: 1.0 };
            const centeredRightWrist = { x: 0.0, y: 0.0, z: 0.0, visibility: 1.0 };
            this.drawHandTrackingOnCanvas(centeredLeftWrist, centeredRightWrist);
            
          } else {
            // console.log('🔍 [HAND TRACKING] Real camera data detected:', {
            //   leftWrist: { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z, visibility: leftWrist.visibility },
            //   rightWrist: { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z, visibility: rightWrist.visibility }
            // });
            
            this.leftWrist = leftWrist;
            this.rightWrist = rightWrist;
            this.drawHandTrackingOnCanvas(leftWrist, rightWrist);

            // Try different mapping approaches to debug Unity-side issue
            landmarkData = {
              leftWristX: leftWrist.x,   // Try original mapping first
              leftWristY: leftWrist.y,
              leftWristZ: leftWrist.z,
              rightWristX: rightWrist.x, // Try original mapping first
              rightWristY: rightWrist.y,
              rightWristZ: rightWrist.z
            };
            
            // console.log('🔍 [HAND TRACKING] Sending to Unity (original mapping):', landmarkData);
          }
          
          // Always send data to Unity (either real or centered)
          this.sendHandTrackingData(landmarkData);
        } else {
          // removed debug log
        }
      })
    );
  }

  sendHandTrackingData(landmarkData: any) {
    // Use correct object names from integration guide
    const objectName = 'GameManager';
    const methodName = 'ReceiveLandmarkData';
    const value = JSON.stringify(landmarkData);
    
    // console.log('🔍 [UNITY HAND DEBUG] Sending hand data to Unity:', {
    //   objectName: objectName,
    //   methodName: methodName,
    //   landmarkData: landmarkData,
    //   jsonString: value
    // });
    
    this.callUnityFunction(objectName, methodName, value);
  }


  showUnityErrorOnCanvas = (canvas: HTMLCanvasElement, errorMessage: string) => {

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw error background
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw error message
    ctx.fillStyle = '#ff0000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Unity Game Loading Error', canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillText(errorMessage, canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('Click to retry loading', canvas.width / 2, canvas.height / 2 + 20);
    
    // Add click handler to retry or fallback
    canvas.onclick = () => {
      if (errorMessage.includes('iframe fallback')) {
        console.log('[UNITY] Switching to iframe fallback...');
        this.switchToIframeFallback();
      } else {
        console.log('[UNITY] Retrying Unity game loading...');
        this.initializeUnityCanvas();
      }
    };
    
    // Add cursor pointer
    canvas.style.cursor = 'pointer';
  };

  switchToIframeFallback = () => {
    console.log('[UNITY] Switching to iframe fallback for Unity game...');
    
    // Set fallback flag
    this.useIframeFallback = true;
    // Reset iframe loaded state before navigating
    this.isIframeLoaded = false;
    
    // Force iframe to show for Unity game
    this.gameId = 20;
    this.currentGameUrl = 'https://grillgamedemo.z13.web.core.windows.net/';
    
    // Trigger iframe loading
    setTimeout(() => {
      this.handleIframeLoad();
    }, 100);
  };

  updateGameProgress = (progress: number) => {
    if (!this.isTherapist) {
      this.appActions.updateGameScore({ 
        type: ScoreType.Regular, 
        value: progress 
      });
    }
  };

  handleGameReady = () => {
    console.log('[UNITY] Game is ready to play!');
    // Mark Unity as fully loaded so the placeholder overlay hides now
    this.unityGameLoaded = true;
    // Trigger any game ready events here
    if (!this.isTherapist) {
      this.appActions.showTimer(true);
    }
  };

  enableBodyTrackingForUnity = () => {
    console.log('[UNITY] Enabling body tracking for Unity game...');
    if (!this.isTherapist) {
      // Enable body tracking for Unity games
      this.appActions.toggleBodyTracking(true);
      console.log('[UNITY] Body tracking enabled for Unity game');
      
      // Add a small delay to ensure body tracking is properly initialized
      setTimeout(() => {
        console.log('[UNITY] Checking if skeleton service is active...');
        console.log('[UNITY] Skeleton service model initialized:', this.webCamSkeletonService.modelInitialized);
        console.log('[UNITY] Current skeleton buffer subscription active');
        
        // Ensure skeleton tracking is working for Unity games
        if (!this.webCamSkeletonService.modelInitialized) {
          console.log('[UNITY] Skeleton model not initialized, initializing...');
          this.webCamSkeletonService.initializeModel();
        }
        
        // DON'T start skeleton tracking for Unity games - it interferes with camera
        // The existing skeleton tracking from the WebRTC component will handle this
        console.log('[UNITY] Using existing skeleton tracking from WebRTC component');
      }, 2000);
    }
  };

  startSkeletonTrackingForUnity = () => {
    console.log('[UNITY] Starting skeleton tracking...');
    
    // Get the video element from the WebRTC component
    const videoElement = document.getElementById('patient-video-skeleton') as HTMLVideoElement;
    if (videoElement && videoElement.srcObject) {
      console.log('[UNITY] Video element found, checking camera stream...');
      console.log('[UNITY] Video srcObject:', videoElement.srcObject);
      console.log('[UNITY] Video paused:', videoElement.paused);
      console.log('[UNITY] Video readyState:', videoElement.readyState);
      
      // Don't call bindPage if skeleton tracking is already active
      if (this.webCamSkeletonService.modelInitialized && this.webCamSkeletonService.loopActive) {
        console.log('[UNITY] Skeleton tracking already active, skipping initialization');
        return;
      }      
      const patientCanvasId = `patient-canvas-${this.authenticationService.currentUserValue.peerId}`;      
      this.webCamSkeletonService.bindPage(videoElement, false, patientCanvasId).then(() => {
        console.log('[UNITY] Skeleton tracking started successfully!');
      }).catch((error) => {
        console.error('[UNITY] Error starting skeleton tracking:', error);
      });
    } else {
      console.log('[UNITY] Video element not found or no srcObject, retrying...');
      setTimeout(() => this.startSkeletonTrackingForUnity(), 1000);
    }
  };

  handleAppDisplayStatus = (data) => {
    // Mark Elephant as acknowledged (used by the watchdog)
    if ((this.currentGameName || '').toLowerCase() === 'elephant') {
      this.elephantAckReceived = true;
      if (this.elephantWatchdogTimer) {
        clearTimeout(this.elephantWatchdogTimer);
        this.elephantWatchdogTimer = null;
      }
      this.eleLog('APP_DISPLAY_STATUS', data);
      this.eleBreak('on-APP_DISPLAY_STATUS');
    }
    // Handle Unity progress updates if they come from the game
    if (data && typeof data.progress === 'number' && this.gameId === 20) {
      console.log('[UNITY] Received progress from game:', data.progress);
      this.gameProgress = data.progress;
      this.updateGameProgress(data.progress);
    }
    
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
        console.log('data.settings>>>>>>>>>>>>>>>>>>>', data.settings);
        this.appActions.updateInitGameSettings(data.settings);
      } else {
        this.sendInitGameSettingsForTherapist.emit(data.settings);
      }
      this.gotGameSettings = true;
    }
    if (data.score) {
      // Debug logging for score updates
      // removed debug logs
      
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
        // removed debug log
        this.gameProgress = data.score.value;
        if (!this.isTherapist) {
          this.appActions.updateGameScore(data.score);
        }
      } else {
        // removed debug log
      }
    } else {
      // removed debug log
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
        this.closeModal();
      } else {
        this.quitGame();
      }
    }
  };

  onClickSettings = () => {
    this.isSettingModalOpened = !this.isSettingModalOpened;
    communicationUtil.sendMessageToIframe(this.iframeEl, this.isSettingModalOpened, MESSAGES.SETTINGS_MODAL_OPENED);
  };

  private notifyUnityCanvasQuit(reason: 'quit' | 'restart' = 'quit') {
    try {
      const evt = new CustomEvent('unity-canvas-quit', { detail: { gameId: this.gameId, reason } });
      window.dispatchEvent(evt);
    } catch (_) {}
  }

  // Handle Grill team's unified score callback:
  // Function Name: SendConfigToWebGL
  // Value example: "m_UserScore: 100, m_WrongIngrident: 0, m_Burn: 0, m_AverageTime: 27"
  private handleGrillUnityScore(rawValue: any) {
    try {
      let parsed: any = null;

      // If Unity passed an object, use it directly
      if (rawValue && typeof rawValue === 'object') {
        parsed = rawValue;
      } else {
        const str = typeof rawValue === 'string' ? rawValue : (rawValue?.toString?.() || '');
        // Attempt JSON parse first
        try { parsed = JSON.parse(str); } catch (_) {}
        // Fallback to simple "k: v" parsing
        if (!parsed || typeof parsed !== 'object') {
          parsed = {};
          str.split(',').forEach((segment) => {
            const [k, v] = (segment || '').split(':').map(s => (s || '').trim());
            if (!k) return;
            const key = k.replace(/\s+/g, '');
            const num = Number(v);
            parsed[key] = isNaN(num) ? v : num;
          });
        }
      }

      const userScore = Number(parsed.m_UserScore ?? parsed.UserScore ?? parsed.score ?? 0) || 0;
      const wrongIngredients = Number(parsed.m_WrongIngrident ?? parsed.WrongIngrident ?? parsed.wrongIngredients ?? 0) || 0;
      const burn = Number(parsed.m_Burn ?? parsed.Burn ?? 0) || 0;
      const averageTime = Number(parsed.m_AverageTime ?? parsed.AverageTime ?? parsed.avgTime ?? 0) || 0;

      // Update UI score
      try { this.appActions.updateGameScore({ value: userScore, game: 'grill' }); } catch (_) {}

      // Persist in current game session
      const token = this.ngRedux.getState().global.gameSessionToken;
      const gameSummary = {
        gameScore: {
          score: userScore,
          wrongIngredients,
          burn,
          averageTime,
          game: 'grill'
        }
      };
      this.ajax.updateGameSummary({ gameSummary, token }).subscribe(() => {
        try {
          if (this.gameId === 20) {
            this.onClickHomeButton();
            setTimeout(() => { try { this.router.navigate(['/games_lobby']); } catch (_) {} }, 1200);
          }
        } catch (_) {}
      }, (err) => {
        console.error('[GRILL] ❌ Failed to save grill game summary:', err);
        try {
          if (this.gameId === 20) {
            this.onClickHomeButton();
            setTimeout(() => { try { this.router.navigate(['/games_lobby']); } catch (_) {} }, 1200);
          }
        } catch (_) {}
      });
    } catch (err) {
      console.error('[GRILL] ❌ Error parsing grill score payload:', err, rawValue);
    }
  }

  getInstructionsClass = () => {
    return `info-btn ${this.isTherapist ? 'therapist' : 'patient'}`;
  };

  getHomeClass = () => {
    return `home-btn ${this.isTherapist ? 'patient' : 'patient'}`;
  };

  quitGame() {
    
    // Immediately notify other components to hide/reset Unity canvas overlay
    this.notifyUnityCanvasQuit('quit');
    if (this.iframeEl && this.iframeEl.contentWindow) {
      // Attempt to stop all audio in Unity (iframe context) before quitting
      try {
        const iframeUnityInstance = (this.iframeEl as any)?.contentWindow?.unityInstance;
        if (iframeUnityInstance && typeof iframeUnityInstance.SendMessage === 'function') {
          iframeUnityInstance.SendMessage('WebGLAudioController', 'StopAllAudio');
        }
      } catch (err) {
      }
      this.iframeEl.contentWindow.postMessage({ type: 'PATIENT_HOME_BUTTON_CLICK' }, '*');
    } else {
      // Fallback: if running without iframe and unityInstance is available (e.g., canvas build)
      try {
        if (this.unityInstance && typeof this.unityInstance.SendMessage === 'function') {
          this.unityInstance.SendMessage('WebGLAudioController', 'StopAllAudio');
        }
      } catch (_) {}
    }
    setTimeout(() => {
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
    }, 1000); 
  }

  handleReload = () => {
    this.isEndGameModalOpen = false;
    // Notify imminent restart so therapist overlay is cleared before new session starts
    this.notifyUnityCanvasQuit('restart');
    if (!this.isTherapist) {
      communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.RESTART_GAME);
    } else {
      communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.SEND_RESTART_GAME_MESSAGE);
    }
  };

  handleIframeLoad = () => {
    this.iframeEl = document.getElementById('games-iframe-' + this.connectionId);
    // Mark iframe as loaded to hide placeholder for iframe-based games
    this.isIframeLoaded = true;
    if (this.isElephantActive()) {
      this.eleLog('handleIframeLoad', {
        connectionId: this.connectionId,
        gameId: this.gameId,
        gameName: this.currentGameName,
        src: (this.getIframeSrc && this.getIframeSrc()) || this.currentGameUrl,
      });
      this.eleBreak('after-iframe-load');
    }

  // assessment game
    if (this.gameId === 21) {
      const myPeerId = this.isTherapist ? this.peerId : this.authenticationService.currentUserValue?.peerId;
      const remotePeerId = this.isTherapist
        ? (this.connectedUser && this.connectedUser.peerId) || undefined
        : this.therapistPeerId || undefined;

      this.ajax.getIceServers().subscribe((iceConfig: any) => {
        const iceServersRaw = Array.isArray(iceConfig?.iceServers) ? iceConfig.iceServers : (iceConfig?.iceServers || []);
        const onlyTcp = !!iceConfig?.onlyTcp;

        try {
          // console.log('ice_servers RAW RESPONSE', iceConfig);

          //  console.log('EXTRACTED ICE SERVERS ARRAY', iceServersRaw);
        } catch   (_)  {}

        const iceServers = (iceServersRaw || []).map((server: any) => {
          const normalized: any = {
            urls: server?.urls || server?.url || ''
          };
          if (server?.username) normalized.username = server.username;
          if (server?.credential) normalized.credential = server.credential;
          return normalized;
        }).filter((s: any) => !!s.urls);

        // removed debug log: normalized ice servers

        // Cache latest ICE servers and try sending assessment settings if history is ready
        this.latestIceServers = iceServers;

        // Log current ROM entries for visibility
        // removed debug log: ROM entries

        this.trySendAssessmentSettingsToIframe();
      });
    }
    
    // removed debug log: Grill iframe loaded
    
    // Elephant-only watchdog (patient side) to mitigate rare initial load stalls
    if (!this.isTherapist && (this.currentGameName || '').toLowerCase() === 'elephant' && this.iframeEl) {
      this.elephantAckReceived = false;
      this.elephantReloadAttempts = 0;
      if (this.elephantWatchdogTimer) {
        clearTimeout(this.elephantWatchdogTimer);
        this.elephantWatchdogTimer = null;
      }
      this.elephantWatchdogTimer = setTimeout(() => {
        if (!this.elephantAckReceived && this.elephantReloadAttempts < 2) {
          this.elephantReloadAttempts += 1;
          try {
            const src = this.getIframeSrc();
            const rawSrc = this.isTherapist && this.gameUrl ? this.gameUrl.changingThisBreaksApplicationSecurity : src;
            const cacheBusted = rawSrc ? `${rawSrc}${rawSrc.includes('?') ? '&' : '?'}r=${Date.now()}` : rawSrc;
      // removed debug logs for watchdog
            if ((this.iframeEl as any) && (this.iframeEl as any).setAttribute) {
              (this.iframeEl as any).setAttribute('src', cacheBusted);
            } else {
              (this.iframeEl as any).src = cacheBusted;
            }
          } catch (_) {}
        }
      }, 6000);
    }

    // Removed therapist-side watchdog reload to avoid reload loops in Elephant/Memory

    if (this.isTherapist) {
      this.ajax.getGameSettingsForPatient(this.gameIdTherapist, this.connectedUser.patientId).subscribe((settings) => {
        if (this.gameIdTherapist === 4) {
          if (this.iframeEl && this.iframeEl.contentWindow) {
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
                enableCarouselText: this.flagService.isEnabled('STUDIO_CAROUSEL_FLAG'),
              },
              MESSAGES.IS_THERAPIST
            );
          }
          return;
        }

        const hasCurrentSet = settings && (settings as any).current_set;
        const isStudioGame =
          this.gameIdTherapist === 3 ||
          (this.currentGameName && this.currentGameName.toLowerCase() === 'studio');

        const normalized: any =
          isStudioGame && hasCurrentSet
            ? settings
            : (hasCurrentSet ? (settings as any).current_set : (settings || {}));

        const iframeMessage = {
          isTherapist: true,
          peerId: this.peerId,
          userId: this.peerId,
          patientSettings: normalized,
          game_settings: normalized,
          playerId: this.authenticationService.currentUserValue.id,
          playerFirstName: this.authenticationService.currentUserValue.firstName,
          playerLastName: this.authenticationService.currentUserValue.lastName,
          enableCarouselText: this.flagService.isEnabled('STUDIO_CAROUSEL_FLAG'),
        };

        if (this.iframeEl && this.iframeEl.contentWindow) {
          communicationUtil.sendMessageToIframe(this.iframeEl, iframeMessage, MESSAGES.IS_THERAPIST);
        }
        if (isStudioGame) {
          const sendSettings = () => {
            if (this.iframeEl && this.iframeEl.contentWindow) {
              communicationUtil.sendMessageToIframe(this.iframeEl, normalized, MESSAGES.SETTINGS);
            }
          };
          sendSettings();
          setTimeout(sendSettings, 400);
          setTimeout(sendSettings, 1000);
        } else {
          setTimeout(() => {
            if (this.iframeEl && this.iframeEl.contentWindow) {
              communicationUtil.sendMessageToIframe(this.iframeEl, iframeMessage, MESSAGES.IS_THERAPIST);
            }
          }, 500);
        }
      });
    } else {
      if (this.gameId === 20 || this.gameId === 21) {
        // Grill (20) and Assessment (21): use dedupe and custom message shape
        if (!this.patientSessionStarted) {
          this.patientSessionStarted = true;
          this.eleLog('startGameSession request', { gameId: this.gameId, gameName: this.currentGameName });
          this.ajax.startGameSession(this.gameId).subscribe((response) => {
            const { settings, token } = response;
            this.appActions.setGameToken(token);
            const iframeMessage = this.gameId === 21
              ? {
                  isTherapist: false,
                  userId: this.authenticationService.currentUserValue.peerId,
                  playerId: this.authenticationService.currentUserValue.id,
                  playerFirstName: this.authenticationService.currentUserValue.firstName,
                  playerLastName: this.authenticationService.currentUserValue.lastName,
                }
              : {
                  isTherapist: false,
                  userId: this.authenticationService.currentUserValue.peerId,
                  game_settings: settings,
                  playerId: this.authenticationService.currentUserValue.id,
                  playerFirstName: this.authenticationService.currentUserValue.firstName,
                  playerLastName: this.authenticationService.currentUserValue.lastName,
                };
            const sendPatientSessionToIframe = () => {
              if (this.iframeEl && this.iframeEl['contentWindow']) {
                communicationUtil.sendMessageToIframe(this.iframeEl, iframeMessage, MESSAGES.IS_THERAPIST);
                this.pendingIsTherapistMessage = null;
                if (this.isElephantActive()) this.eleBreak('after-send-IS_THERAPIST');
              } else {
                this.pendingIsTherapistMessage = iframeMessage;
                this.eleLog('queued IS_THERAPIST (iframe not ready)');
              }
            };
            if (this.gameId !== 21) sendPatientSessionToIframe();
            if (!this.isTherapist) {
              communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_READY_TO_START);
            }
          });
        }
      } else {
        // Other games: ga-candidate path – run every time iframe loads, no dedupe
        this.ajax.startGameSession(this.gameId).subscribe((response) => {
          const settings = this.gameId === 4 ? response : (response && (response as any).settings !== undefined ? (response as any).settings : response);
        console.log('settings>>>>>>>>>>>>>>>>>>>', settings);
          const token = (response as any)?.token;
          if (token) this.appActions.setGameToken(token);
          if (this.iframeEl && this.iframeEl.contentWindow) {
            communicationUtil.sendMessageToIframe(
              this.iframeEl,
              {
                isTherapist: false,
                userId: this.authenticationService.currentUserValue.peerId,
                game_settings: settings,
                playerId: this.authenticationService.currentUserValue.id,
                playerFirstName: this.authenticationService.currentUserValue.firstName,
                playerLastName: this.authenticationService.currentUserValue.lastName,
                enableCarouselText: this.flagService.isEnabled('STUDIO_CAROUSEL_FLAG'),
          
              },
              MESSAGES.IS_THERAPIST
            );
            if (!this.isTherapist && !this.inTherapistSession) {
              communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_READY_TO_START);
            }
          }
        });
      }
    }

    // If we had an init message queued before iframe was ready, send it now
    if (this.pendingIsTherapistMessage && this.iframeEl && this.iframeEl['contentWindow']) {
      this.eleLog('flushing queued IS_THERAPIST on iframe load');
      communicationUtil.sendMessageToIframe(this.iframeEl, this.pendingIsTherapistMessage, MESSAGES.IS_THERAPIST);
      this.pendingIsTherapistMessage = null;
    }

    this.onIframeLoad.emit();
  };

  private trySendAssessmentSettingsToIframe() {
    // Only the assessment game (21) should send this settings payload
    if (this.gameId !== 21) {
      return;
    }
    if (this.assessmentSettingsSent) {
      return;
    }
    if (!this.iframeEl || !this.iframeEl.contentWindow) {
      return;
    }

    // Build history rows from currentGameSettings
    let rowData: any[] = [];
    try {
      if (Array.isArray(this.currentGameSettings)) {
        rowData = this.currentGameSettings as any[];
      } else if (this.currentGameSettings && Array.isArray((this.currentGameSettings as any).results)) {
        rowData = (this.currentGameSettings as any).results;
      }
    } catch (_) {
      rowData = [];
    }

    // Only send when we actually have history
    if (!Array.isArray(rowData) || rowData.length === 0) {
      return;
    }

    const message = {
      type: 'settings',
      payload: {
        peerConfig: {
          host: environment.signalingServer,
          port: environment.signalingServerPort,
          path: `/api`,
          key: environment.secretKey,
        },
        iceServers: this.latestIceServers || [],
      }
    };

    const myPeerId = this.isTherapist ? this.peerId : this.authenticationService.currentUserValue?.peerId;
    const iframeMessage = {
      isTherapist: false,
      peerId: myPeerId,
      userId: myPeerId,
      patientSettings: { history: rowData, config: message },
      playerId: this.authenticationService.currentUserValue.id,
      playerFirstName: this.authenticationService.currentUserValue.firstName,
      playerLastName: this.authenticationService.currentUserValue.lastName,
    };

    try {
      console.log('SETTINGS MESSAGE (to iframe)', iframeMessage);
    } catch (_) {}

    // Send on the same channel the SDK listens to (is_therapist) so it receives settings
    communicationUtil.sendMessageToIframe(
      this.iframeEl,
      iframeMessage,
      MESSAGES.IS_THERAPIST
    );
    this.assessmentSettingsSent = true;
  }

  IframeEleLoad(iframeElement: ElementRef, connectionId): void {
    console.log('before contentdocument', iframeElement);
    console.log(connectionId);
  }

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
    const scorePopupFlag = this.flagService.isEnabled('SCORE_POPUP_FLAG');
    console.log("======scorePopupFlag=====",scorePopupFlag);
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
      if(scorePopupFlag){
        this.isEndGameModalOpen = false;
      } 
    }
    if(scorePopupFlag){
      if (!this.isTherapist && !this.inTherapistSession) {
        const modalGameId = this.gameId;
        const patientId =
        this.connectedUser && this.connectedUser.patientId ? this.connectedUser.patientId : this.currentUser.id;
        this.dialogRef = this.dialog.open(GameHistorySessionComponent, {
          hasBackdrop: true,
          data: {
            has_backdrop: false,
            gameId: modalGameId,
            iframeEl: this.iframeEl,
            patientId: patientId,
          },
        });
        this.isEndGameModalOpen = true;
        setTimeout(() => {
          if (this.dialogRef) {
            this.dialogRef.close();
            this.dialogRef = null;
            this.isEndGameModalOpen = false;
          }
        }, 10000);
      }
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
    this.ajax.updateUserGameData(userGameData, this.isTherapist).subscribe(() => { });
  };

  updateUserGameDataStatus = (userGameDataIds, active) => {
    this.ajax.setUserGameDataStatus(userGameDataIds, active).subscribe(() => { });
  };

  changeUserGameDataDrawer = (userGameDataIds, drawer) => {
    this.ajax.changeUserGameDataDrawer(userGameDataIds, drawer).subscribe(() => { });
  };

  deleteUserGameData = (userGameDataIds) => {
    this.ajax.deleteUserGameData(userGameDataIds, this.isTherapist).subscribe(() => { });
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
    this.ajax.updateGameData(gameData).subscribe(() => { });
  };

  updateGameDataStatus = (gameDataIds, active) => {
    this.ajax.setGameDataStatus(gameDataIds, active).subscribe(() => { });
  };

  deleteGameData = (gameDataIds) => {
    this.ajax.deleteGameData(gameDataIds).subscribe(() => { });
  };

  getShortGameData = () => {
    const gameId = this.gameIdTherapist;
    this.ajax.getShortGameData(gameId).subscribe((data) => {
      communicationUtil.sendMessageToIframe(this.iframeEl, data, MESSAGES.SHORT_GAME_DATA);
    });
  };

  addUserGameLog = (data: object) => {
    /*console.log("@dev====send log data=====",data);
    console.log("@dev=Saved before value ",data);
      const token = this.ngRedux.getState().global.gameSessionToken;
      const payload1 = {gameSummary:data,token:token}  
      this.ajax.updateGameSummarytherapist(payload1).subscribe((res) => {
        console.log('Game summary submitted:', res);
      });
      */
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
    this.ajax.sendLogToServer(dataToServer).subscribe(() => { });
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
  /*startCarousel(): void {
    if(this.isPopupVisible){
      setInterval(() => {
        this.currentTextIndex = (this.currentTextIndex + 1) % this.carouselText.length;
      }, 20000);
    } 
  }*/

  startCarousel(): void {
    /*if (this.isPopupVisible) {
      const baseSpeed = 200; // Base speed (ms) per character
      const minInterval = 3000; // Minimum interval for very short text
      const maxInterval = 20000; // Maximum interval for very long text

      const calculateInterval = (text: string): number => {
        const interval = text.length * baseSpeed;
        return Math.min(Math.max(interval, minInterval), maxInterval);
      };

      const updateText = () => {
        this.currentTextIndex = (this.currentTextIndex + 1) % this.carouselText.length;
        const nextText = this.carouselText[this.currentTextIndex];
        const nextInterval = calculateInterval(nextText);

        setTimeout(() => updateText(), nextInterval);
      };

      // Start the first cycle
      updateText();
    }
    */
  }

  // ========================================
  // Unity OpeningSceneManager Integration
  // ========================================

  /**
   * Setup Unity OpeningSceneManager integration
   * This method initializes the Unity WebGL integration according to the documentation
   */
  setupUnityOpeningSceneManager(): void {
    try {
      // removed debug log
      
      // Initialize angularApp if it doesn't exist
      if (!window.angularApp) {
        window.angularApp = {} as any;
      }
      
      // Set up the Angular callback for config updates
      window.angularApp.onGrillConfigUpdated = (config: any) => {
        console.log('[UNITY] Angular received grill config:', config);
        // Handle config update in Angular app
        this.handleUnityConfigUpdate(config);
      };
      
      // removed debug log
    } catch (error) {
      console.error('[UNITY] ❌ Error setting up OpeningSceneManager:', error);
    }
  }

  /**
   * Send mode and config to Unity using OpeningSceneManager
   * This method follows the exact documentation format
   */



  sendUnityGameConfig(): void {
    try {
      console.log('[UNITY] sendUnityGameConfig called - checking OpeningSceneManager availability...');
      
      if (!window.OpeningSceneManager) {
        console.log('[UNITY] Will retry when Unity loads...');        
        this.waitForOpeningSceneManager();
        return;
      }
      
      if (!window.OpeningSceneManager.sendModeAndConfigToUnity) {
        console.warn('[UNITY] ⚠️ sendModeAndConfigToUnity method not available');
        return;
      }
      
      window.OpeningSceneManager.sendModeAndConfigToUnity('settings', {
        "m_TimeInSeconds": "60",
        "m_Lives": "3",
        "m_Temperature": "High",
        "m_Handedness": "RightHanded",
        "m_IngredientsPerSkewer": 2,
        "m_NumberOfSkewersForPreparation": 2,
        "m_SkewerSlots": 3
      });
      
      console.log('[UNITY] Game configuration sent:', {
        "m_TimeInSeconds": "60",
        "m_Lives": "3",
        "m_Temperature": "High",
        "m_Handedness": "RightHanded",
        "m_IngredientsPerSkewer": 2,
        "m_NumberOfSkewersForPreparation": 2,
        "m_SkewerSlots": 3
      });
      
    } catch (error) {
      console.error('[UNITY] ❌ Error sending game config:', error);
    }
  }

  /**
   * Wait for OpeningSceneManager to become available and retry sending config
   */
  waitForOpeningSceneManager(): void {
    let attempts = 0;
    const maxAttempts = 30; // Try for 30 seconds
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.OpeningSceneManager && window.OpeningSceneManager.sendModeAndConfigToUnity) {
        console.log('[UNITY] ✅ OpeningSceneManager now available! Sending config...');
        clearInterval(checkInterval);
        this.sendUnityGameConfig();
      } else if (attempts >= maxAttempts) {
        console.warn('[UNITY] ⚠️ OpeningSceneManager still not available after 30 seconds');
        clearInterval(checkInterval);
      } else {
        console.log(`[UNITY] Waiting for OpeningSceneManager... (attempt ${attempts}/${maxAttempts})`);
      }
    }, 1000); // Check every second
  }

  // Manual test function - call this from browser console to test
  testSendUnityGameConfig(): void {
    console.log('[UNITY] Manual test - calling sendUnityGameConfig...');
    this.sendUnityGameConfig();
  }

  /**
   * Send Unity game configuration via iframe fallback
   * This method sends the config using postMessage to the Unity iframe
   */
  sendUnityGameConfigViaIframe(): void {
    try {
      console.log('[UNITY] Sending game configuration via iframe fallback...');
      
      if (!this.iframeEl || !this.iframeEl.contentWindow) {
        console.warn('[UNITY] ⚠️ Iframe not available for config sending');
        return;
      }
      
      const gameConfig = {
        "m_TimeInSeconds": "600",
        "m_Lives": "3",
        "m_Temperature": "High",
        "m_Handedness": "RightHanded",
        "m_IngredientsPerSkewer": 5,
        "m_NumberOfSkewersForPreparation": 5,
        "m_SkewerSlots": 3
      };
      
      // Send via postMessage to iframe
      this.iframeEl.contentWindow.postMessage({
        type: 'UNITY_GAME_CONFIG',
        mode: 'settings',
        config: gameConfig
      }, '*');
      
      // Also try direct OpeningSceneManager call if available in iframe
      try {
        this.iframeEl.contentWindow.postMessage({
          type: 'CALL_OPENING_SCENE_MANAGER',
          method: 'sendModeAndConfigToUnity',
          args: ['settings', gameConfig]
        }, '*');
      } catch (error) {
        console.log('[UNITY] Direct OpeningSceneManager call failed, using postMessage only');
      }
      
      console.log('[UNITY] Game configuration sent via iframe:', gameConfig);
      
    } catch (error) {
      console.error('[UNITY] ❌ Error sending game config via iframe:', error);
    }
  }

 
  handleUnityConfigUpdate(config: any): void {
    try {
      console.log('[UNITY] Processing config update:', config);
      
      // Access user score
      const score = config.m_UserScore;
      console.log('[UNITY] User score:', score);

      // Persist using the same path as SendConfigToWebGL
      this.handleGrillUnityScore(config);
      
      // Handle other config fields as needed
      const timeInSeconds = config.m_TimeInSeconds;
      const lives = config.m_Lives;
      const temperature = config.m_Temperature;
      const handedness = config.m_Handedness;
      
      // Update Angular state/store if needed
      // this.appActions.updateGameConfig(config);
      
    } catch (error) {
      console.error('[UNITY] ❌ Error handling config update:', error);
    }
  }

  /**
   * Initialize Unity instance with OpeningSceneManager
   * This method should be called when Unity instance is available
   */
  initializeUnityWithOpeningSceneManager(unityInstance: any): void {
    try {
      console.log('[UNITY] Initializing Unity with OpeningSceneManager...');
      
      if (window.OpeningSceneManager) {
        // Initialize OpeningSceneManager with Unity instance
        window.OpeningSceneManager.init(unityInstance);
        window.OpeningSceneManager.initializeOpeningScene();
        
        // Set up callbacks for Unity events
        window.OpeningSceneManager.onConfigSent = (configJson: string) => {
          console.log('📥 [UNITY RECEIVE] ===== RECEIVED CONFIG FROM UNITY =====');
          console.log('📥 [UNITY RECEIVE] Raw Config JSON:', configJson);
          
          try {
            const config = JSON.parse(configJson);
            console.log('📥 [UNITY RECEIVE] Parsed Config:', {
              config: config,
              configType: typeof config,
              configKeys: Object.keys(config),
              configString: JSON.stringify(config, null, 2)
            });
            
            // Log specific settings that might be overridden
            console.log('📥 [UNITY RECEIVE] Key Settings Analysis:', {
              timeInSeconds: config.m_TimeInSeconds || config.OrderTime || 'NOT FOUND',
              lives: config.m_Lives || config.Lives || 'NOT FOUND',
              temperature: config.m_Temperature || config.GrillTemperature || 'NOT FOUND',
              mode: config.mode || 'NOT FOUND',
              handedness: config.m_Handedness || config.Orientation || 'NOT FOUND',
              skewerSlots: config.m_SkewerSlots || config.SkewerSlots || 'NOT FOUND'
            });
            
            // Check if this matches what we sent
            console.log('📥 [UNITY RECEIVE] Override Check:', {
              isOurConfig: config.m_TimeInSeconds === 60,
              timeMatches: config.m_TimeInSeconds === 60 ? '✅ MATCHES' : '❌ OVERRIDDEN',
              expectedTime: 60,
              actualTime: config.m_TimeInSeconds || config.OrderTime
            });
            
            // Persist locally if desired
            localStorage.setItem('grillGameConfig', configJson);
            console.log('📥 [UNITY RECEIVE] Config saved to localStorage');
          } catch (error) {
            console.error('📥 [UNITY RECEIVE] Error parsing config JSON:', error);
          }
          
          console.log('📥 [UNITY RECEIVE] ===== END RECEIVE DEBUG =====');
          
          // Notify Angular
          try {
            const config = JSON.parse(configJson);
            if (window.angularApp && window.angularApp.onGrillConfigUpdated) {
              window.angularApp.onGrillConfigUpdated(config);
            }
            // Persist score if present
            try { this.handleGrillUnityScore(config); } catch (_) {}
          } catch (error) {
            console.error('[UNITY] ❌ Error notifying Angular of config update:', error);
          }
          console.log('[UNITY] Quit requested from Unity');
          // Handle Unity quit request
          this.handleUnityQuitRequest();
        };
        
        console.log('[UNITY] ✅ Unity initialized with OpeningSceneManager');
      } else {
        console.warn('[UNITY] ⚠️ OpeningSceneManager not available');
      }
    } catch (error) {
      console.error('[UNITY] ❌ Error initializing Unity:', error);
    }
  }

  /**
   * Handle Unity quit request
   * This method is called when Unity requests to quit
   */
  handleUnityQuitRequest(): void {
    try {
      console.log('[UNITY] Handling quit request...');
      
      // Close/route/hide Unity container
      // this.closeGame.emit();
      // this.quitGame();
      
    } catch (error) {
      console.error('[UNITY] ❌ Error handling quit request:', error);
    }
  }

}