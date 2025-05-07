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
  patientRotation = 0;
  enlargeVideo = false;
  hideVideo = false;
  subscription: Subscription = new Subscription();
  joints = [];
  connections = [];
  sliderValue: number = 0;
  thumbUpValue: number = 0;
  showThumbUp: boolean = false;

  constructor(private webRtcService: WebRtcService, private appActions: AppActions, private skeletonService: SkeletonService, private skeltonProgressBarService: SkeletonProgressBarService) {
    this.initialize();
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

    if (connection && connection.previousValue !== connection.currentValue) {
      this.therapistPatientConnection = connection.currentValue;
    }

    if (call && call.currentValue && call.previousValue !== call.currentValue) {
      this.activeCallStream = call.currentValue;
      if (this.activeCallStream) {
        this.receivedRemoteVideo = true;
      } else {
        this.receivedRemoteVideo = false;
      }
    }

    if (localStream && localStream.previousValue !== localStream.currentValue) {
      this.localStream = localStream.currentValue;
      this.localVideo = document.getElementById(`local-video-${this.therapistPatientConnection.peer}`);
      if (this.localVideo && this.localStream) {
        this.localVideo.srcObject = this.localStream;
        this.localVideo.muted = true;
        this.localVideo.onloadeddata = (e) => {
          this.localVideo.play();
        };
      }
    }

    if (this.remoteVideo) {
      this.remoteVideo.volume = this.volume / 100;
    }
  }

  ngAfterViewInit() {
    this.remoteVideo = document.getElementById(`patient-video-${this.therapistPatientConnection.peer}`);
    this.remoteVideo.volume = this.volume / 100;
    this.localVideo = document.getElementById(`local-video-${this.therapistPatientConnection.peer}`);

    if (this.localVideo && !isVideoPlaying(this.localVideo) && this.localStream) {
      this.localVideo.srcObject = this.localStream;
      this.localVideo.muted = true;
      this.localVideo.onloadeddata = (e) => {
        this.localVideo.play();
      };
    }
    if (this.remoteVideo) {
      this.handleCall();
    }
  }

  ngOnDestroy() {
    if (this.enlargeVideo) {
      this.toggleEnlargeVideo();
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
    this.initializePoseModels();
    this.remoteVideo.srcObject = this.activeCallStream;
    this.remoteStream = this.activeCallStream;
    this.remoteVideo.onloadeddata = (e) => {
      let isVertical = false;
      if (this.remoteVideo.videoHeight > this.remoteVideo.videoWidth) {
        isVertical = true;
      }
      if (isVertical) {
        this.remoteVideo.style.cssText += 'object-fit: contain;background: black';
      }
      this.remoteVideo.play();
      this.receivedRemoteVideo = true;
      this.handleStreamSending.emit();
      this.processVideoFrames();
    };
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
      this.onPoseCameraResults(results, this.canvasRef.nativeElement);
    });

    // this.patientVideo.nativeElement.onloadeddata = () => {
    //   this.processVideoFrames();
    // };
  }

  private async processVideoFrames() {
    const video = this.patientVideo.nativeElement;
    const renderFrame = async () => {
      if (video.paused || video.ended) return;
      await this.cameraPose.send({ image: video });
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
    this.hideVideo = true
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
          if (this.joints.includes(index)) {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasElement.width,
              landmark.y * canvasElement.height,
              7,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = 'rgba(255, 255, 255)';
            canvasCtx.fill();
          }
        });

        POSE_CONNECTIONS.forEach(([start, end]) => {
          const poseData = this.connections.filter(c => c.start === start && c.end === end);
          if (poseData.length > 0 && start === poseData[0].start && end === poseData[0].end) {
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
            canvasCtx.strokeStyle = poseData[0].color;
            canvasCtx.stroke();
          }
        });
      }
    }
  }

}
