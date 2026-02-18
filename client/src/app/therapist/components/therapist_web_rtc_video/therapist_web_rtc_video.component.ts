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
import { PatientScoreService } from 'src/app/common/services/patient-score.service';

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
  @Input() isPatientScreenSharing: boolean;
  @Input() currentGameName: string;
  @Output() handleVideoSessionView = new EventEmitter();
  @Output() handleStreamSending = new EventEmitter();
  @Output() handlePatientVideo = new EventEmitter();
  @Output() enlargeVideoChanged = new EventEmitter<IEnlargeVideoMessage>();
  @ViewChild('patientVideo') patientVideo!: ElementRef;
  @ViewChild('canvasRef') canvasRef!: ElementRef;
  private cameraPose!: Pose;
  gameScoreSummaryData: any = [];
  // Individual score data for this specific patient
  individualPatientScoreData: any = [];
  @Output() gameSelected = new EventEmitter<any>();

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
  sliderValue: number = 0;
  thumbUpValue: number = 0;
  showThumbUp: boolean = false;
  currentCompensationMessage: string | null = null;
  private compensationTimeout: any = null;
  constructor(private webRtcService: WebRtcService, private appActions: AppActions, private skeletonService: SkeletonService, private skeltonProgressBarService: SkeletonProgressBarService , private patientScoreService: PatientScoreService) {
    this.initialize();
  }

  // gameScoreSummaryData = [
  //   {
  //     round: 0,
  //     score: 88,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 1,
  //     score: 57,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 2,
  //     score: 62,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 3,
  //     score: 47,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 4,
  //     score: 67,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 5,
  //     score: 87,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 6,
  //     score: 64,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 7,
  //     score: 87,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 8,
  //     score: 57,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 9,
  //     score: 67,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  //   {
  //     round: 10,
  //     score: 88,
  //     clipId: 'P017',
  //     summary:
  //       "Congratulations! You have completed this exercise. Your side movement performance shows consistent effort with timestamps reflecting your progress. While there are areas for improvement, the movements are becoming more fluid. Keep focusing on your form to minimize compensations. Overall, you've achieved a score of 7%, and I believe in your ability to enhance your skills!",
  //     clipName: 'Shoulder abduction/wall angels',
  //     settings: 'Easy',
  //     CheckpointsArray: [
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 6.7,
  //         PatientTimestamp: '6.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 11.4,
  //         PatientTimestamp: '11.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 30,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 16.4,
  //         PatientTimestamp: '16.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 29,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 20.2,
  //         PatientTimestamp: '20.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Good',
  //             ClipType: 'peaks',
  //             Condition: 'Good',
  //             PatientDeg: 162,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 24.2,
  //         PatientTimestamp: '24.2',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 29.6,
  //         PatientTimestamp: '29.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 33,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 33.6,
  //         PatientTimestamp: '33.6',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 38.9,
  //         PatientTimestamp: '38.9',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 32,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 43.5,
  //         PatientTimestamp: '43.5',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 27,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 48,
  //         PatientTimestamp: '48',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 26,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 52.7,
  //         PatientTimestamp: '52.7',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 20,
  //             Comment: 'Not Good',
  //             ClipType: 'deeps',
  //             Condition: 'Not Good',
  //             PatientDeg: 28,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 57.4,
  //         PatientTimestamp: '57.4',
  //       },
  //       {
  //         Analysis: [
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [24, 12, 14],
  //           },
  //           {
  //             ClipDeg: 160,
  //             Comment: 'Not Good',
  //             ClipType: 'peaks',
  //             Condition: 'Not Good',
  //             PatientDeg: 25,
  //             ClipLandmark: [23, 11, 13],
  //           },
  //         ],
  //         ClipTimestamp: 62.7,
  //         PatientTimestamp: '62.7',
  //       },
  //     ],
  //   },
  // ];

  onGameSelected(game: any) {
    console.log('Selected Game in Parent:', game);
  }

  ngOnInit() {
    this.subscription.add(
      this.enlargeVideo$.subscribe((enlargeVideo) => {
        this.enlargeVideo = enlargeVideo;
      })
    );

    this.subscription.add(
      this.skeltonProgressBarService.showProgressBarSummaryDataElement$.subscribe((value) => {
        this.gameScoreSummaryData = value;
      })
    );


    this.subscription.add(
      this.skeletonService.skeleton$.subscribe((data: any) => {
        if (data) {
          this.joints = data.joints;
        }
        // this.drawSkeleton(data.frame);
      })
    );

    this.subscription.add(
      this.skeltonProgressBarService.progressBarElement$.subscribe((value) => {
        if (+value > this.sliderValue || +value == 0) {
          this.sliderValue = +value;
        }
      })
    );

    this.subscription.add(
      this.skeltonProgressBarService.thumbUpElement$.subscribe((value) => {
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
      
          // Subscribe to patient-specific score data when connection is established
          if (this.therapistPatientConnection?.peer) {
            this.subscription.add(
              this.patientScoreService.getPatientScoreData(this.therapistPatientConnection.peer).subscribe((scoreData) => {
                this.individualPatientScoreData = scoreData;
              })
            );
          }
    }

    if (connection && connection.currentValue) {
      this.therapistPatientConnection = connection.currentValue;
  
      this.therapistPatientConnection.on('data', (data: any) => {
        try {
          if (data.type === 'compensation_msg_alerts') {
            console.log("📩 Therapist received compensation alert:", data.message);
  
            // ✅ Show message
            this.currentCompensationMessage = data.message;
  
            // ✅ Clear any previous timer
            if (this.compensationTimeout) clearTimeout(this.compensationTimeout);
  
            // ✅ Remove after 5s if no new message arrives
            this.compensationTimeout = setTimeout(() => {
              this.currentCompensationMessage = null;
            }, 5000);
          }
        } catch (e) {
          console.warn("Failed to parse incoming data:", data, e);
        }
      });
    }
  

    if (call && call.currentValue && call.previousValue !== call.currentValue) {
      this.activeCallStream = call.currentValue;
      if (this.activeCallStream) {
        this.receivedRemoteVideo = true;
        // Always ensure regular patient video element is visible
        if (this.remoteVideo) {
          this.remoteVideo.style.display = '';
          this.remoteVideo.style.visibility = '';
          this.remoteVideo.style.opacity = '';
        }
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
    if (this.compensationTimeout) clearTimeout(this.compensationTimeout); // ✅ cleanup
    this.subscription.unsubscribe();
  }

  initialize() {
    this.therapistPeer = this.webRtcService.getTherapistPeer();
  }

  togglePatientVideo() {
    this.handlePatientVideo.emit();
  }

  handleCall() {
    // Always attach the patient's stream to the regular video element
    this.initializePoseModels();
    if (!this.remoteVideo) {
      console.warn(`[GRILL] ⚠️ remoteVideo element not found`);
      return;
    }
    
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
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
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
    this.hideVideo = true;
  }

  private onPoseCameraResults(results: Results, canvasElement: HTMLCanvasElement) {
    const canvasCtx = canvasElement.getContext('2d');
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.poseLandmarks && this.joints.length > 0) {
        results.poseLandmarks.forEach((landmark, index) => {
          const poseData = this.joints.filter((c) => c.index === index);
          if (poseData.length > 0 && poseData.includes(index)) {
            canvasCtx.beginPath();
            canvasCtx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 7, 0, 2 * Math.PI);
            canvasCtx.fillStyle = poseData[0].color;
            canvasCtx.fill();
          }
        });
      }
    }
  }

  // Get unique color for this patient's scorebar
  getPatientScorebarColor(): string {
    const peer = this.therapistPatientConnection?.peer;
    if (!peer) return '#007bff';
    
    // Generate consistent color based on patient peer ID
    const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
    const hash = peer.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  // Get unique styling for this patient's scorebar
  getPatientScorebarStyle(): any {
    const color = this.getPatientScorebarColor();
    return {
      'border-color': color,
      'background-color': color + '20',
      'border-radius': '8px',
      'border-width': '2px',
      'border-style': 'solid'
    };
  }

  // Get class names for patient scorebar
  getPatientScorebarClasses(): any {
    const patientId = this.therapistPatientConnection?.peer || 'default';
    return {
      'split-screen-mode': this.isSplitScreenView,
      [`patient-${patientId}-scorebar`]: true
    };
  }

  // Get class names for fullscreen scorebar
  getFullscreenScorebarClasses(): string {
    const patientId = this.therapistPatientConnection?.peer || 'default';
    return `fullscreen-scorebar-${patientId} patient-${patientId}-scorebar`;
  }

  getFullscreenScorebarStyle() {
    // Determine position based on patient's peer ID
    const peer = this.therapistPatientConnection?.peer;
    let position: any = {};
    
    if (peer) {
      // Simple logic: odd patient IDs go left, even go right
      const patientNumber = parseInt(peer.toString()) || 0;
      const isLeftPatient = patientNumber % 2 === 1;
      
      if (isLeftPatient) {
        // Left side patient - positioned inside container, right-aligned like right screen
        position = {
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '200px',
          'z-index': '9999',
          'margin-left': 'auto'
        };
      } else {
        // Right side patient - position on top-right
        position = {
          position: 'fixed',
          top: '50px',
          right: '20px',
          width: '200px',
          'z-index': '9999'
        };
      }
    } else {
      // Default positioning for single patient
      position = {
        position: 'fixed',
        top: '50px',
        right: '20px',
        width: '200px',
        'z-index': '9999'
      };
    }
    
    // Add patient-specific styling
    const color = this.getPatientScorebarColor();
    return {
      ...position,
      'border-color': color,
      'background-color': color + '20',
      'border-radius': '8px',
      'border-width': '2px',
      'border-style': 'solid'
    };
  }
}
