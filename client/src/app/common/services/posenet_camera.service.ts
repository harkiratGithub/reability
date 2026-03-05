import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Pose } from '@mediapipe/pose/pose.js';
import { drawLandmarks } from '@mediapipe/drawing_utils/drawing_utils.js';
import { Camera } from '@mediapipe/camera_utils/camera_utils.js';
import { throttle, isNil } from 'lodash';

@Injectable({ providedIn: 'root' })
export class WebCamSkeletonService {
  private currentSkeletonFromWebCamSubject: BehaviorSubject<any>;
  public currentSkeletonFromWebCamBuffer: Observable<any>;
  smoothFactor = 0.8; // Amount of basic smoothing, between 0 - 1
  smoothPrevPose;
  smoothPrevPoses = [];
  loopActive;
  videoElement;
  net;
  camera;
  canvasElement;
  canvasCtx;
  firstRun;
  FRAME_PROCESS_INTERVAL = 100;
  modelInitialized = false;

  constructor() {
    this.currentSkeletonFromWebCamSubject = new BehaviorSubject<any>([]);
    this.currentSkeletonFromWebCamBuffer = this.currentSkeletonFromWebCamSubject.asObservable();
  }

  async bindPage(video, firstRun = false) {
    if (!this.net) {
      this.initializeModel();
    }

    while (!this.modelInitialized) {}

    this.firstRun = firstRun;
    this.loopActive = true;

    try {
      video = await this.loadVideo(video);
    } catch (e) {
      let info = document.getElementById('info');
      info.textContent = 'this browser does not support video capture,' + 'or this device does not have a camera';
      info.style.display = 'block';
      throw e;
    }
    this.detectPoseInRealTime(video, this.net);
  }

  detectPoseInRealTime = async (videoElement, net) => {
    this.canvasElement = document.getElementById('patient-canvas');
    this.canvasCtx = (this.canvasElement as HTMLCanvasElement).getContext('2d');
    net.onResults(this.onResults);
    const callback = throttle(this.throttleSkeleton, this.FRAME_PROCESS_INTERVAL, { trailing: false });
    if (!this.camera) {
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          await callback({ image: videoElement });
        },
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
    }
    this.camera.start();
  };

  throttleSkeleton = async (data) => {
    await this.net.send(data);
  };

  async loadVideo(video) {
    this.videoElement = video;
    (this.videoElement as HTMLVideoElement).play();

    return this.videoElement;
  }

  onResults = (results) => {
    if (this.loopActive && results.poseLandmarks) {
      this.currentSkeletonFromWebCamSubject.next(results.poseLandmarks);
      this.removeLandmarks(results);

      this.canvasCtx.save();
      this.canvasCtx.scale(-1, 1);
      this.canvasCtx.translate(-this.canvasElement.width, 0);
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
      drawLandmarks(this.canvasCtx, results.poseLandmarks, { color: 'white', lineWidth: 1, radius: 2 });
      this.canvasCtx.restore();
    }
    if (this.firstRun && results.poseLandmarks) {
      this.firstRun = false;
      this.stopPage();
    }
  };

  stopPage() {
    this.loopActive = false;
    this.camera.video.pause();
    setTimeout(() => {
      this.currentSkeletonFromWebCamSubject.next(undefined);
    }, 100);
  }

  removeLandmarks = (results) => {
    const renderedIndexs = [0, 11, 12, 13, 15, 14, 16, 23, 24, 25, 26, 27, 28];
    if (results.poseLandmarks) {
      results.poseLandmarks = results.poseLandmarks.filter((res, index) => renderedIndexs.includes(index));
    }
  };

  removeElements = (landmarks, elements) => {
    for (const element of elements) {
      delete landmarks[element];
    }
  };

  initializeModel = async () => {
    if (!this.net) {
      this.net = new Pose({
        locateFile: (file) => {
          return `assets/pose/${file}`;
        },
      });
      this.net.setOptions({
        modelComplexity: 1,
        selfieMode: true,
        upperBodyOnly: false,
        smoothLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      this.modelInitialized = true;
    }
  };

  isWEBGL2Available = (): boolean => {
    const context = document.createElement('canvas').getContext('webgl2');
    return !isNil(context);
  };
}
