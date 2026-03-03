import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { first, debounceTime, distinctUntilChanged, map, mergeMap, delay } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { Subject, Subscription, of, Observable } from 'rxjs';
import _ from 'lodash';
import Peer from 'peerjs';
import { AudioContext } from 'standardized-audio-context';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { select } from '@angular-redux/store';

import { User } from '../../common/models/user';
import { AuthenticationService } from '../../common/services/authentication.service';
import { WebRtcService } from '../services/therapist_web_rtc.service';
import { communicationUtil, MESSAGES, IEnlargeVideoMessage } from '../../common/services/communication_util.service';
import {
  displayConstanst,
  PeersStatus,
  Role,
  CHECK_PEER_STATUS_AFTER_ERROR_TIME,
  TIME_TO_ANSWER_CALL_MS,
} from '../../../constants';
import { AjaxService } from '../services/ajax.service';
import { SplitScreenScalerService } from '../services/split_screen_scaler.service';
import { StreamHandlerService } from '../services/stream_handler.service';
import {
  swapWithFirstElm,
  handleGameLobbyStateMessage,
  handleGameIframeStateMessage,
  handlePatientsGamesMessage,
  handleSkeletonBufferOnIframe,
  handleSkeletonBufferOnLobbyMessage,
  removeElementById,
} from '../helpers/therapist_connection_util';
import { PatientWebRtcService } from 'src/app/patient/services/patient_web_rtc.service';
import { AppActions } from 'src/app/app.actions';
import { setCameraFrameRate } from '../../common/helpers/webRTC-common-utils';
import { isMobileDevice } from '../../common/utils';
import { MenuOptionsComponent } from '../../patient/components/menu-options/menu-options.component';
import { SkeletonService } from 'src/app/common/services/skeleton.service';
import { SkeletonProgressBarService } from 'src/app/common/services/skeleton-progress-bar.service';

import { HttpClient } from '@angular/common/http';
declare var MediaRecorder: any;
enum tabs {
  session,
  patient_list,
  schedule,
}
let iframeSplitScreen = [];
let lobbyComponentsInSplitScreen = [];
@Component({
  selector: 'app-therapist',
  templateUrl: './therapist.component.html',
  styleUrls: ['./therapist.component.scss'],
})
export class AdminComponent implements OnInit, OnDestroy, AfterViewInit {
  @select((state) => state.global.currentGameUrlFromTherapist)
  readonly currentGameUrlFromTherapist$: Observable<any>;
  @ViewChild('homePage') homePage: MenuOptionsComponent;

  OTHER_PATIENTS_VOLUME: number = 25;
  MAIN_PATIENT_VOLUME: number = 100;
  EMAIL_CONNECTION_MESSAGE_DELAY: number = 60000;
  users: User[] = [];
  patients: User[] = [];
  filteredPatients: User[] = [];
  allPatients: User[] = [];
  selectedUser: User;
  selected = new FormControl(0);
  connectedTherapist;
  keyUp = new Subject<KeyboardEvent>();
  subscription: Subscription = new Subscription();
  callPaitent: any;
  therapistPeer: any;
  remotePeerIds = []; // You need this to link with specific DOM element
  connectedPaitents = []; // This is where you manage multi-connections
  connectedVideoPaitents = [];
  videoSessionComponents = [];
  therapistPing: any;
  nameFilter: string = '';
  iframesColSpan = 2;
  iframesRowSpan = 2;
  currentUserInFullScreenMode: any;
  patientInitialStreams = {};
  emptySessionText = displayConstanst.no_session_place_holder_text;
  noResponseFrom = displayConstanst.no_response_from;
  currentTab = isMobileDevice() ? tabs.schedule : tabs.session;
  tabOptions = tabs;
  loggedInUserCount = 0;
  fontSize = 1;
  lineHeight = 1;
  isFullScreenMode = false;
  activeSessionWithAudio: any;
  audioTracks = [];
  peerjsHeartbeat;
  localStream: MediaStream;
  videoSessionDisplay = false;
  currentUserInFullScreenVideoSession;
  otherSideLeftSession = false;
  // Store separate overlay streams coming from dedicated Grill canvas MediaConnections
  private grillOverlayStreams: { [peerId: string]: MediaStream } = {};
  mediaStreamConstraints = {
    video: true,
    audio: { echoCancellation: true },
  };
  isPatientVideoInSession = false;
  iceServers;
  hiddenVideo;
  therapistCall;
  therapistVideo;
  isSettingModalOpened = false;
  peerHasErrors = false;
  therapistHasCamera: boolean = true;
  isCameraOn = true;
  hangupConfirmBtn: boolean = false;
  enlarge: boolean = false;
  sendEmailTimeoutConnection;
  InstituteLogo: string;
  isPatientOnMobile: boolean = false;
  isRdpModalOpen = false;
  patientId: string = '';
  rustdeskId: string | null = null;
  newRustdeskId = '';
  isPatientOnRinging: string = '';
  therapistActiveCalls: any[] = [];
  // [Mode Fix] monitoring
  private modeFixInterval: any = null;
  private lastParticipantCount: number = 0;
  constructor(
    private authenticationService: AuthenticationService,
    private webRtcService: WebRtcService,
    private ajax: AjaxService,
    private splitScreenScalerService: SplitScreenScalerService,
    private streamHandlerService: StreamHandlerService,
    private sanitizer: DomSanitizer,
    private patientWebRtcService: PatientWebRtcService,
    private ref: ChangeDetectorRef,
    public appActions: AppActions,
    private skeletonService: SkeletonService,
    private skeltonProgressBarService: SkeletonProgressBarService,
    private http: HttpClient,
  ) {
    this.connectedTherapist = this.authenticationService.currentUserValue;
    this.InstituteLogo = this.connectedTherapist?.instituteLogo || '';
    this.subscription.add(
      this.keyUp
        .pipe(
          // tslint:disable-next-line:no-string-literal
          map((event) => event.target['value']),
          debounceTime(1000),
          distinctUntilChanged(),
          mergeMap((search) => of(search).pipe(delay(500)))
        )
        .subscribe((data) => {
          // console.log("========serach text=====",data);
          this.filterUsersByName(data);
        })
    );
    this.subscription.add(
      this.currentGameUrlFromTherapist$.subscribe((currentGameUrlFromTherapist) => {
        if (currentGameUrlFromTherapist) {
          this.webRtcService.privateMessage(
            currentGameUrlFromTherapist.peerId,
            { type: 'set_game_url', url: currentGameUrlFromTherapist.url },
            this.connectedPaitents
          );
        }
      })
    );
    this.subscription.add(
      this.ajax.getIceServers().subscribe((res) => {
        this.iceServers = res;
        this.therapistPeer = this.webRtcService.initialize(this.connectedTherapist.peerId, this.iceServers);
        this.handleTherapistPeer();
      })
    );
  }

  async ngOnInit() {
    this.therapistHasCamera = await this.hasUserCamera();
    this.hiddenVideo = document.getElementById('hidden-video');
    const blackSilence = (...args) => new MediaStream([this.silence(), this.black(...args), this.black(...args)]);
    this.hiddenVideo.srcObject = blackSilence();
    iframeSplitScreen = [];
    lobbyComponentsInSplitScreen = [];
    this.connectedPaitents = [];
    this.initTherapistCallbacksFromSdk();
    this.subscription.add(
      this.ajax
        .getAll()
        .pipe(first())
        .subscribe((users) => {
          this.users = users;
          this.patients = users.filter((t) => t.role === Role.Patient || t.role === Role.Video_Patient);
          this.allPatients = [...this.patients];
          this.filteredPatients = [];
        })
    );

    const iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
    const eventName = iOS ? 'pagehide' : 'beforeunload';
    window.addEventListener(eventName, (event) => {
      this.ngOnDestroy();
    });
  }

  ngAfterViewInit() {
    this.turnOnCamera();
    // [Mode Fix] Start monitoring participant count in therapist view
    try {
      if (!this.modeFixInterval) {
        this.checkAndUpdateParticipantMode();
        this.modeFixInterval = setInterval(() => this.checkAndUpdateParticipantMode(), 500);
        console.log('[Mode Fix] Participant monitoring activated (therapist page)');
      }
    } catch (e) {
      console.warn('[Mode Fix] Failed to start participant monitoring (therapist page)', e);
    }
  }

  sendRdpRequestToPatient(conn) {
    this.webRtcService.privateMessage(conn.user.peerId, { type: MESSAGES.RDP_REQUEST }, this.connectedPaitents);
  }

  openRdpModal = async (conn) => {
    await this.fetchRustDeskId(conn); // Wait for the RustDesk ID to be fetched
    if (this.rustdeskId) {
      this.connectToRdp();
    } else {
      this.sendRdpRequestToPatient(conn);
      const modalClass = 'generic-dialog-container';
      this.isRdpModalOpen = true;
      this.patientId = conn.user.patientId;
    }
  };

  closeRdpModal() {
    this.isRdpModalOpen = false;
  }
/*
  connectToRdp() {
    if (!this.rustdeskId) {
      console.warn('[Popup removed] RustDesk ID is required to connect.');
      return;
    }
    const rdpUrl = `https://rustdesk.com/web/?id=${this.rustdeskId}`;
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      rdpUrl,
      '_blank',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
    this.isRdpModalOpen = false;
  }*/

  connectToRdp() {
    if (!this.rustdeskId) {
        console.warn('[Popup removed] RustDesk ID is required to connect.');
        return;
    }
   navigator.clipboard.writeText(this.rustdeskId)
        .then(() => {
            console.log(`RustDesk ID "${this.rustdeskId}" copied to clipboard!`);
            const rdpUrl = `https://rustdesk.com/web/?id=${this.rustdeskId}`;
            const width = 800;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            window.open(
                rdpUrl,
                '_blank',
                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
            );
            this.isRdpModalOpen = false;
        })
        .catch((err) => {
            console.warn('Failed to copy RustDesk ID to clipboard:', err);
            console.warn('[Popup removed] Failed to copy RustDesk ID to clipboard. Please copy it manually.');
        });
  }
  

  /* fetchRustDeskId(conn) {
    this.ajax.getRustDeskId(conn.user.patientId).subscribe((response) => {     
     this.rustdeskId = response; 
    });
  }*/
  fetchRustDeskId(conn): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ajax.getRustDeskId(conn.user.patientId).subscribe(
        (response) => {
          this.rustdeskId = response; // Assign the fetched RustDesk ID
          resolve(); // Resolve the Promise after setting the ID
        },
        (error) => {
          console.warn('Failed to fetch RustDesk ID', error);
          this.rustdeskId = null; // Set ID to null in case of an error
          resolve(); // Resolve even on error to prevent blocking
        }
      );
    });
  }

  saveRustDeskId() {
    if (!this.newRustdeskId) {
      // console.log('Please enter a valid RustDesk ID.');
      return;
    }
    const rustdeskIdAsString = this.newRustdeskId.toString();
    this.ajax.saveRustDeskId(this.patientId, rustdeskIdAsString).subscribe(
      () => {
        this.rustdeskId = rustdeskIdAsString;
        this.newRustdeskId = '';
        // console.log('RustDesk ID saved successfully.');
      },
      (error) => {
        console.warn('Failed to save RustDesk ID:', error);
      }
    );
  }

  redirectToHome(conn) {
    this.webRtcService.privateMessage(conn.peer, { type: MESSAGES.REDIRECT_TO_HOME }, this.connectedPaitents);

    // When therapist navigates the patient back home, clear therapist-side game progress
    try {
      const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
      if (connectedPaitent) {
        connectedPaitent.gameAppDataFromPatient = null;
        connectedPaitent.scoreForTherapist = 0;
        connectedPaitent.showPercentageScoreForTherapist = false;
        connectedPaitent.showTimerForTherapist = false;
      }
    } catch (_) {}

    // [Mode Fix] After returning to lobby, ensure the menu grid resets to centered state
    try {
      const connectionId = (conn && (conn as any).connectionId) || (conn && (conn as any).id);
      if (connectionId) {
        setTimeout(() => {
          try {
            const wrapper = document.getElementById(`games-iframe-wrapper-${connectionId}`);
            const menu = wrapper ? (wrapper.querySelector('#menu-container') as HTMLElement) : null;
            if (menu) {
              menu.style.transform = 'translateX(0)';
              menu.style.animation = 'none';
              menu.style.marginLeft = 'auto';
              menu.style.marginRight = 'auto';
              menu.style.width = 'auto';
            }
          } catch (e) {
            console.warn('[Mode Fix] Failed to normalize lobby grid after quit', e);
          }
        }, 300);
      }
    } catch (_) {}
  }

  toggleSwapScreens = (peer_id) => {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === peer_id);
    if (connectedPaitent) {
      connectedPaitent.isSwappedScreens = !connectedPaitent.isSwappedScreens;
    }
    this.ref.detectChanges();
    this.patientWebRtcService.setIsSwappedScreen({
      peerId: connectedPaitent.connection.peer,
      status: connectedPaitent.isSwappedScreens,
    });
  };

  toggleTracking = (peer_id) => {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === peer_id);
    if (connectedPaitent) {
      if (!connectedPaitent.isBodyTrackingAvailable || connectedPaitent.trackBody === null) {
        return;
      }
      connectedPaitent.bodyTrackingLoading = true;
      this.ref.detectChanges();

      this.webRtcService.privateMessage(peer_id, { type: 'track_body' }, this.connectedPaitents);
    }
  };

  async onSelect(user: User): Promise<void> {
    console.log('onSelect:', {
      patientId: user.id,
      peerId: user.peerId,
      availabilityStatus: user.availabilityStatus,
      hasCamera: user.hasCamera,
      isInSession: user.isInSession,
      waitingForSession: user.waitingForSession,
    });

    const userHasCamera = await this.hasUserCamera();
    if (!userHasCamera) {
      // console.log('[Therapist Session] Therapist has no camera available');
      this.showNoCameraMessage();
      return;
    }

    // Check if patient is available before allowing ring
    if (!user.availabilityStatus || user.availabilityStatus !== 'available') {
      let message = 'Patient is not available for video call';
      if (user.availabilityStatus === 'do_not_disturb') {
        message = 'Patient has enabled Do Not Disturb mode';
      } else if (user.availabilityStatus === 'offline') {
        message = 'Patient is offline';
      } else if (user.availabilityStatus === 'unavailable') {
        message = 'Patient is unavailable';
      } else {
        message = 'Patient status is unknown';
      }
      // console.log('[Therapist Session] Cannot start session:', {
      //   reason: message,
      //   patientStatus: user.availabilityStatus,
      //   patientId: user.id,
      // });
      this.appActions.setMessageRTMModal(message);
      return;
    }

    if (!this.isPatientVideoInSession && user.hasCamera) {
      console.log('[Therapist Session] Starting session with patient:', {
        patientId: user.id,
        peerId: user.peerId,
        hasCamera: user.hasCamera,
      });
      this.selectedUser = user;
      const connectedPaitent = this.connectedPaitents.find(
        (paitent) => paitent.connection.peer === this.selectedUser.peerId
      );
      if (!connectedPaitent && !this.selectedUser.waitingForSession) {
        this.selectedUser.missedLastCall = false;
        this.selectedUser.waitingForSession = true;
        const onRingingCallSession = await this.fetchLastSessionStatus(this.selectedUser.patientId);
        console.log('[Therapist Session] Last session status:', onRingingCallSession);
        if (onRingingCallSession.type !== 'ringing') {
          console.log('[Therapist Session] Initiating ringing call');
          this.ajax.updateStartSessionWithPatient(this.selectedUser.peerId, 'ringing');
          console.log("here here here");
          this.joinSession(this.selectedUser.peerId, this.selectedUser);
        }
        if (onRingingCallSession.type === 'ringing') {
          console.log('[Therapist Session] Clearing old ringing session');
          this.clearRingingStatusOfPatient(this.selectedUser.patientId);
          // 1️⃣ Clear ringing in backend
          await this.ajax.updateStartSessionWithPatient(
            this.selectedUser.peerId,
            'hang_up'
          );
        
          // 2️⃣ Small delay to let DB update
          await new Promise(resolve => setTimeout(resolve, 300));        
          // 3️⃣ Start fresh ringing session
          this.ajax.updateStartSessionWithPatient(
            this.selectedUser.peerId,
            'ringing'
          );  
          this.isPatientOnRinging = 'calling';        
          // 4️⃣ Join session again
          this.joinSession(this.selectedUser.peerId, this.selectedUser);
        }
        
      }
      this.getSpanSize();
    }
  }

  async fetchLastSessionStatus(patientId: number) {
    try {
      const result = await this.ajax.getLastTherapistSessionStatus(patientId).toPromise();
      this.isPatientOnRinging = result.type;        
      return result;
    } catch (error) {
      return null;
    }
  }

  onClickSettings = (connectionId, isGameShown) => {
    if (!isGameShown) {
      return;
    }
    const iframeEl = document.getElementById('games-iframe-' + connectionId);
    const wasOpen = this.isSettingModalOpened;
    this.isSettingModalOpened = !this.isSettingModalOpened;
    communicationUtil.sendMessageToIframe(iframeEl, this.isSettingModalOpened, MESSAGES.SETTINGS_MODAL_OPENED);
    if (wasOpen && !this.isSettingModalOpened) {
      const connectedPaitent = this.connectedPaitents.find((p) => p.connection.connectionId === connectionId);
      if (connectedPaitent && (connectedPaitent.gameId === 20 || connectedPaitent.gameName?.toLowerCase() === 'grill')) {
        setTimeout(() => this.attachStreamToGrillArea(connectedPaitent.connection.peer, connectionId), 200);
      }
    }
  };

  navigateHome = (conn) => {
    this.webRtcService.privateMessage(conn.user.peerId, { type: MESSAGES.REDIRECT_TO_HOME }, this.connectedPaitents);
  };

  showNoCameraMessage = () => {
    this.appActions.openCallModal(
      {
        panelClass: 'generic-dialog-container',
        header: 'Camera Error',
        content: 'You need to connect a web camera to make calls',
        acceptBtnImg: '../../../assets/buttons/btn_accept_hover.png',
        acceptBtnImgHover: '../../../assets/buttons/btn_accept_hover.png',
        approveCallback: () => { },
        declineCallback: () => { },
        timeout: 60000,
      },
      false
    );
  };

  handleConnetionErrorToSignalingServer = () => {
    console.warn('LOST CONNECTION TO SYSTEM');
  };

  silence = () => {
    let ctx = new AudioContext(),
      oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    return Object.assign(dst['stream'].getAudioTracks()[0], { enabled: false });
  };

  black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement('canvas'), {
      width,
      height,
    });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    let stream = (canvas as any).captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  setCurrentTab(tab: tabs): void {
    if (tab === this.currentTab) {
      return;
    }
    this.currentTab = tab;
    if (tab === tabs.session && this.connectedPaitents.length > 0) {
      setTimeout(() => this.reattachAllGrillStreams(), 150);
    }
  }

  isCurrentTab(tab: tabs): boolean {
    return tab === this.currentTab;
  }

  removeTherapistMedia = () => {
    if (this.audioTracks.length > 0) {
      this.audioTracks.forEach((stream) => stream.track.getTracks().forEach((track) => track.stop()));
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  };

  async logout() {
    this.removeTherapistMedia();
    await this.authenticationService.logout();
  }

  connectToPatient(remotePeerId, user) {
    const conn = this.therapistPeer.connect(remotePeerId);
    this.handleConnection(conn, user);
  }

  handleConnection = (conn, user) => {
    this.isPatientOnMobile = user.is_mobile;
    this.remotePeerIds.push(conn.peer);

    conn.on('open', () => {
      if (user.role === Role.Video_Patient) {
        this.handleVideoPatientSession(user, conn);
      }
      conn.on('data', (data) => {
        this.handleMessage(data, conn, user);
      });
      conn.on('close', () => {
        this.handleCloseConnection(conn, user);
      });
      conn.on('error', (err) => {
        console.warn('error: ' + err);
        // this.handleCloseConnection(conn, user);
      });

      // issues of timing
      new Promise<void>((resolve) => {
        setTimeout(() => {
          this.webRtcService.privateMessage(conn.peer, { type: 'send_game_url' }, this.connectedPaitents, conn);
          resolve();
        }, 1000);
      }).then(() => {
        setTimeout(() => {
          this.webRtcService.privateMessage(conn.peer, { type: 'send_patients_game' }, this.connectedPaitents, conn);
        }, 2000);
      });
    });
  };

  handleCloseConnection = (conn, user) => {
    if (user.role !== Role.Video_Patient) {
      if (this.isFullScreenMode && this.currentUserInFullScreenMode.connection === conn) {
        this.onLeaveFullScreenMode();
      }
      const iframeEl = document.getElementById('games-iframe-' + conn.connectionId);
      iframeSplitScreen = iframeSplitScreen.filter((currIframe) => currIframe !== iframeEl);
      const iframeWrapperEL = document.getElementById('games-iframe-wrapper-' + conn.connectionId);
      lobbyComponentsInSplitScreen = lobbyComponentsInSplitScreen.filter(
        (currIframe) => currIframe !== iframeWrapperEL
      );
      this.connectedPaitents = this.connectedPaitents.filter((connPatient) => connPatient.connection !== conn);
      this.videoSessionComponents = this.videoSessionComponents.filter(
        (connPatient) => connPatient.connection !== conn
      );
      // tslint:disable-next-line:no-string-literal

      if (
        this.activeSessionWithAudio &&
        conn === this.activeSessionWithAudio.connection &&
        this.connectedPaitents.length > 0
      ) {
        const connection = this.connectedPaitents[this.connectedPaitents.length - 1];
        this.setAciveSessionWithAudio(connection.connection.peer);
      }
      this.updateConnectionPositions();
      this.hangUpSession(user);
      this.getSpanSize();
    }
    user.isInSession = false;
    user.waitingForSession = false;
    this.isPatientVideoInSession = false;
    this.stopCallTimer(user);

    if (this.connectedPaitents.length > 1 && !this.isFullScreenMode) {
      this.patientWebRtcService.setIsSplitScreen(true);
    } else {
      this.patientWebRtcService.setIsSplitScreen(false);
    }

    if (this.connectedPaitents.length === 0 && this.isCameraOn === false) {
      this.toggleCamera();
    }
  };

  updateConnectionPositions = () => {
    this.connectedPaitents = this.connectedPaitents.map((conn, index) => {
      conn.position = index;
      return conn;
    });
  };

  connectToUser(user: User) {
    user.waitingForSession = false;
    this.callPaitent = true;
    user.isInSession = true;
    user.isInSession = true;
    this.startCallTimer(user);
    if (user.role === 'video_patient') {
      this.isPatientVideoInSession = true;
    }
    this.getSpanSize();
  }

  showHangUpBtns = (value) => {
    this.hangupConfirmBtn = value;
  };

  hangUpSession = (user, isPatientVideoInSession = null) => {
    clearTimeout(this.sendEmailTimeoutConnection);
    this.webRtcService.privateMessage(user.peerId, { type: 'set_busy_therapist', msg: false }, this.connectedPaitents);
    this.callPaitent = false;
    user.isInSession = false;
    this.stopCallTimer(user);
    if (!isPatientVideoInSession) {
      this.webRtcService.privateMessage(user.peerId, { type: 'hang_up_session' }, this.connectedPaitents);
      // Update the session type to null if the call is hung up
      this.ajax.updateStartSessionWithPatient(user.peerId, 'hang_up');
    }
    setTimeout(() => {
      if (user === this.selectedUser) {
        this.selectedUser.isInSession = false;
        this.stopCallTimer(this.selectedUser);
      }
      let connection = this.connectedPaitents.find((conn) => conn.connection.peer === user.peerId);
      if (connection === this.activeSessionWithAudio) {
        this.activeSessionWithAudio = null;
      }
      if (connection) {
        connection.connection.close();
        connection.mediaRecorder = undefined;
        this.connectedPaitents = this.connectedPaitents.filter((conn) => conn.connection.peer !== user.peerId);
      } else {
        connection = this.videoSessionComponents.find((conn) => conn.connection.peer === user.peerId);
        if (connection) {
          connection.connection.close();
          this.videoSessionComponents = this.videoSessionComponents.filter(
            (conn) => conn.connection.peer !== user.peerId
          );
        }
      }
      if (isPatientVideoInSession) {
        this.webRtcService.privateMessage(user.peerId, { type: 'hang_up_session' }, this.connectedVideoPaitents);
        let connection = this.connectedVideoPaitents.find((conn) => conn.user.peerId === user.peerId);
        if (connection) {
          connection.connection.close();
          this.connectedVideoPaitents = this.connectedVideoPaitents.filter((conn) => conn.user.peerId !== user.peerId);
        }
      }
      const session = this.therapistActiveCalls.find(
        // tslint:disable-next-line: no-string-literal
        (activeCall) => activeCall['call'].peer === user.peerId
      );
      if (session && session.call) {
        session.call.close();
      }

      this.therapistActiveCalls = this.therapistActiveCalls.filter(
        // tslint:disable-next-line: no-string-literal
        (call) => call['call'].peer !== user.peerId
      );
      if (
        !isPatientVideoInSession &&
        user &&
        this.activeSessionWithAudio &&
        user === this.activeSessionWithAudio.user &&
        this.connectedPaitents.length > 0
      ) {
        const connection = this.connectedPaitents[this.connectedPaitents.length - 1];
        this.setAciveSessionWithAudio(connection.connection.peer);
      }
      if (this.isFullScreenMode) {
        this.onLeaveFullScreenMode();
      }
      this.getSpanSize();
      this.ref.detectChanges();
    }, 300);
    if (this.connectedPaitents.length > 1 && !this.isFullScreenMode) {
      this.patientWebRtcService.setIsSplitScreen(true);
    } else {
      this.patientWebRtcService.setIsSplitScreen(false);
    }
    this.hangupConfirmBtn = false;
  };

  /*filterUsersByName(text) {
    this.nameFilter = text;
    if (text !== '') {
      this.filteredPatients = this.filteredPatients.filter((t) => t.username.includes(text));
    }
  }*/
  filterUsersByName(text) {
    this.nameFilter = text;
    if (text && text.trim() !== '') {
      const lowerText = text.toLowerCase();
      this.filteredPatients = this.allPatients.filter((t) =>
        (t.username && t.username.toLowerCase().includes(lowerText)) ||
        (t.firstName && t.firstName.toLowerCase().includes(lowerText)) ||
        (t.lastName && t.lastName.toLowerCase().includes(lowerText))
      );
    } else {
      this.filteredPatients = [...this.allPatients];
    }
  }


  handleMessage = (data, conn, user) => {
    let iframeEl = document.getElementById('games-iframe-' + conn.connectionId);
    if (!iframeEl) {
      iframeEl = document.getElementById('games-iframe-wrapper-' + conn.connectionId);
    }
    switch (data.type) {
      case 'grill_canvas_active':
        try {
          const connectedPaitent = this.connectedPaitents.find((p) => p.connection.peer === conn.peer);
          if (connectedPaitent) {
            connectedPaitent.unityCanvasActive = !!data.active;
            // If canvas became active and Grill is shown, attempt attach immediately
            if (connectedPaitent.unityCanvasActive && (connectedPaitent.gameId === 20 || connectedPaitent.gameName?.toLowerCase() === 'grill')) {
              // The loading screen will be hidden in attachStreamToGrillArea when video has dimensions
              setTimeout(() => this.attachStreamToGrillArea(conn.peer, connectedPaitent.connection.connectionId), 200);
            } else {
              // Canvas became inactive (game is quitting)
              if ((connectedPaitent.gameId === 20 || connectedPaitent.gameName?.toLowerCase() === 'grill') && !data.active) {
                (connectedPaitent as any).grillGameQuitting = true;
                connectedPaitent.isGameShown = false;
              }
              // Ensure overlay is hidden if canvas not active
              const grillVideoEl = document.getElementById('grill-video-' + connectedPaitent.connection.connectionId) as HTMLVideoElement | null;
              if (grillVideoEl) {
                try { (grillVideoEl as any).srcObject = null; } catch (_) {}
                grillVideoEl.style.display = 'none';
                grillVideoEl.style.visibility = 'hidden';
                grillVideoEl.style.opacity = '0';
              }
              // Clear any stale expected canvas id and cached overlay stream on deactivate
              try { (connectedPaitent as any).expectedCanvasTrackId = null; } catch (_) {}
              try { delete this.grillOverlayStreams[conn.peer]; } catch (_) {}
            }
          }
        } catch (_) {}
        break;
      case 'grill_canvas_id':
        try {
          const connectedPaitent = this.connectedPaitents.find((p) => p.connection.peer === conn.peer);
          if (connectedPaitent && data.id) {
            (connectedPaitent as any).expectedCanvasTrackId = data.id;
            // Try immediate attach if Grill active
            if (connectedPaitent.unityCanvasActive && (connectedPaitent.gameId === 20 || connectedPaitent.gameName?.toLowerCase() === 'grill')) {
              setTimeout(() => this.attachStreamToGrillArea(conn.peer, connectedPaitent.connection.connectionId), 150);
            }
          }
        } catch (_) {}
        break;
      case 'game_state':
        if (data.payload.type && data.payload.type === 'menu-options') {
          this.connectedPaitents = handleGameLobbyStateMessage(this.connectedPaitents, data, conn);
        } else {
          handleGameIframeStateMessage(data, MESSAGES.STATE, iframeEl);
        }
        this.ref.detectChanges();
        break;
      case 'patients_game':
        this.connectedPaitents = handlePatientsGamesMessage(this.connectedPaitents, data, conn);
        this.ref.detectChanges();
        break;
      case 'progress_bar':
        this.skeltonProgressBarService.setBarElement('' + data.data.barPercentage);
        this.skeltonProgressBarService.setThumbUpElement('' + data.data.barThumbsUp);
        this.skeltonProgressBarService.setShowProgressBar(data.data.showProgressBar);
        break;
      case 'skeleton_tracking':
        this.skeletonService.updateSkeleton(data.data.frame);
        break;
      case 'skeleton_buffer':
        this.setPatientFrame(conn, data.skeletonTrackingData);
        if (iframeEl && iframeEl.nodeName === 'IFRAME') {
          handleSkeletonBufferOnIframe(iframeEl, data, MESSAGES.SKELETON);
          const currConnectionItem = this.connectedPaitents.find((connPatient) => connPatient.connection === conn);
          if (currConnectionItem) {
            if (currConnectionItem.options_menu_state.skeletonBuffer) {
              currConnectionItem.options_menu_state = {
                isTherapist: true,
                skeletonInGame: true,
                skeletonBuffer: undefined,
                id: conn.peer,
              };
            }
            currConnectionItem.bodyTrackingLoading = false;
          }
        } else if (iframeEl) {
          this.connectedPaitents = handleSkeletonBufferOnLobbyMessage(this.connectedPaitents, data, conn);
        }
        this.ref.detectChanges();
        break;
      case MESSAGES.DEPTH_CAM_CONNECTION:
        this.handlePatientDepthCamConnection(data.payload, conn);
        break;
      case 'update_game_score':
        this.setScoreForTherapist(conn, data);
        break;
      case 'update_game_name':
        this.setGameName(conn, data);
        break;
      case 'game_url':
        const activeCall = this.therapistActiveCalls.find(
          // tslint:disable-next-line:no-string-literal
          (activeCall) => activeCall['call'].peer === conn.peer
        );
        if (data.payload.url === 'menu-options') {
          this.handleNewGameLobbyContainer(conn, activeCall);
        } else if (data.payload.url === 'video-patient') {
          this.isPatientVideoInSession = true;
          this.handleVideoPatientSession(user, conn);
        } else {
          this.handleNewIframeContainer(conn, activeCall, data);
        }
        this.ref.detectChanges();
        break;
      case MESSAGES.GENERIC_MESSAGE:
        if (iframeEl && iframeEl.nodeName === 'IFRAME') {
          communicationUtil.sendMessageToIframe(iframeEl, data.payload, MESSAGES.GENERIC_MESSAGE);
        }
        break;
      case MESSAGES.STOP_VIDEO_SESSION:
        this.otherSideLeftSession = true;
        break;
      case 'hang_up_session':
        const call = this.therapistActiveCalls.find(
          // tslint:disable-next-line:no-string-literal
          (activeCall) => activeCall['call'].peer === conn.peer
        );
        this.handleCloseCall(call.call, data.payload);
        break;
      case 'track_body':
        const connectedPatient = this.connectedPaitents.find((patient) => patient.connection === conn);
        if (connectedPatient) {
          connectedPatient.bodyTrackingLoading = false;
          connectedPatient.trackBody = data.payload;
          if (data.payload !== null) {
            connectedPatient.allowStartGame = true;
          }
        }
        this.ref.detectChanges();
        break;
      case 'body_tracking_unavailable':
        const patient = this.connectedPaitents.find((patient) => patient.connection === conn);
        if (patient) {
          patient.isBodyTrackingAvailable = false;
          this.ref.detectChanges();
        }
        break;
      case MESSAGES.APP_GAME_DATA:
        const currentConnectedPatient = this.connectedPaitents.find((patient) => patient.connection === conn);
        if (currentConnectedPatient) {
          currentConnectedPatient.gameAppDataFromPatient = data.payload;
          if (data.payload.score) {
            currentConnectedPatient.showPercentageScoreForTherapist =
              data.payload.score.type == 'regular' ? false : true;
            currentConnectedPatient.scoreForTherapist = data.payload.score.value;
          } else {
            currentConnectedPatient.scoreForTherapist = data.payload.value;
          }
        }
        this.ref.detectChanges();
        break;
      default:
        break;
    }
  };

  handlePatientDepthCamConnection = (isDepthCamConnected, conn) => {
    const connection = this.connectedPaitents.find((currConn) => currConn.connection.peer === conn.peer);
    if (connection) {
      connection.isDepthCamConnected = isDepthCamConnected;
    }
  };

  handleSessionUpdateOnFullScreen = (conn) => {
    let connIndex = this.connectedPaitents.findIndex(
      (connPatient) => connPatient.connection.peer === conn.connection.peer
    );
    if (connIndex !== -1 && connIndex !== 0) {
      this.connectedPaitents = swapWithFirstElm(this.connectedPaitents, connIndex);
    }
  };

  shouldSaveNewConnection = (conn) => {
    const currConn = this.connectedPaitents.find((connection) => connection.connection === conn);

    if (currConn) {
      this.connectedPaitents = this.connectedPaitents.filter((connection) => connection.connection !== conn);
    }
    return true;
  };

  shouldActivateSound = (conn) => {
    const currConn = this.connectedPaitents.find((connection) => connection.connection === conn);
    return currConn ? false : true;
  };

  setCallStreamData = (patientPeerId, user) => {
    if (!this.localStream) {
      if (this.hasUserMedia()) {
        navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints).then(
          (stream) => {
            this.localStream = stream;
            setTimeout(() => {
              this.initiateCall(patientPeerId, user);
            }, 500);
          },
          (err) => {
            console.warn('error displaying webrtc: ', err);
          }
        );
      } else {
        console.warn('[Popup removed] WebRTC is not supported');
      }
    } else {
      this.initiateCall(patientPeerId, user);
    }
  };

  getTherapistClonedStream = () => {
    const clonedStream = this.audioTracks.find(
      (track) => track.peer_id === this.currentUserInFullScreenVideoSession.user.peerId
    );
    if (clonedStream) {
      return clonedStream.track;
    }
  };

  initiateCall = (patientPeerId, user) => {
    // PATCH: Validate peer is ready before calling
    if (!this.therapistPeer || !this.therapistPeer.open || this.therapistPeer.destroyed || this.therapistPeer.disconnected) {
      console.warn('[Call Error] Peer not ready:', {
        exists: !!this.therapistPeer,
        open: this.therapistPeer?.open,
        destroyed: this.therapistPeer?.destroyed,
        disconnected: this.therapistPeer?.disconnected
      });
      this.hangUpSession(user);
      this.appActions.setMessageRTMModal('Connection error. Please try again.');
      return;
    }

    // PATCH: Wrap in try-catch to handle exceptions
    try {
      const track = this.hiddenVideo.srcObject.clone();
      const localClone = this.localStream.clone();
      const displayName = this.connectedTherapist.first_name + ' ' + this.connectedTherapist.last_name;
      this.activeSessionWithAudio = null;
      this.audioTracks = this.streamHandlerService.muteAllActiveStreams(this.audioTracks);
      const existingTrack = this.audioTracks.find((track) => track.peer_id === patientPeerId);
      if (!existingTrack) {
        this.audioTracks.push({ peer_id: patientPeerId, track: localClone });
      }
      
      this.therapistCall = this.therapistPeer.call(patientPeerId, track, {
        metadata: displayName,
      });
      
      // PATCH: Validate call succeeded
      if (!this.therapistCall) {
        throw new Error('Call failed to initialize');
      }
      
      // PATCH: Handle peerConnection timing issue
      if (this.therapistCall.peerConnection) {
        this.setupCallAudioVideo(localClone, patientPeerId, user);
      } else {
        // Wait for peerConnection to initialize
        const checkConnection = setInterval(() => {
          if (this.therapistCall.peerConnection) {
            clearInterval(checkConnection);
            this.setupCallAudioVideo(localClone, patientPeerId, user);
          }
        }, 50);
        
        // Timeout after 3 seconds
        setTimeout(() => {
          clearInterval(checkConnection);
          if (!this.therapistCall.peerConnection) {
            throw new Error('Peer connection timeout');
          }
        }, 3000);
      }
    } catch (error) {
      console.warn('[Call Error]', error);
      this.hangUpSession(user);
      this.appActions.setMessageRTMModal('Failed to start call. Please try again.');
    }
  };

  // PATCH: New helper method to setup call audio/video with error handling
  setupCallAudioVideo = (localClone, patientPeerId, user) => {
    try {
      const senders = this.therapistCall.peerConnection.getSenders();
      const audioTrack = localClone.getAudioTracks()[0];
      const videoTrack = localClone.getVideoTracks()[0]; // Fixed: removed .enabled (was returning boolean instead of track)
      
      // Validate senders and tracks before replacing
      if (!senders || senders.length < 2) {
        console.warn('[Call Setup Error] Insufficient senders:', senders?.length);
        throw new Error('Peer connection does not have enough senders');
      }
      
      if (audioTrack) {
        senders[0].replaceTrack(audioTrack);
      } else {
        console.warn('[Call Setup] No audio track available');
      }
      
      if (videoTrack) {
        senders[1].replaceTrack(videoTrack);
      } else {
        console.warn('[Call Setup] No video track available');
      }
      
      this.muteMicrophone(patientPeerId);
      this.handleCall(this.therapistCall, user, patientPeerId);
    } catch (error) {
      console.warn('[Call Setup Error]', error);
      this.hangUpSession(user);
      this.appActions.setMessageRTMModal('Failed to setup call. Please try again.');
    }
  };

  handleStreamSending = (patientPeerId) => {
    setTimeout(() => {
      try {
        if (!this.localStream || !this.therapistCall?.peerConnection) {
          console.warn('[handleStreamSending] Missing localStream or peerConnection');
          return;
        }
        
        const localClone = this.localStream.clone();
        const senders = this.therapistCall.peerConnection.getSenders();
        const videoTrack = localClone.getVideoTracks()[0];
        
        if (senders && senders.length > 1 && videoTrack) {
          senders[1].replaceTrack(videoTrack);
        } else {
          console.warn('[handleStreamSending] Cannot replace track - insufficient senders or no video track');
        }
        
        let stream = this.audioTracks.find((activeStream) => activeStream.peer_id === patientPeerId);
        if (stream && stream.track) {
          this.setAciveSessionWithAudio(patientPeerId);
          stream = this.streamHandlerService.unMuteMicrophone(stream);
        }
      } catch (error) {
        console.warn('[handleStreamSending] Error:', error);
      }
    }, 1500);
  };

  clearRingingStatusOfPatient(patientId) {
    console.log("====patient_id====",patientId);
    this.ajax.therapistClearRingingStatus(patientId).subscribe(
      () => console.log("Ringing type cleared"),
      (err) => console.error("Failed to clear ringing type", err)
    );
  }

  handleCall = (therapistCall, user, patientPeerId) => {
    const timer = setTimeout(() => {
      user.waitingForSession = false;
      user.missedLastCall = true;
      console.log("=========userid=====",user);
      this.clearRingingStatusOfPatient(user.patientId);
      this.audioTracks = this.audioTracks.filter((track) => track.peer_id !== patientPeerId);
      this.hangUpSession(user);
    }, TIME_TO_ANSWER_CALL_MS + 5000);
    therapistCall.on('stream', (remoteStream) => {
      if (
        !this.therapistActiveCalls.find(
          // tslint:disable-next-line: no-string-literal
          (activeCall) => activeCall['call'].peer === therapistCall.peer
        )
      ) {
        this.ajax.updateStartSessionWithPatient(patientPeerId, 'connected');
        if (user.notification_email) {
          this.sendEmailAfterConnection(user);
        }
        this.therapistActiveCalls.push({
          call: therapistCall,
          stream: remoteStream,
          user,
          localStream: this.localStream,
        });
        this.patientInitialStreams[patientPeerId] = remoteStream;
        if (!this.connectedPaitents.find((conn) => conn.connection.peer === therapistCall.peer)) {
          clearTimeout(timer);
          user.missedLastCall = false;
          this.connectToPatient(therapistCall.peer, user);
          this.connectToUser(user);
        }
      }
    });
    therapistCall.on('close', () => {
      this.therapistActiveCalls = this.therapistActiveCalls.filter(
        // tslint:disable-next-line: no-string-literal
        (call) => call['call'].peer !== therapistCall.peer
      );
      const stream = this.audioTracks.find((activeStream) => activeStream.peer_id === therapistCall.peer);
      if (stream && stream.track) {
        stream.track.getAudioTracks().forEach(function (track) {
          track.stop();
        });
        this.audioTracks = this.audioTracks.filter((activeStream) => activeStream.peer_id !== therapistCall.peer);
      }
    });
    therapistCall.on('error', (err) => {
      console.warn('Error: ', err);
      if (!err.message) {
        // this.handleCloseCall(therapistCall, user);
        this.hangUpSession(user);
      } else if (!err.message.includes('disconnected')) {
        // this.handleCloseCall(therapistCall, user);
        this.hangUpSession(user);
      } else {
        const disconnectionInterval = setInterval(() => {
          if (!therapistCall.peerConnection || therapistCall.peerConnection.connectionState === 'failed') {
            this.hangUpSession(user);
            clearInterval(disconnectionInterval);
          }
        }, 1000);
      }
    });
  };

  sendEmailAfterConnection = (user) => {
    this.sendEmailTimeoutConnection = setTimeout(() => {
      this.ajax.sendEmailAfterConnection(user, this.connectedTherapist).subscribe((data) => { });
    }, this.EMAIL_CONNECTION_MESSAGE_DELAY);
  };

  handleCloseCall = (therapistCall, user) => {
    const stream = this.audioTracks.find((activeStream) => activeStream.peer_id === therapistCall.peer);
    if (stream && stream.track) {
      stream.track.getAudioTracks().forEach(function (track) {
        track.stop();
      });
      this.audioTracks = this.audioTracks.filter((activeStream) => activeStream.peer_id !== therapistCall.peer);
    }
    therapistCall.close();
    this.therapistActiveCalls = this.therapistActiveCalls.filter(
      // tslint:disable-next-line: no-string-literal
      (call) => call['call'].peer !== therapistCall.peer
    );
    let connection = this.connectedPaitents.find((conn) => conn.connection.peer === therapistCall.peer);
    if (connection) {
      connection.connection.close();
    }
    this.videoSessionDisplay = false;
    if (user.role === Role.Video_Patient) {
      this.handlePaitentVideoDissconnetion();
    }
  };

  joinSession = (patientPeerId, user) => {
    this.setCallStreamData(patientPeerId, user);
  };

  hasUserMedia() {
    // return navigator.getUserMedia;
    return navigator.mediaDevices.getUserMedia;
  }

  hasUserCamera = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (stream) {
        const cameras = stream.getVideoTracks();
        return cameras.length > 0;
      }
      return false;
    } catch (err) {
      // console.log('NO CAMERA DETECTED ==> ', err);
      return false;
    }
  };

  prepareLocalRTCSpecs = () => {
    if (this.hasUserMedia()) {
      navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints).then(
        (stream) => {
          setCameraFrameRate(stream);

          this.localStream = stream;
          this.therapistVideo.srcObject = this.localStream;
        },
        (err) => {
          console.warn('error displaying webrtc: ', err);
        }
      );
    } else {
      console.warn('[Popup removed] WebRTC is not supported');
    }
  };

  turnOnCamera = () => {
    this.therapistVideo = document.getElementById('therapist-video');
    this.therapistVideo.muted = true;
    this.prepareLocalRTCSpecs();
  };

  turnOffCamera = () => {
    this.removeTherapistMedia();
  };

  ngOnDestroy() {
    this.therapistActiveCalls.forEach((session) => {
      if (session.call) {
        session.call.close();
      }
      let connection = this.connectedPaitents.find((conn) => conn.connection.peer === session.peer);
      if (connection) {
        connection.connection.close();
      }
    });
    this.subscription.unsubscribe();
    communicationUtil.unSubscribeAllCallbacks();
    this.webRtcService.destroyPeer();
    clearInterval(this.therapistPing);
    clearInterval(this.peerjsHeartbeat);
    if (this.modeFixInterval) {
      clearInterval(this.modeFixInterval);
      this.modeFixInterval = null;
      console.log('[Mode Fix] Participant monitoring stopped (therapist page)');
    }
  }

  // [Mode Fix] helpers
  private getParticipantCount(): number {
    try {
      const byState = Array.isArray(this.connectedPaitents) ? this.connectedPaitents.length : 0;
      if (byState && byState > 0) return byState;
      const videos = document.querySelectorAll('video:not(#therapist-video)');
      if (videos && videos.length > 0) return videos.length;
      const tiles = document.querySelectorAll('.therapist-split-screen .mat-grid-tile, .therapist-split-screen .iframes-container');
      return tiles ? tiles.length : 0;
    } catch (_) {
      return 0;
    }
  }

  private checkAndUpdateParticipantMode(): void {
    const count = this.getParticipantCount();
    if (count !== this.lastParticipantCount) {
      console.log('[Mode Fix] Participant count changed:', this.lastParticipantCount, '→', count);
      this.lastParticipantCount = count;
      this.updateVideoLayoutMode(count);
    }
  }

  private updateVideoLayoutMode(count: number): void {
    const body = document.body;
    body.classList.remove('video-mode-single', 'video-mode-grid', 'video-mode-1-to-1', 'video-mode-1-to-many');
    if (count === 1) {
      console.log('[Mode Fix] Applying 1:1 focus mode CSS');
      body.classList.add('video-mode-single', 'video-mode-1-to-1');
    } else if (count >= 2) {
      console.log('[Mode Fix] Applying 1:many grid mode CSS');
      body.classList.add('video-mode-grid', 'video-mode-1-to-many');
    }
    try {
      window.dispatchEvent(new CustomEvent('videoModeChanged', {
        detail: { mode: count === 1 ? '1:1' : 'grid', participantCount: count },
      }));
    } catch (_) {}
  }

  initTherapistCallbacksFromSdk = () => {
    communicationUtil.initTherapistMessages();
    const self = this;
    communicationUtil.registerToCallback(MESSAGES.STATE, (msg) => {
      const { peerId } = msg;
      delete msg.peerId;
      if (_.some(self.connectedPaitents, (patient) => patient.connection.peer === peerId)) {
        this.webRtcService.privateMessage(peerId, { msg, type: MESSAGES.STATE }, this.connectedPaitents);
      }
    });
    communicationUtil.registerToCallback(MESSAGES.NEW_SETTINGS, (msg) => {
      const { peerId } = msg;
      delete msg.peerId;
      if (_.some(self.connectedPaitents, (patient) => patient.connection.peer === peerId)) {
        this.webRtcService.privateMessage(peerId, { msg, type: MESSAGES.NEW_SETTINGS }, this.connectedPaitents);
      }
    });
    communicationUtil.registerToCallback(MESSAGES.GENERIC_MESSAGE, (msg) => {
      const { peerId } = msg;
      delete msg.peerId;
      if (_.some(self.connectedPaitents, (patient) => patient.connection.peer === peerId)) {
        this.webRtcService.privateMessage(peerId, { msg, type: MESSAGES.GENERIC_MESSAGE }, this.connectedPaitents);
      }
    });
    communicationUtil.registerToCallback(MESSAGES.QUIT_GAME_FROM_THERAPIST, (msg) => {
      const { peerId } = msg;
      if (_.some(self.connectedPaitents, (patient) => patient.connection.peer === peerId)) {
        this.webRtcService.privateMessage(
          peerId,
          { msg, type: MESSAGES.QUIT_GAME_FROM_THERAPIST },
          this.connectedPaitents
        );
      }
    });
    communicationUtil.registerToCallback(MESSAGES.RESTART_GAME, (msg) => {
      const { peerId } = msg;
      if (_.some(self.connectedPaitents, (patient) => patient.connection.peer === peerId)) {
        this.webRtcService.privateMessage(peerId, { msg, type: MESSAGES.RESTART_GAME }, this.connectedPaitents);
      }
    });
    communicationUtil.registerToCallback(MESSAGES.SETTINGS_MODAL_OPENED, (msg) => {
      const { peerId, showWebRtcVideos } = msg;
      const connectedPaitent = self.connectedPaitents.find((patient) => patient.connection.peer === peerId);
      if (connectedPaitent) {
        connectedPaitent.showWebRtcVideos = showWebRtcVideos;
      }
    });
    communicationUtil.registerToCallback(MESSAGES.SHOW_END_GAME_MODAL, (e) => {
      console.log('SHOW_END_GAME_MODAL', e, new Date());
      const { peerId } = e;
      delete e.peerId;

      this.patientWebRtcService.setShouldShowEndGameModal({
        peerId: peerId,
        showModal: e.showModal,
        gameSummaryContent: e.gameSummaryContent,
      });
    });
    communicationUtil.registerToCallback(MESSAGES.GAME_READY_TO_START, (e) => {
      const { peerId } = e;
      const connectedPaitent = self.connectedPaitents.find((patient) => patient.connection.peer === peerId);
      if (connectedPaitent) {
        const iframeEl = document.getElementById('games-iframe-' + connectedPaitent.connection.connectionId);
        communicationUtil.sendMessageToIframe(iframeEl, {}, MESSAGES.GAME_READY_TO_START);
      }
    });
    communicationUtil.registerToCallback(MESSAGES.SEND_MEDIA_STREAM, (e) => {
      const { peerId, sendStream } = e;
      delete e.peerId;
      const connectedPaitent = self.connectedPaitents.find((patient) => patient.connection.peer === peerId);
      if (connectedPaitent) {
        const patientStream = this.getCurrentStream(connectedPaitent.connection.peer);
        const iframeEl = document.getElementById('games-iframe-' + connectedPaitent.connection.connectionId);
        let options = {
          audioBitsPerSecond: 128000,
          mimeType: 'audio/webm; codecs=opus',
        };
        if (!connectedPaitent.mediaRecorder) {
          connectedPaitent.mediaRecorder = new MediaRecorder(patientStream, options);
          connectedPaitent.mediaRecorder.ondataavailable = function (e) {
            if (e.data && e.data.size > 0) {
              e.data.arrayBuffer().then((buffer) => {
                communicationUtil.sendBlobMessageToIframe(
                  iframeEl,
                  { buffer, mediaDuration: e.timeStamp },
                  MESSAGES.MEDIA_STREAM
                );
              });
            }
          };
        }
        sendStream ? connectedPaitent.mediaRecorder.start(50) : connectedPaitent.mediaRecorder.stop();
      }
    });

    communicationUtil.registerToCallback(MESSAGES.UPLOAD_IMAGE, (e) => {
      const { peerId } = e;
      const connectedPaitent = self.connectedPaitents.find((patient) => patient.connection.peer === peerId);
      if (connectedPaitent) {
        this.uploadGameRelatedImage(e, connectedPaitent.connection.connectionId);
      }
    });
  };

  getCurrentStream = (peer_id) => {
    const currStream = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      (activeCall) => activeCall['call'].peer === peer_id
    );
    if (currStream) {
      return currStream.stream;
    }
  };

  styleObject = () => {
    const root = document.documentElement;
    root.style.setProperty('--my-background-size-var', this.fontSize + 'rem');
    root.style.setProperty('--my-background-position-var', `calc(50% - ${this.fontSize}rem * 4) 50%`);
    return {
      fontSize: this.fontSize + 'rem',
    };
  };

  styleGridObject = (therapistPatientConnection, index) => {
    if (
      this.isFullScreenMode &&
      this.currentUserInFullScreenMode.connection.peer === therapistPatientConnection.connection.peer
    ) {
      const topPosition = (100 / this.connectedPaitents.length) * index;
      if (this.connectedPaitents.length === 4) {
        return {
          position: 'absolute',
          zIndex: '11',
          top: `-${topPosition}%`,
          height: '85vh',
        };
      } else {
        return {
          position: 'absolute',
          zIndex: '11',
          top: `-${topPosition}%`,
        };
      }
    }
    return '';
  };

  onSessionInFullScreen = (conn) => {
    if (this.currentUserInFullScreenMode !== conn && !this.isFullScreenMode) {
      this.videoSessionComponents = this.connectedPaitents.filter(
        (connPatient) => connPatient.connection !== conn.connection
      );
      this.setAllVideoSessionComponentsVolume(this.OTHER_PATIENTS_VOLUME);

      const iframeEl = document.getElementById('games-iframe-' + conn.connectionId);
      iframeSplitScreen = iframeSplitScreen.filter((curr_iframe) => curr_iframe === iframeEl);

      const iframeWrapperEl = document.getElementById('games-iframe-wrapper-' + conn.connectionId);
      lobbyComponentsInSplitScreen = lobbyComponentsInSplitScreen.filter(
        (curr_iframe) => curr_iframe === iframeWrapperEl
      );

      this.currentUserInFullScreenMode = conn;
      communicationUtil.sendMessageToIframe(
        iframeEl,
        { type: 'split_screen_view', msg: false },
        MESSAGES.GENERIC_MESSAGE
      );
      this.setAciveSessionWithAudio(conn.connection.peer);
      this.isFullScreenMode = true;
      this.patientWebRtcService.setIsSplitScreen(false);
      this.iframesRowSpan = this.iframesColSpan = 2;
    }
  };

  selectCurrentUserInFullScreen = (conn) => {
    const videoSessionsComponentsWithoutSelected = this.videoSessionComponents.filter(
      (currSession) => currSession.connection !== conn.connection
    );

    this.videoSessionComponents = [...videoSessionsComponentsWithoutSelected, this.currentUserInFullScreenMode];

    const iframeEl = document.getElementById('games-iframe-' + conn.connectionId);

    // lower volume other patients, set main patient to max volume
    this.setAllVideoSessionComponentsVolume(this.OTHER_PATIENTS_VOLUME);
    conn.volume = this.MAIN_PATIENT_VOLUME;

    communicationUtil.sendMessageToIframe(
      iframeEl,
      { type: 'split_screen_view', msg: false },
      MESSAGES.GENERIC_MESSAGE
    );
    this.currentUserInFullScreenMode = conn;
    this.setAciveSessionWithAudio(conn.connection.peer);
    this.iframesRowSpan = this.iframesColSpan = 2;
    this.patientWebRtcService.setIsSplitScreen(false);
  };

  onLeaveFullScreenMode = () => {
    this.connectedPaitents.map((connectedPaitent) => {
      const iframeEl = document.getElementById('games-iframe-' + connectedPaitent.connection.connectionId);
      communicationUtil.sendMessageToIframe(
        iframeEl,
        { type: 'split_screen_view', msg: true },
        MESSAGES.GENERIC_MESSAGE
      );
    });
    this.videoSessionComponents = [];
    this.currentUserInFullScreenMode = null;
    this.isFullScreenMode = false;
    this.patientWebRtcService.setIsSplitScreen(true);
    this.connectedPaitents.sort((connA, connB) => {
      return connA.position - connB.position;
    });
    this.updateConnectedPaitentsBusyIndicator(null);
    this.audioTracks = this.streamHandlerService.muteAllActiveStreams(this.audioTracks);
    // lower all patients volume
    this.setAllConnectedPaitentsVolume(this.OTHER_PATIENTS_VOLUME);
    this.activeSessionWithAudio = null;
    this.getSpanSize();
  };

  muteMicrophone(peer_id) {
    let stream = this.audioTracks.find((activeStream) => activeStream.peer_id === peer_id);
    if (stream && stream.track) {
      if (!this.streamHandlerService.isStreamAudioEnabled(stream)) {
        this.setAciveSessionWithAudio(peer_id);
        stream = this.streamHandlerService.unMuteMicrophone(stream);
      } else {
        this.updateConnectedPaitentsBusyIndicator(null);
        this.activeSessionWithAudio = null;
        stream = this.streamHandlerService.muteMicrophone(stream);
        // lower all patients volume
        this.setAllConnectedPaitentsVolume(this.OTHER_PATIENTS_VOLUME);
      }
    }
  }

  toggleMutePatientSpeaker = (peer_id) => {
    const currStream = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      (activeCall) => activeCall['call'].peer === peer_id
    );
    if (currStream && currStream.stream) {
      if (!this.streamHandlerService.isStreamAudioEnabled(currStream.stream)) {
        currStream.stream = this.streamHandlerService.unMuteMicrophone(currStream.stream);
      } else {
        currStream.stream = this.streamHandlerService.muteMicrophone(currStream.stream);
      }
    }
    this.ref.detectChanges();
  };

  toggleMutePatientGame = (peer_id, startMuted = false) => {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === peer_id);
    if (!startMuted) {
      connectedPaitent.muteGameSound = !connectedPaitent.muteGameSound;
    }
    this.ref.detectChanges();
    if (connectedPaitent) {
      this.webRtcService.privateMessage(
        peer_id,
        { type: 'mute_game_sound', muteGameSound: connectedPaitent.muteGameSound },
        this.connectedPaitents
      );
    }
  };

  isPatientMuted = (peer_id) => {
    const currStream = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      (activeCall) => activeCall['call'].peer === peer_id
    );
    if (currStream && currStream.stream) {
      return currStream.stream.getAudioTracks()[0]?.enabled ? false : true;
    }
  };

  setAciveSessionWithAudio = (peer_id) => {
    this.audioTracks = this.streamHandlerService.muteAllActiveStreams(this.audioTracks);
    let stream = this.audioTracks.find((activeStream) => activeStream.peer_id === peer_id);
    if (stream && stream.track) {
      if (!this.streamHandlerService.isStreamAudioEnabled(stream)) {
        this.activeSessionWithAudio = this.connectedPaitents.find(
          (patient) => patient.connection.peer === stream.peer_id
        );
        stream = this.streamHandlerService.unMuteMicrophone(stream);
      }
    }

    this.setAllConnectedPaitentsVolume(this.OTHER_PATIENTS_VOLUME);
    this.connectedPaitents.forEach((connectedPatient) => {
      if (connectedPatient.connection.peer === peer_id) {
        connectedPatient.volume = this.MAIN_PATIENT_VOLUME;
      }
    });
    this.updateConnectedPaitentsBusyIndicator(peer_id);
  };

  updateConnectedPaitentsBusyIndicator = (activePeerId) => {
    this.connectedPaitents.map((connectedPatient) => {
      if (connectedPatient.connection.peer === activePeerId) {
        this.webRtcService.privateMessage(
          connectedPatient.connection.peer,
          { type: 'set_busy_therapist', msg: false },
          this.connectedPaitents
        );
      } else {
        this.webRtcService.privateMessage(
          connectedPatient.connection.peer,
          { type: 'set_busy_therapist', msg: true },
          this.connectedPaitents
        );
      }
    });
  };

  getLocalStream = (peer_id) => {
    const currStream = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      (activeCall) => activeCall['call'].peer === peer_id
    );
    if (currStream) {
      return currStream.localStream;
    }
  };

  togglePatientVideo = (peer_id) => {
    const currStream = this.therapistActiveCalls.find((activeCall) => activeCall['call'].peer === peer_id);
    if (currStream) {
      const initialStream = this.patientInitialStreams[peer_id];
      currStream.stream = currStream.stream ? null : initialStream;
    }
  };

  setMenuAndIFrameScale = (peer_id) => {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === peer_id);
    return this.splitScreenScalerService.setMenuAndIFrameScale(
      this.isFullScreenMode,
      this.connectedPaitents,
      connectedPaitent ? connectedPaitent.isSwappedScreens : null,
      connectedPaitent.user.disabledSkeleton
    );
  };

  getLoggedInPeers = () => {
    this.ajax
      .getOpenPeers()
      .toPromise()
      .then((list) => {
        const availableList = list.filter((peer) => {
          if (peer.peerStatus === PeersStatus.AVAILABLE || peer.peerStatus === PeersStatus.CONNECTED) {
            return true;
          }
          if (peer.peerStatus === PeersStatus.RINGING) {
            return peer.therapist_id === this.connectedTherapist.id;
          }
          return false;
        });
        this.ajax
          .getConnectedPeers()
          .toPromise()
          .then((peerUsers) => {
            let newFilteredPatients = this.patients.filter((patient) =>
              availableList.some((a) => a.user_id === Number(patient.peerId)) &&
              (
                (patient.username && patient.username.toLowerCase().includes(this.nameFilter.toLowerCase())) ||
                (patient.firstName && patient.firstName.toLowerCase().includes(this.nameFilter.toLowerCase())) ||
                (patient.lastName && patient.lastName.toLowerCase().includes(this.nameFilter.toLowerCase()))
              )
            );
            newFilteredPatients = newFilteredPatients.filter((patient) =>
              peerUsers.some((a) => a.id === patient.peerId)
            );

            // Update hasCamera, availabilityStatus, and isMobile for each patient
            newFilteredPatients.forEach((patient) => {
              const availablePatient = availableList.find((avp) => avp.user_id == patient.peerId);
              if (availablePatient) {
                patient.hasCamera = availablePatient.has_camera;
                patient.availabilityStatus = availablePatient.availability_status ?? 'unavailable';
                patient.isMobile = availablePatient.is_mobile;
                console.log('[Therapist] Updated patient status:', {
                  patientId: patient.peerId,
                  hasCamera: patient.hasCamera,
                  availabilityStatus: patient.availabilityStatus,
                  isMobile: patient.isMobile,
                });
              }
            });

            this.allPatients = this.filteredPatients = newFilteredPatients;
            this.initializeDisconnectedPatients();
            this.loggedInUserCount = this.filteredPatients.length;
            this.ref.detectChanges();
          });
      });
  };

  initializeDisconnectedPatients = () => {
    const disconnectedPatients = _.differenceBy(this.patients, this.filteredPatients, 'peerId');

    disconnectedPatients.map((patient) => {
      patient.missedLastCall = false;
      patient.waitingForSession = false;
      patient.isInSession = false;
    });
  };

  handleTherapistPeer = () => {
    this.therapistPeer.on('open', (id) => {
      this.peerHasErrors = false;
      this.getLoggedInPeers();
    });
    this.therapistPing = setInterval(() => {
      this.getLoggedInPeers();
    }, 5000);
    this.peerjsHeartbeat = setInterval(() => {
      this.therapistPeer.socket._sendHeartbeat();
    }, 30 * 1000);
    this.therapistPeer.on('close', () => {
      clearInterval(this.therapistPing);
    });
    this.therapistPeer.on('kill_connection', (msg) => {
      this.therapistPeer.destroy();
    });
    this.therapistPeer.on('disconnected', () => {
      const interval = setInterval(() => {
        if (this.therapistPeer.open === true || this.therapistPeer.destroyed === true) {
          clearInterval(interval);
        } else {
          if (this.therapistPeer.reconnect()) {
            console.log('connection established after reconnection');
            this.peerHasErrors = false;
          } else {
            console.log('trying to reconnect');
          }
        }
      }, 1000);
    });
    // Handle generic PeerJS errors
    this.therapistPeer.on('error', (err) => {
      console.warn(err);
      if (err.message && err.message.includes('Lost connection to server')) {
        if (!this.peerHasErrors) {
          this.peerHasErrors = true;
          setTimeout(this.checkPeerStatusAndHandlePeerError, CHECK_PEER_STATUS_AFTER_ERROR_TIME);
        }
      } else if (err.contains('taken')) {
        this.ajax.disconnectConnectedPeers(this.connectedTherapist.peerId);
        setTimeout(() => {
          this.therapistPeer = this.webRtcService.initialize(this.connectedTherapist.peerId, this.iceServers);
          this.handleTherapistPeer();
        }, 2000);
      }
    });

    // Accept inbound MediaConnections (e.g., dedicated Grill canvas stream)
    this.therapistPeer.on('call', (incomingCall: any) => {
      const metadata = (incomingCall as any)?.metadata || incomingCall?.metadata;
      try { console.log('[GRILL] inbound call metadata:', metadata); } catch (_) {}

      // Canvas call received - use existing game_introduction component for loading screen
      if (metadata === 'grill_canvas') {
        const connectedPaitent = this.connectedPaitents.find((p) => p.connection.peer === incomingCall.peer);
        if (!connectedPaitent) {
          try { console.warn('[GRILL] Canvas call received but connectedPaitent not found for peer:', incomingCall.peer); } catch (_) {}
        }
      }

      // Answer without sending local stream
      try {
        incomingCall.answer();
      } catch (_) {
        try {
          incomingCall.answer(undefined);
        } catch {
          return;
        }
      }

      incomingCall.on('stream', (stream: MediaStream) => {
        try { console.log('[GRILL] inbound canvas stream received from', incomingCall.peer); } catch (_) {}

        // Always store the stream in grillOverlayStreams, even if connectedPaitent is not found yet
        const oldStream = this.grillOverlayStreams[incomingCall.peer];
        if (oldStream && oldStream !== stream) {
          try {
            oldStream.getTracks().forEach(track => {
              try { track.stop(); } catch (_) {}
            });
          } catch (_) {}
        }
        this.grillOverlayStreams[incomingCall.peer] = stream;
        try { console.log('[GRILL] Stream stored in grillOverlayStreams for peer:', incomingCall.peer, 'streamId:', stream.id); } catch (_) {}

        // Now try to find the patient and attach the stream
        let connectedPaitent = this.connectedPaitents.find((p) => p.connection.peer === incomingCall.peer);
        if (!connectedPaitent) {
          const activeCall = this.therapistActiveCalls.find((call) => call['call'].peer === incomingCall.peer);
          if (activeCall && activeCall.user) {
            connectedPaitent = this.connectedPaitents.find((p) => p.user && p.user.peerId === incomingCall.peer);
          }
        }

        if (connectedPaitent) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            try {
              console.log(
                '[GRILL] Dedicated canvas call stream received, trackId:',
                videoTrack.id,
                'expectedId:',
                (connectedPaitent as any)?.expectedCanvasTrackId
              );
              if ((connectedPaitent as any)?.expectedCanvasTrackId && videoTrack.id !== (connectedPaitent as any)?.expectedCanvasTrackId) {
                console.warn(
                  '[GRILL] Track ID mismatch - received:',
                  videoTrack.id,
                  'expected:',
                  (connectedPaitent as any)?.expectedCanvasTrackId,
                  '- using received track anyway'
                );
              }
            } catch (_) {}
          }

          try { connectedPaitent.unityCanvasActive = true; } catch (_) {}

          const elId = 'grill-video-' + connectedPaitent.connection.connectionId;
          const grillVideoEl = document.getElementById(elId) as HTMLVideoElement | null;
          if (grillVideoEl) {
            try {
              const oldSrcObject = grillVideoEl.srcObject as MediaStream | null;
              if (oldSrcObject && oldSrcObject !== stream) {
                oldSrcObject.getTracks().forEach(track => {
                  try { track.stop(); } catch (_) {}
                });
              }
              grillVideoEl.srcObject = stream;
              grillVideoEl.muted = true;
              grillVideoEl.autoplay = true;
              grillVideoEl.playsInline = true;
              grillVideoEl.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                height: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                z-index: 2147483647 !important;
                background: #000 !important;
                object-fit: contain !important;
                pointer-events: none !important;
              `;
              if (grillVideoEl.parentElement) {
                grillVideoEl.parentElement.appendChild(grillVideoEl);
              }
              const p = grillVideoEl.play();
              if (p && typeof (p as any).then === 'function') {
                (p as any).then(() => {
                  try { console.log('[GRILL] new stream playing; videoSize:', grillVideoEl.videoWidth, 'x', grillVideoEl.videoHeight); } catch (_) {}
                }).catch(() => {});
              }
            } catch (e) {
              try { console.warn('[GRILL] direct attach failed, fallback to attachStreamToGrillArea', e); } catch (_) {}
            }
          }

          // Also call attachStreamToGrillArea to ensure it's attached properly
          setTimeout(() => {
            this.attachStreamToGrillArea(incomingCall.peer, connectedPaitent.connection.connectionId);
          }, 200);
          setTimeout(() => {
            this.attachStreamToGrillArea(incomingCall.peer, connectedPaitent.connection.connectionId);
          }, 1000);
        } else {
          // Patient not found yet, but stream is stored; retry until patient appears
          try {
            console.warn(
              '[GRILL] Canvas stream received but connectedPaitent not found yet for peer:',
              incomingCall.peer,
              '- stream stored, will retry attachment'
            );
          } catch (_) {}
          const retryFindPatient = setInterval(() => {
            const foundPatient = this.connectedPaitents.find((p) => p.connection.peer === incomingCall.peer);
            if (foundPatient) {
              clearInterval(retryFindPatient);
              try { console.log('[GRILL] Patient found, attaching canvas stream'); } catch (_) {}
              foundPatient.unityCanvasActive = true;
              setTimeout(() => {
                this.attachStreamToGrillArea(incomingCall.peer, foundPatient.connection.connectionId);
              }, 200);
            }
          }, 500);
          setTimeout(() => clearInterval(retryFindPatient), 10000);
        }
      });

      incomingCall.on('close', () => {
        delete this.grillOverlayStreams[incomingCall.peer];
      });
      incomingCall.on('error', () => {
        delete this.grillOverlayStreams[incomingCall.peer];
      });
    });
  };

  checkPeerStatusAndHandlePeerError = () => {
    if (this.peerHasErrors) {
      this.handleConnetionErrorToSignalingServer();
    }
  };

  getSpanSize = () => {
    this.connectedPaitents.length > 1
      ? (this.iframesRowSpan = this.iframesColSpan = 1)
      : (this.iframesRowSpan = this.iframesColSpan = 2);
  };

  handleMirrorPatientVideo = (shouldMirror) => {
    this.webRtcService.privateMessage(
      this.currentUserInFullScreenVideoSession.user.peerId,
      { msg: shouldMirror, type: 'mirror_full_screen_video' },
      this.connectedPaitents
    );
  };

  toggleVideoSessionView = () => {
    this.videoSessionDisplay = !this.videoSessionDisplay;
    if (!this.videoSessionDisplay) {
      if (this.isPatientVideoInSession) {
        this.webRtcService.privateMessage(
          this.currentUserInFullScreenVideoSession.user.peerId,
          { type: 'therapist_left_video_session' },
          this.connectedVideoPaitents
        );
        setTimeout(() => {
          this.handlePaitentVideoDissconnetion();
        }, 200);
      } else {
        this.webRtcService.privateMessage(
          this.currentUserInFullScreenVideoSession.user.peerId,
          { type: 'therapist_left_video_session' },
          this.connectedPaitents
        );
      }
    }
    if (!this.isPatientVideoInSession && this.currentUserInFullScreenVideoSession) {
      this.setAciveSessionWithAudio(this.currentUserInFullScreenVideoSession.user.peerId);
    }
  };

  handlePaitentVideoDissconnetion = () => {
    this.hangUpSession(this.currentUserInFullScreenVideoSession.user, true);
    this.isFullScreenMode = false;
    this.patientWebRtcService.setIsSplitScreen(true);
    this.currentUserInFullScreenVideoSession = null;
    this.isPatientVideoInSession = false;
  };

  handleVideoSessionView = () => {
    this.videoSessionDisplay = true;
    this.otherSideLeftSession = false;
    this.currentUserInFullScreenVideoSession = this.isFullScreenMode
      ? this.currentUserInFullScreenMode
      : this.connectedPaitents[0];
    //no user in currentUserInFullScreenVideoSession
    if (!this.isPatientVideoInSession) {
      this.webRtcService.privateMessage(
        this.currentUserInFullScreenVideoSession.user.peerId,
        { type: 'enter_full_screen_video_session' },
        this.connectedPaitents
      );
    }
  };

  getActiveCallOfVideoSession = () => {
    return this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      (activeCall) => activeCall['call'].peer === this.currentUserInFullScreenVideoSession.user.peerId
    );
  };

  getActiveStreams = (): MediaStream[] => {
    return _.map(this.therapistActiveCalls, (call) => call.stream);
  };

  getActiveCallUser = () => {
    const call = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      (activeCall) => activeCall['call'].peer === this.currentUserInFullScreenVideoSession.user.peerId
    );
    let userName;
    if (call) {
      userName = this.filteredPatients.find((user) => user.peerId === call.user.peerId);
    }
    if (userName) {
      return userName.username;
    }
    return '';
  };

  handleShareScreen = (status) => {
    if (status) {
      if (!this.isPatientVideoInSession) {
        this.webRtcService.privateMessage(
          this.currentUserInFullScreenVideoSession.user.peerId,
          { type: 'screen_share_started' },
          this.connectedPaitents
        );
      } else {
        this.webRtcService.privateMessage(
          this.currentUserInFullScreenVideoSession.user.peerId,
          { type: 'screen_share_started' },
          this.connectedVideoPaitents
        );
      }
    } else {
      if (!this.isPatientVideoInSession) {
        this.webRtcService.privateMessage(
          this.currentUserInFullScreenVideoSession.user.peerId,
          { type: 'screen_share_stopped' },
          this.connectedPaitents
        );
      }
      this.webRtcService.privateMessage(
        this.currentUserInFullScreenVideoSession.user.peerId,
        { type: 'screen_share_stopped' },
        this.connectedVideoPaitents
      );
    }
  };
  /****************************************HANDLE MESSAGE HELPERS**************************************/
  onIframeLoad(conn) {
    const iframeEl = document.getElementById('games-iframe-' + conn.connectionId);
    const muteMusicButton = document.getElementsByClassName('disabled-game-sound');
    if (muteMusicButton.length > 0) {
      setTimeout(() => {
        this.toggleMutePatientGame(conn.peer, true);
      }, 1000);
    }
    if (iframeEl && iframeEl.nodeName === 'IFRAME') {
      lobbyComponentsInSplitScreen = removeElementById(lobbyComponentsInSplitScreen, iframeEl.id);
      iframeSplitScreen.push(iframeEl);

      if (iframeSplitScreen.length > 1) {
        iframeSplitScreen.map((iframeEl) => {
          communicationUtil.sendMessageToIframe(
            iframeEl,
            { type: 'split_screen_view', msg: true },
            MESSAGES.GENERIC_MESSAGE
          );
        });
      }
    }
  }

  setShowTimerForTherapist(conn, data) {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
    if (connectedPaitent) {
      connectedPaitent.showTimerForTherapist = data;
    }
  }

  setScoreForTherapist(conn, data) {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
    if (connectedPaitent) {
      connectedPaitent.scoreForTherapist = data.score.value;
    }
  }

  setPatientFrame(conn, data) {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
    if (connectedPaitent) {
      connectedPaitent.skeletonTrackingData = data;
    }
  }

  setGameName(conn, data) {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
    if (connectedPaitent) {
      connectedPaitent.gameName = data.gameName;
    }
  }

  onGameShown(conn) {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
    if (connectedPaitent) {
      this.webRtcService.privateMessage(conn.peer, { type: MESSAGES.REQUEST_APP_GAME_DATA }, this.connectedPaitents);
      connectedPaitent.isGameShown = true;
    }
  }

  setInitGameSettingsForTherapist(conn, data) {
    const connectedPaitent = this.connectedPaitents.find((paitent) => paitent.connection.peer === conn.peer);
    if (connectedPaitent) {
      connectedPaitent.initGameSettingsForTherapist = data;
    }
  }

  handleVideoPatientSession = (user, conn) => {
    const newConnection = {
      user: user,
      connection: conn,
    };
    this.connectedVideoPaitents.push(newConnection);
    this.isFullScreenMode = true;
    this.patientWebRtcService.setIsSplitScreen(false);
    this.currentUserInFullScreenMode = newConnection;
    this.handleVideoSessionView();
  };

  trackConnectedPatient = (index: number, connectedPaitent) => {
    return connectedPaitent.connection.peer;
  };

  setAllConnectedPaitentsVolume = (vol: number) => {
    this.connectedPaitents.forEach((con) => {
      con.volume = vol;
    });
  };

  setAllVideoSessionComponentsVolume = (vol: number) => {
    this.videoSessionComponents.forEach((con) => {
      con.volume = vol;
    });
  };

  handleNewIframeContainer = (conn, activeCall, data) => {
    const shouldSwappedScreens = data.payload.name === 'studio' ? true : false;
    const shouldActivateSound = this.shouldActivateSound(conn);
    const currConn = this.connectedPaitents.find((connection) => connection.connection === conn);
    if (!currConn) {
      const newConnection = {
        connection: conn,
        user: activeCall.user,
        isInGame: true,
        isGameShown: false,
        gameUrl: this.sanitizer.bypassSecurityTrustResourceUrl(data.payload.url),
        options_menu_state: { isTherapist: true, skeletonInGame: false, skeletonBuffer: undefined, id: conn.peer },
        gameName: data.payload.name,
        gameId: data.payload.id,
        isSwappedScreens: shouldSwappedScreens,
        isDepthCamConnected: false,
        position: this.connectedPaitents.length,
        showWebRtcVideos: true,
        trackBody: null,
        muteGameSound: false,
        volume: this.MAIN_PATIENT_VOLUME,
        isBodyTrackingAvailable: true,
        showTimerForTherapist: false,
        initGameSettingsForTherapist: {},
      };
      this.connectedPaitents.push(newConnection);
      this.requestInitialDataFromPatient(newConnection.connection.peer);
    } else {
      if (data.payload.url) {
        currConn.gameUrl = this.sanitizer.bypassSecurityTrustResourceUrl(data.payload.url);
      }
      currConn.options_menu_state = {
        isTherapist: true,
        skeletonInGame: false,
        skeletonBuffer: undefined,
        id: conn.peer,
      };
      currConn.isSwappedScreens = shouldSwappedScreens;
      currConn.isDepthCamConnected = false;
      currConn.isInGame = true;
      currConn.initGameSettingsForTherapist = {};
      currConn.showTimerForTherapist = false;
      currConn.showWebRtcVideos = true;
      if (data.payload.name) {
        currConn.gameName = data.payload.name;
      }
      if (data.payload.id) {
        currConn.gameId = data.payload.id;
      }
    }
    if (shouldActivateSound) {
      this.setAciveSessionWithAudio(conn.peer);
    }
    if (this.isFullScreenMode && this.currentUserInFullScreenMode.connection === conn) {
      // this.handleSessionUpdateOnFullScreen(newConnection);
      this.iframesRowSpan = this.iframesColSpan = 2;
    } else if (!this.isFullScreenMode && this.connectedPaitents.length > 1) {
      this.patientWebRtcService.setIsSplitScreen(true);
      this.getSpanSize();
    }
  };

  requestInitialDataFromPatient = (peerId) => {
    this.webRtcService.privateMessage(peerId, { type: 'send_initial_status' }, this.connectedPaitents);
  };

  handleNewGameLobbyContainer = (conn, activeCall) => {
    const shouldActivateSound = this.shouldActivateSound(conn);
    const currConn = this.connectedPaitents.find((connection) => connection.connection === conn);
    if (!currConn) {
      const newConnection = {
        connection: conn,
        options_menu_state: { isTherapist: true, id: conn.peer },
        user: activeCall.user,
        isInGame: false,
        isGameShown: false,
        position: this.connectedPaitents.length,
        showWebRtcVideos: true,
        trackBody: false,
        muteGameSound: false,
        volume: this.MAIN_PATIENT_VOLUME,
        isBodyTrackingAvailable: true,
      };
      this.connectedPaitents.push(newConnection);
      this.requestInitialDataFromPatient(newConnection.connection.peer);
    } else {
      currConn.options_menu_state = { isTherapist: true, id: conn.peer };
      currConn.isInGame = false;
      currConn.showTimerForTherapist = false;
      currConn.isGameShown = false;
      currConn.gameUrl = null;
      currConn.showWebRtcVideos = true;
      currConn.initGameSettingsForTherapist = {};
    }
    if (shouldActivateSound) {
      this.setAciveSessionWithAudio(conn.peer);
    }
    if (this.isFullScreenMode && this.currentUserInFullScreenMode.connection === conn) {
      // this.handleSessionUpdateOnFullScreen(newConnection);
      this.iframesRowSpan = this.iframesColSpan = 2;
    } else if (!this.isFullScreenMode && this.connectedPaitents.length > 1) {
      this.patientWebRtcService.setIsSplitScreen(true);
      this.getSpanSize();
    }

    setTimeout(() => {
      const iframeEl = document.getElementById('games-iframe-' + conn.connectionId);
      if (iframeEl) {
        iframeSplitScreen = removeElementById(iframeSplitScreen, iframeEl.id);
        const iframeWrapeprEl = document.getElementById('games-iframe-wrapper-' + conn.connectionId);
        lobbyComponentsInSplitScreen.push(iframeWrapeprEl);
      }
    }, 1500);
  };

  startCallTimer = (user) => {
    user.callDurationInSeconds = 0;
    user.callTimerInterval = setInterval(() => {
      user.callDurationInSeconds++;
    }, 1000);
  };

  stopCallTimer = (user) => {
    clearInterval(user.callTimerInterval);
  };

  sendEnlargeVideoToPatient = (message: IEnlargeVideoMessage) => {
    this.enlarge = !this.enlarge;
    const { peerId, enlargeVideo } = message;
    this.webRtcService.privateMessage(peerId, { enlargeVideo, type: MESSAGES.ENLARGE_VIDEO }, this.connectedPaitents);
  };

  getSkeletonTitle = (therapistPatientConnection): string => {
    if (!therapistPatientConnection.isBodyTrackingAvailable) {
      return '';
    }
    return therapistPatientConnection.trackBody ? 'Disable markers' : 'Enable markers';
  };

  toggleCamera = () => {
    this.isCameraOn = !this.isCameraOn;
    this.isCameraOn ? this.turnOnCamera() : this.turnOffCamera();
  };

  uploadGameRelatedImage = (data, connectionId) => {
    this.ajax.uploadGameRelatedImageForTherapist(data.file).subscribe((url) => {
      const iframeEl = document.getElementById('games-iframe-' + connectionId);
      communicationUtil.sendMessageToIframe(iframeEl, url, MESSAGES.IMAGE_UPLOADED);
    });
  };

  getPatientStatusIcon(user: User): string {
    if (user.availabilityStatus === 'unavailable') {
      return 'hourglass_empty'; // Shows a person with a slash through it
    }
    if (user.availabilityStatus === 'do_not_disturb') {
      return 'do_not_disturb'; // Red DND icon
    }
    if (user.availabilityStatus === 'offline') {
      return 'offline_pin'; // Shows an offline status icon
    }
    return ''; // Empty hourglass for available/waiting status
  }

  getPatientStatusClass(user: User): string {
    if (user.availabilityStatus === 'unavailable' ||
      user.availabilityStatus === 'do_not_disturb' ||
      user.availabilityStatus === 'offline') {
      return '';
    }
    return '';
  }

  // Helper function to detect Unity canvas stream (more flexible than exact match)
  private isUnityCanvasStream(track: MediaStreamTrack): boolean {
    if (!track) return false;

    const settings = track.getSettings ? track.getSettings() : {};
    const height = (settings as any).height || 0;
    const aspectRatio = (settings as any).aspectRatio || 0;
    const deviceId = (settings as any).deviceId || '';

    const is16x9 = Math.abs(aspectRatio - 16 / 9) < 0.05;
    const isHighRes = height >= 600;
    const hasNoDeviceId = !deviceId || deviceId.length === 0;

    const label = (track as any).label || '';
    const hasCanvasLikeLabel = label.length > 50;

    const isCanvas =
      (is16x9 && isHighRes) ||
      (hasNoDeviceId && is16x9) ||
      (hasCanvasLikeLabel && is16x9 && height >= 500);

    return isCanvas;
  }

  /** Re-attach Grill canvas streams for all connected patients in Grill game. Call when therapist returns to session view (e.g. after tab switch or closing settings). */
  reattachAllGrillStreams = (): void => {
    if (!this.connectedPaitents.length) return;
    this.connectedPaitents.forEach((p) => {
      const isGrill = p.gameId === 20 || p.gameName?.toLowerCase() === 'grill';
      if (!isGrill) return;
      const hasStream = this.grillOverlayStreams && this.grillOverlayStreams[p.connection.peer];
      const canvasActive = p.unityCanvasActive === true;
      if (hasStream || canvasActive) {
        setTimeout(() => this.attachStreamToGrillArea(p.connection.peer, p.connection.connectionId), 0);
      }
    });
  };

  // Restored from release_ga_grill: robust Grill canvas attach with retries and track-change handling
  attachStreamToGrillArea = (peerId: string, connectionId: string, retries = 20) => {
    let grillVideoEl = document.getElementById('grill-video-' + connectionId) as HTMLVideoElement | null;
    if (!grillVideoEl) {
      const videosByClass = document.querySelectorAll('.unity-game-canvas');
      for (let i = 0; i < videosByClass.length; i++) {
        const v = videosByClass[i] as HTMLElement;
        if (v.id && v.id.includes('grill-video')) {
          grillVideoEl = v as HTMLVideoElement;
          break;
        }
      }
    }
    try {
      console.log(
        '[GRILL] attachStreamToGrillArea init | elementFound:',
        !!grillVideoEl,
        'peer:',
        peerId,
        'connId:',
        connectionId,
        'retries:',
        retries
      );
    } catch (_) {}

    const activeCall = this.therapistActiveCalls.find((call) => call['call'].peer === peerId);

    let remoteStream: MediaStream | null = null;

    // Check dedicated canvas call stream first (grillOverlayStreams)
    const connectedPaitent = this.connectedPaitents.find((p) => p.connection.peer === peerId);
    const explicitCanvasActivePref = !!(connectedPaitent && connectedPaitent.unityCanvasActive === true);
    const expectedId = (connectedPaitent as any)?.expectedCanvasTrackId;

    if (this.grillOverlayStreams && this.grillOverlayStreams[peerId]) {
      const candidate = this.grillOverlayStreams[peerId];
      const vt = candidate && candidate.getVideoTracks ? candidate.getVideoTracks()[0] : null;
      if (vt && (vt as any).readyState !== 'ended') {
        // We know this stream came from a dedicated 'grill_canvas' MediaConnection,
        // so treat any live video track here as the Unity canvas, even if IDs/heuristics disagree.
        remoteStream = candidate;
        try {
          console.log(
            '[GRILL] Using stream from grillOverlayStreams as canvas, trackId:',
            vt.id,
            'expectedId:',
            expectedId || '(none)'
          );
        } catch (_) {}
      } else {
        try { console.log('[GRILL] Stream in grillOverlayStreams has ended track'); } catch (_) {}
      }
    } else {
      try { console.log('[GRILL] No stream in grillOverlayStreams for peer:', peerId); } catch (_) {}
    }

    if (!remoteStream && activeCall && activeCall['call'].peerConnection) {
      const pc = activeCall['call'].peerConnection as RTCPeerConnection;
      const receivers = pc.getReceivers();
      try {
        console.log(
          '[GRILL] receivers:',
          receivers?.length,
          receivers?.map((r) => ({
            kind: r.track?.kind,
            id: r.track?.id,
            label: r.track?.label,
            settings: r.track?.getSettings ? r.track.getSettings() : {},
          }))
        );
      } catch (_) {}
      let videoReceiver = receivers.find((r) => r.track && r.track.kind === 'video');
      const audioReceiver = receivers.find((r) => r.track && r.track.kind === 'audio');

      if (receivers && receivers.length) {
        const explicitCanvasActive = explicitCanvasActivePref;

        if (explicitCanvasActive && !remoteStream) {
          let candidate: RTCRtpReceiver | null = null;
          if (expectedId) {
            candidate = receivers.find(
              (r) => r.track && r.track.kind === 'video' && r.track.id === expectedId
            ) as RTCRtpReceiver | null;
          }
          if (!candidate) {
            candidate = receivers.find(
              (r) => r.track && r.track.kind === 'video' && this.isUnityCanvasStream(r.track)
            ) as RTCRtpReceiver | null;
          }
          try {
            console.log(
              '[GRILL] Checking main call receivers - explicitCanvasActive:',
              explicitCanvasActive,
              'expectedId:',
              expectedId,
              'candidateId:',
              candidate?.track?.id,
              'allReceiverIds:',
              receivers.map((r) => ({ id: r.track?.id, kind: r.track?.kind }))
            );
          } catch (_) {}
          if (candidate && candidate.track) {
            videoReceiver = candidate;
          } else {
            // We expected a dedicated Grill canvas call but haven't seen it yet.
            // Ask the patient explicitly to restart the Grill canvas stream.
            try {
              console.warn('[GRILL] No matching canvas track in main call; requesting Grill canvas restart from patient');
              this.webRtcService.privateMessage(
                peerId,
                { type: 'RESTART_GRILL_CANVAS' },
                this.connectedPaitents
              );
            } catch (_) {}

            if (grillVideoEl) {
              try { (grillVideoEl as any).srcObject = null; } catch (_) {}
              grillVideoEl.style.display = 'none';
              grillVideoEl.style.visibility = 'hidden';
              grillVideoEl.style.opacity = '0';
            }
            if (retries > 0) {
              setTimeout(() => this.attachStreamToGrillArea(peerId, connectionId, retries - 1), 300);
            }
            return false;
          }
        }

        // Prefer explicit flag, otherwise fall back to heuristic canvas detection
        let isCanvas = explicitCanvasActive;
        if (!isCanvas) {
          const heuristicCandidate = receivers.find(
            (r) => r.track && r.track.kind === 'video' && this.isUnityCanvasStream(r.track)
          );
          if (heuristicCandidate && heuristicCandidate.track) {
            videoReceiver = heuristicCandidate;
            isCanvas = true;
            try { console.warn('[GRILL] Using heuristic canvas track (no explicit flag yet)'); } catch (_) {}
          }
        }

        if (!isCanvas) {
          if (grillVideoEl) {
            try {
              (grillVideoEl as any).srcObject = null;
            } catch (_) {}
            grillVideoEl.style.display = 'none';
            grillVideoEl.style.visibility = 'hidden';
            grillVideoEl.style.opacity = '0';
          }
          try { console.log('[GRILL] explicitCanvasActive=false; overlay hidden'); } catch (_) {}
          return false;
        }

        if (!videoReceiver || !videoReceiver.track) {
          if (retries > 0) {
            setTimeout(() => this.attachStreamToGrillArea(peerId, connectionId, retries - 1), 300);
          }
          try { console.log('[GRILL] videoReceiver missing; retry'); } catch (_) {}
          return false;
        }

        const currentVideoTrack = videoReceiver.track;
        const currentAudioTrack = audioReceiver && audioReceiver.track ? audioReceiver.track : null;
        try {
          console.log(
            '[GRILL] selectedTrack:',
            currentVideoTrack?.id,
            currentVideoTrack?.label,
            currentVideoTrack?.getSettings ? currentVideoTrack.getSettings() : {}
          );
        } catch (_) {}

        const newStream = new MediaStream();
        newStream.addTrack(currentVideoTrack);
        // Do not add audio to the grill overlay stream; therapist should only hear mic from main call
        remoteStream = newStream;
        (activeCall as any).stream = newStream;
      } else {
        remoteStream = this.getCurrentStream(peerId);
      }
    } else if (!remoteStream) {
      remoteStream = this.getCurrentStream(peerId);
    }

    if (!grillVideoEl) {
      if (retries > 0) {
        setTimeout(() => this.attachStreamToGrillArea(peerId, connectionId, retries - 1), 500);
      }
      try { console.log('[GRILL] grillVideoEl not found; retry'); } catch (_) {}
      return false;
    }

    if (!remoteStream) {
      if (retries > 0) {
        setTimeout(() => this.attachStreamToGrillArea(peerId, connectionId, retries - 1), 500);
      }
      try { console.log('[GRILL] remoteStream missing; retry'); } catch (_) {}
      return false;
    }

    try {
      // Style overlay explicitly in case CSS hasn't loaded yet
      grillVideoEl.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        height: 100% !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 1000 !important;
        background: #000 !important;
        object-fit: contain !important;
        pointer-events: none !important;
      `;

      const currentSrcObject = (grillVideoEl as any).srcObject as MediaStream | null;
      if (currentSrcObject !== remoteStream) {
        (grillVideoEl as any).srcObject = remoteStream;
      } else if (
        grillVideoEl.videoWidth > 0 &&
        grillVideoEl.videoHeight > 0 &&
        !grillVideoEl.paused
      ) {
        return true;
      }
      grillVideoEl.muted = true;
      grillVideoEl.autoplay = true;
      grillVideoEl.playsInline = true;
      grillVideoEl.load();
      try { console.log('[GRILL] srcObject set; readyState:', grillVideoEl.readyState); } catch (_) {}

      const tryPlay = () => {
        if (grillVideoEl.readyState >= 2) {
          const playPromise = grillVideoEl.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setTimeout(() => {
                  if (grillVideoEl.paused || grillVideoEl.readyState < 2) {
                    grillVideoEl.play().catch(() => {});
                  } else {
                    try {
                      console.log(
                        '[GRILL] playing; videoSize:',
                        grillVideoEl.videoWidth,
                        'x',
                        grillVideoEl.videoHeight
                      );
                    } catch (_) {}
                  }
                }, 500);
              })
              .catch(() => {
                setTimeout(() => {
                  grillVideoEl.play().catch(() => {});
                }, 200);
              });
          }
        } else {
          grillVideoEl.addEventListener(
            'loadeddata',
            () => {
              grillVideoEl.play().catch(() => {});
            },
            { once: true }
          );
          setTimeout(() => {
            if (grillVideoEl.readyState < 2) {
              tryPlay();
            }
          }, 1000);
        }
      };

      if (grillVideoEl.readyState >= 2) {
        tryPlay();
      } else {
        grillVideoEl.addEventListener('loadeddata', tryPlay, { once: true });
        grillVideoEl.addEventListener('canplay', tryPlay, { once: true });
        setTimeout(tryPlay, 500);
      }

      if (remoteStream.getVideoTracks().length > 0) {
        const videoTrack = remoteStream.getVideoTracks()[0];

        videoTrack.addEventListener('ended', () => {
          setTimeout(() => this.attachStreamToGrillArea(peerId, connectionId, 5), 500);
        });
      }

      (remoteStream as any).addEventListener('addtrack', (event: any) => {
        if (event.track.kind === 'video') {
          setTimeout(() => {
            this.attachStreamToGrillArea(peerId, connectionId, 3);
          }, 500);
        }
      });

      (remoteStream as any).addEventListener('removetrack', (event: any) => {
        if (event.track.kind === 'video') {
          setTimeout(() => {
            this.attachStreamToGrillArea(peerId, connectionId, 3);
          }, 500);
        }
      });

      return true;
    } catch (err) {
      try { console.error('[GRILL] attachStreamToGrillArea error', err); } catch (_) {}
      if (retries > 0) {
        setTimeout(() => this.attachStreamToGrillArea(peerId, connectionId, retries - 1), 500);
      }
    }
    return false;
  };

  /******************************************************************************************/
}