import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  SimpleChange,
  OnDestroy,
  AfterViewInit,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { select } from '@angular-redux/store';
import { Subscription, Observable } from 'rxjs';
import { Pose, POSE_CONNECTIONS, Results } from '@mediapipe/pose';
import { WebRtcService } from '../../services/therapist_web_rtc.service';
import { AppActions } from '../../../app.actions';
import { IEnlargeVideoMessage } from '../../../common/services/communication_util.service';
import { SkeletonFrame, SkeletonService } from 'src/app/common/services/skeleton.service';
import { SkeletonProgressBarService } from 'src/app/common/services/skeleton-progress-bar.service';

const isVideoPlaying = (video) => !!(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2);
@Component({
  selector: 'app-therapist-web-rtc-video',
  templateUrl: './therapist_web_rtc_video.component.html',
  styleUrls: ['./therapist_web_rtc_video.component.scss'],
})
export class TherapitWebRTCVideoComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() therapistPatientConnection;
  @Input() activeCallStream;
  @Input() localStream;
  @Input() isInWebcamContainer;
  @Input() shouldSwapViews = false;
  @Input() isSwappedScreens;
  @Input() isSplitScreenView;
  @Input() isDepthCameraConnected;
  @Input() isDisabledSkeletonVideo;
  @Input() showWebRtcVideos;
  @Input() volume: number;
  @Input() isActiveSkeleton;
  @Output() handleVideoSessionView = new EventEmitter();
  @Output() handleStreamSending = new EventEmitter();
  @Output() handlePatientVideo = new EventEmitter();
  @Output() enlargeVideoChanged = new EventEmitter<IEnlargeVideoMessage>();
  @ViewChild('patientVideo') patientVideo!: ElementRef;
  @ViewChild('localVideoRef') localVideoRef!: ElementRef;
  @ViewChild('canvasRef') canvasRef!: ElementRef;
  private cameraPose!: Pose;

  @select((state) => state.global.enlargeVideo) readonly enlargeVideo$: Observable<boolean>;

  receivedRemoteVideo: boolean = true;
  remoteVideo: any;
  remoteStream: MediaStream;
  localVideo: any;
  therapistPeer: any;
  videoRotation: number = 0;
  dragging = false;
  ctx;
  private playbackWatchdog: any = null;
  private lastPlaybackTime = 0;
  patientRotation = 0;
  enlargeVideo = false;
  hideVideo = false;
  subscription: Subscription = new Subscription();
  joints = [];
  connections = [];
  sliderValue: number = 0;
  thumbUpValue: number = 0;
  showThumbUp: boolean = false;
  private iceMonitoringWired = false;
  private poseStarted = false;
  private isDestroyed = false;
  private animationFrameId: number | null = null;


  constructor(private webRtcService: WebRtcService, private appActions: AppActions, private skeletonService: SkeletonService, private skeltonProgressBarService: SkeletonProgressBarService) {
    this.initialize();
  }

  /**
   * Determine if skeleton/canvas rendering should be active.
   * Only when not in webcam container, skeleton is not disabled, and explicitly active.
   */
  private shouldRenderSkeleton(): boolean {
    return !this.isInWebcamContainer && !this.isDisabledSkeletonVideo && !!this.isActiveSkeleton;
  }

  ngOnInit() {
    this.subscription.add(
      this.enlargeVideo$.subscribe((enlargeVideo) => {
        this.enlargeVideo = enlargeVideo;
      })
    );

    this.subscription.add(
      this.skeletonService.skeleton$.subscribe((data: any) => {
        if (data) {
          this.joints = data.joints;
          this.connections = data.connections;
        }
        // this.drawSkeleton(data.frame);
      })
    )

    this.subscription.add(
      this.skeltonProgressBarService.progressBarElement$.subscribe(value => {
        if (+value > this.sliderValue || +value == 0) {
          this.sliderValue = +value;
        }
      })
    );

    this.subscription.add(
      this.skeltonProgressBarService.thumbUpElement$.subscribe(value => {
        if (+value > 0 && +value % 3 === 0 && this.thumbUpValue != +value) {
          this.showThumbUp = true;
          this.thumbUpValue = +value;
          setTimeout(() => {
            this.showThumbUp = false;
          }, 5000);
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    const connection: SimpleChange = changes.therapistPatientConnection;
    const call: SimpleChange = changes.activeCallStream;
    const localStream: SimpleChange = changes.localStream;
    const inWebcamChange: SimpleChange = changes.isInWebcamContainer as any;
    const disabledSkeletonChange: SimpleChange = changes.isDisabledSkeletonVideo as any;
    const activeSkeletonChange: SimpleChange = changes.isActiveSkeleton as any;

    if (connection && connection.previousValue !== connection.currentValue) {
      this.therapistPatientConnection = connection.currentValue;
    }

    if (call && call.currentValue && call.previousValue !== call.currentValue) {
      this.activeCallStream = call.currentValue;
      if (this.activeCallStream) {
        this.receivedRemoteVideo = true;
        // Re-fetch the current DOM element and reassign the stream
        this.reassignStreamToVideoElement();
        // Force playback shortly after assignment in case autoplay pauses
        setTimeout(() => {
          if (this.remoteVideo && this.remoteVideo.paused) {
            this.remoteVideo.play().catch((err) => {
              console.error(`[${this.therapistPatientConnection?.peer}] Remote video play error:`, err);
            });
          }
        }, 100);
      } else {
        this.receivedRemoteVideo = false;
      }
    }

    if (localStream && localStream.previousValue !== localStream.currentValue) {
      this.localStream = localStream.currentValue;
      this.reassignLocalStreamToVideoElement();
    }

    if (this.remoteVideo) {
      this.remoteVideo.volume = this.volume / 100;
    }

    // When switching into webcam/sidebar container, ensure video is shown and canvas hidden
    if (inWebcamChange && inWebcamChange.currentValue === true) {
      this.hideVideo = false;
    }
    // When switching out of webcam (to main/full view), start processing if stream is present
    if (inWebcamChange && inWebcamChange.currentValue === false) {
      if (this.remoteVideo && this.activeCallStream) {
        if (this.shouldRenderSkeleton()) {
          //this.processVideoFrames();
          this.safeStartPose();
        } else {
          this.hideVideo = false;
        }
      }
    }

    // React to skeleton flags: ensure canvas hidden when disabled/inactive
    if (disabledSkeletonChange || activeSkeletonChange) {
      if (this.shouldRenderSkeleton()) {
        if (this.remoteVideo && this.activeCallStream) {
          //this.processVideoFrames();
          this.safeStartPose();
        }
      } else {
        this.hideVideo = false;
      }
    }
  }

  ngAfterViewInit() {
    this.remoteVideo = this.patientVideo?.nativeElement || document.getElementById(`patient-video-${this.therapistPatientConnection.peer}`);
    if (this.remoteVideo) {
      this.remoteVideo.volume = this.volume / 100;
    }
    this.localVideo = this.localVideoRef?.nativeElement || document.getElementById(`local-video-${this.therapistPatientConnection.peer}`);

    if (this.localVideo && !isVideoPlaying(this.localVideo) && this.localStream) {
      this.localVideo.srcObject = this.localStream;
      this.localVideo.muted = true;
      this.localVideo.onloadeddata = (e) => {
        this.localVideo.play();
      };
    }
    if (this.remoteVideo) {
      this.handleCall();
    } else {
      // If element isn't available right away, retry once on the next tick
      setTimeout(() => this.reassignStreamToVideoElement(), 0);
    }

    // Wire ICE monitoring if available
    this.wireIceMonitoring();
  }

  ngOnDestroy() {

    this.isDestroyed = true;
  
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  
    if (this.cameraPose) {
      this.cameraPose.close();
    }
  
    if (this.enlargeVideo) {
      this.toggleEnlargeVideo();
    }
    if (this.playbackWatchdog) {
      clearInterval(this.playbackWatchdog);
      this.playbackWatchdog = null;
    }
    this.subscription.unsubscribe();
  }
  

  initialize() {
    this.therapistPeer = this.webRtcService.getTherapistPeer();
  }

  togglePatientVideo() {
    this.handlePatientVideo.emit();
  }

  handleCall() {
    // Initialize pose models only when we are NOT in the small webcam container
    if (this.shouldRenderSkeleton()) {
      this.initializePoseModels();
    }
    // Use ViewChild for current element
    this.remoteVideo = this.patientVideo?.nativeElement || this.remoteVideo;
    this.remoteVideo.srcObject = this.activeCallStream;
    this.remoteStream = this.activeCallStream;
    this.remoteVideo.onloadeddata = async (e) => {
      let isVertical = false;
      if (this.remoteVideo.videoHeight > this.remoteVideo.videoWidth) {
        isVertical = true;
      }
      if (isVertical) {
        this.remoteVideo.style.cssText += 'object-fit: contain;background: black';
      }
      await this.remoteVideo.play();
      this.receivedRemoteVideo = true;
      this.handleStreamSending.emit();

      // Only process frames for skeleton when enabled/active
      if (this.shouldRenderSkeleton()) {
        //this.processVideoFrames();
        this.safeStartPose();
      } else {
        this.hideVideo = false;
      }
    };

    // Start playback watchdog
    this.startPlaybackWatchdog();
    // Ensure ICE monitoring is wired
    this.wireIceMonitoring();
  }

  private safeStartPose() {

    if (this.isDestroyed) return;
  
    if (!this.patientVideo || !this.patientVideo.nativeElement) {
      console.log('⏳ patientVideo not ready, retrying...');
      setTimeout(() => this.safeStartPose(), 200);
      return;
    }
  
    if (this.poseStarted) return; // prevent multiple loops
  
    this.poseStarted = true;
  
    const video = this.patientVideo.nativeElement;
  
    video.play().then(() => {
      this.processVideoFrames(video);
    }).catch(err => {
      console.error('Video play error:', err);
    });
  }
  
  hangUpSession() {
    if (this.activeCallStream) {
      this.receivedRemoteVideo = !this.receivedRemoteVideo;
    }
  }

  setPatientSidebarVideoClasses() {
    const classes = {
      'patient-video-sidebar-no-skeleton': this.isDisabledSkeletonVideo,
      'patient-video-sidebar': !this.isDisabledSkeletonVideo,
    };
    return classes;
  }

  setPatientCanvasClasses() {
    const classes = {
      'hide-video': !this.receivedRemoteVideo,
      'patient-video-full-screen-swapped-canvas': this.isSwappedScreens && !this.isSplitScreenView,
      'patient-canvas': !this.isSwappedScreens && !this.isSplitScreenView,
      'patient-canvas-split-screen': !this.isSwappedScreens && this.isSplitScreenView,
      'patient-video-full-screen-swapped-canvas-split-screen': this.isSwappedScreens && this.isSplitScreenView,
    };
    return classes;
  }

  handleFullScreenVideoSession() {
    if (!this.dragging && !this.isSwappedScreens && !this.isSplitScreenView) {
      this.handleVideoSessionView.emit();
    } else {
      this.dragging = false;
    }
  }

  toggleEnlargeVideo() {
    if (!this.dragging && !this.isSwappedScreens && !this.isSplitScreenView) {
      this.enlargeVideo = !this.enlargeVideo;
      this.appActions.toggleEnlargeVideo(this.enlargeVideo);
      this.enlargeVideoChanged.emit({ peerId: this.therapistPatientConnection.peer, enlargeVideo: this.enlargeVideo });
    } else {
      this.dragging = false;
    }
  }

  rotateVideo(rotationAngle) {
    this.videoRotation += rotationAngle;
  }

  handleDragStart() {
    this.dragging = true;
  }

  rotatePatientVideo = (id) => {
    const videoWrapper = document.getElementById(id);
    this.patientRotation += 90;
    this.patientRotation = this.patientRotation % 360;
    if (videoWrapper) {
      videoWrapper.style.transform = `rotate(${this.patientRotation}deg)`;
      const roatationImage = document.getElementById(
        'patient-video-roatation-img-' + this.therapistPatientConnection.peer
      );
      if (roatationImage) {
        roatationImage.className = 'swap-screen-button';
        switch (this.patientRotation) {
          case 0:
            roatationImage.className += ' no-rotation';
            break;
          case 90:
            roatationImage.className += ' image-90-rotation';
            break;
          case 180:
            roatationImage.className += ' image-180-rotation';
            break;
          case 270:
            roatationImage.className += ' image-270-rotation';
            break;
          default:
            break;
        }
      }
    }
  };

  private initializePoseModels() {
    if (!this.shouldRenderSkeleton()) {
      return;
    }
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
    this.cameraPose.setOptions(poseOptions);

    this.cameraPose.onResults((results: Results) => {
      const canvasEl = this.canvasRef?.nativeElement as HTMLCanvasElement | undefined;      
      if (!this.canvasRef || !this.canvasRef.nativeElement) return;
      this.onPoseCameraResults(results, canvasEl);
    });

    // this.patientVideo.nativeElement.onloadeddata = () => {
    //   this.processVideoFrames();
    // };
  }

  
  private async processVideoFrames(video: HTMLVideoElement) {

    const renderFrame = async () => {
  
      if (this.isDestroyed) return;
  
      // 🔐 DOM safety
      if (!this.patientVideo || !this.patientVideo.nativeElement) return;
  
      if (!video.paused && !video.ended && this.cameraPose) {
        try {
          await this.cameraPose.send({ image: video });
        } catch (e) {
          console.error('MediaPipe error:', e);
        }
      }
  
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };
  
    renderFrame();
    if (this.shouldRenderSkeleton()) {
      this.hideVideo = true;
    }
  }
  

  private onPoseCameraResults(
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

      if (results.poseLandmarks && this.joints.length > 0 && this.connections.length > 0) {
        results.poseLandmarks.forEach((landmark, index) => {
          const poseData = this.joints.filter(c => c.index === index);
          if (poseData.length > 0 ) {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasElement.width,
              landmark.y * canvasElement.height,
              7,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = poseData[0].color;
            canvasCtx.fill();
          }
        });

        // POSE_CONNECTIONS.forEach(([start, end]) => {
        //   const poseData = this.connections.filter(c => c.start === start && c.end === end);
        //   if (poseData.length > 0 && start === poseData[0].start && end === poseData[0].end) {
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
        //     canvasCtx.strokeStyle = poseData[0].color;
        //     canvasCtx.stroke();
        //   }
        // });
      }
    }
  }

  /**
   * Force re-assignment of remote stream to the current video element.
   * Call whenever view switches or activeCallStream changes.
   */
  private reassignStreamToVideoElement(): void {
    if (!this.activeCallStream || !this.therapistPatientConnection) {
      return;
    }

    const element = (this.patientVideo?.nativeElement as HTMLVideoElement) ||
      (document.getElementById(`patient-video-${this.therapistPatientConnection.peer}`) as HTMLVideoElement | null);

    if (!element) {
      console.warn(`[${this.therapistPatientConnection?.peer}] Remote video element not found (patientVideo ViewChild or id)`);
      return;
    }

    this.remoteVideo = element;
    try {
      console.log(`[${this.therapistPatientConnection.peer}] Re-assigning remote stream to video element`);
    } catch {}
    this.remoteVideo.srcObject = this.activeCallStream;
    this.remoteStream = this.activeCallStream;
    this.remoteVideo.volume = this.volume / 100;

    this.remoteVideo.onloadeddata = () => {
      // Adjust styling for vertical videos
      const isVertical = this.remoteVideo.videoHeight > this.remoteVideo.videoWidth;
      if (isVertical) {
        this.remoteVideo.style.cssText += 'object-fit: contain;background: black';
      }
      this.remoteVideo.play().catch((err) => {
        console.error(`[${this.therapistPatientConnection?.peer}] Remote play error:`, err);
      });
    };

    // If already loaded, play immediately
    if (this.remoteVideo.readyState >= 2) {
      this.remoteVideo.play().catch((err) => {
        console.error(`[${this.therapistPatientConnection?.peer}] Remote play error:`, err);
      });
    }

    // Monitor remote stream tracks
    try {
      this.activeCallStream.getTracks().forEach((track) => {
        console.log(`[${this.therapistPatientConnection?.peer}] Track`, {
          kind: track.kind,
          readyState: track.readyState,
          enabled: track.enabled,
        });
        track.onended = () => console.error(`[${this.therapistPatientConnection?.peer}] ${track.kind} track ended`);
        if (typeof (track as any).onmute !== 'undefined') {
          (track as any).onmute = () => console.warn(`[${this.therapistPatientConnection?.peer}] ${track.kind} track muted`);
        }
        if (typeof (track as any).onunmute !== 'undefined') {
          (track as any).onunmute = () => console.warn(`[${this.therapistPatientConnection?.peer}] ${track.kind} track unmuted`);
        }
      });
    } catch {}

    // Start playback watchdog
    this.startPlaybackWatchdog();
  }

  /**
   * Re-assign local stream to its video element and ensure playback.
   */
  private reassignLocalStreamToVideoElement(): void {
    if (!this.localStream || !this.therapistPatientConnection) {
      return;
    }
    this.localVideo = (this.localVideoRef?.nativeElement as HTMLVideoElement) ||
      (document.getElementById(`local-video-${this.therapistPatientConnection.peer}`) as HTMLVideoElement | null);
    if (this.localVideo) {
      try {
        console.log(`[${this.therapistPatientConnection.peer}] Re-assigning local stream to video element`);
      } catch {}
      this.localVideo.srcObject = this.localStream;
      this.localVideo.muted = true;
      this.localVideo.onloadeddata = () => {
        this.localVideo.play().catch((err) => {
          console.error(`[${this.therapistPatientConnection?.peer}] Local play error:`, err);
        });
      };
      if (this.localVideo.readyState >= 2) {
        this.localVideo.play().catch((err) => {
          console.error(`[${this.therapistPatientConnection?.peer}] Local play error:`, err);
        });
      }
    } else {
      console.warn(`[${this.therapistPatientConnection?.peer}] Local video element not found (localVideoRef or id)`);
    }
  }

  /**
   * Watchdog to ensure the video is advancing. If stalled, try to recover.
   */
  private startPlaybackWatchdog(): void {
    if (!this.remoteVideo) return;
    if (this.playbackWatchdog) {
      clearInterval(this.playbackWatchdog);
      this.playbackWatchdog = null;
    }

    this.lastPlaybackTime = this.remoteVideo.currentTime || 0;
    this.playbackWatchdog = setInterval(() => {
      if (!this.remoteVideo) return;
      const current = this.remoteVideo.currentTime || 0;
      const advanced = current > this.lastPlaybackTime;
      this.lastPlaybackTime = current;

      // If not advancing and not paused, try to nudge playback
      if (!advanced) {
        try {
          console.warn(`[${this.therapistPatientConnection?.peer}] Playback stalled, attempting recovery`);
        } catch {}
        // Re-attach stream and force play
        this.reassignStreamToVideoElement();
        setTimeout(() => {
          if (this.remoteVideo && this.remoteVideo.paused) {
            this.remoteVideo.play().catch(() => {});
          }
        }, 50);
      }
    }, 2000);
  }

  /**
   * Attach ICE/connection state monitoring if RTCPeerConnection is accessible.
   */
  private wireIceMonitoring(): void {
    if (this.iceMonitoringWired) return;
    const conn: any = this.therapistPatientConnection;
    if (!conn) return;

    const pc: any =
      (conn.peerConnection) ||
      (conn.call && conn.call.peerConnection) ||
      (conn._pc) ||
      null;

    if (pc && typeof pc.addEventListener === 'function') {
      try {
        pc.addEventListener('iceconnectionstatechange', () => {
          console.log(`[${this.therapistPatientConnection?.peer}] ICE state:`, pc.iceConnectionState);
        });
        pc.addEventListener('connectionstatechange', () => {
          console.log(`[${this.therapistPatientConnection?.peer}] PC state:`, pc.connectionState);
        });
        pc.addEventListener('signalingstatechange', () => {
          console.log(`[${this.therapistPatientConnection?.peer}] Signaling:`, pc.signalingState);
        });
        pc.addEventListener('icegatheringstatechange', () => {
          console.log(`[${this.therapistPatientConnection?.peer}] ICE gathering:`, pc.iceGatheringState);
        });
        this.iceMonitoringWired = true;
      } catch (e) {
        console.warn('Failed to wire ICE monitoring', e);
      }
    }
  }

}
