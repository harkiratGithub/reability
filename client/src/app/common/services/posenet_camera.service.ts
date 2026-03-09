import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Pose } from '@mediapipe/pose/pose.js';
import { drawLandmarks } from '@mediapipe/drawing_utils/drawing_utils.js';
import { Camera } from '@mediapipe/camera_utils/camera_utils.js';
import { throttle, isNil } from 'lodash';

@Injectable({ providedIn: 'root' })
export class WebCamSkeletonService {
  private currentSkeletonFromWebCamSubject: BehaviorSubject<any>;
  public currentSkeletonFromWebCamBuffer: Observable<any>; // landmarks only
  private currentFullResultsSubject: BehaviorSubject<any>; // new: full results
  public currentFullResults$: Observable<any>; // expose full results

  smoothFactor = 0.8;
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

    // ✅ Initialize full results subject
    this.currentFullResultsSubject = new BehaviorSubject<any>(null);
    this.currentFullResults$ = this.currentFullResultsSubject.asObservable();
  }

  async bindPage(video, firstRun = false, canvasId = 'patient-canvas') {
    
    
    if (!this.net) {
      await this.initializeModel();
    }

    while (!this.modelInitialized) { 
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.firstRun = firstRun;
    this.loopActive = true;

    try {
      video = await this.loadVideo(video);
    } catch (e) {
      const info = document.getElementById('info');
      info.textContent = 'this browser does not support video capture,' + 'or this device does not have a camera';
      info.style.display = 'block';
      throw e;
    }
    this.detectPoseInRealTime(video, this.net, canvasId);
  }

  detectPoseInRealTime = async (videoElement, net, canvasId = 'patient-canvas') => {
    this.canvasElement = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!this.canvasElement) {
      console.warn(`[POSE] Canvas not found: ${canvasId}, skipping pose detection`);
      return;
    }
    this.canvasCtx = this.canvasElement.getContext('2d');
    if (!this.canvasCtx) {
      console.warn(`[POSE] Could not get 2d context for canvas: ${canvasId}`);
      return;
    }
    net.onResults(this.onResults);
    // console.log(`[POSE] Binding page with canvas ID33: ${canvasId}`);
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

    // console.log(`[POSE] Binding page with canvas ID44: ${canvasId}`);
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
    if (this.loopActive && this.canvasElement && this.canvasCtx) {
      // ✅ Emit full results
      this.currentFullResultsSubject.next(results);

      // ✅ Emit pose landmarks if available
      if (results.poseLandmarks) {
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
    }
  };

  stopPage() {
    this.loopActive = false;
    if (this.camera?.video) this.camera.video.pause();
    setTimeout(() => {
      this.currentSkeletonFromWebCamSubject.next(undefined);
      this.currentFullResultsSubject.next(undefined);
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
        locateFile: (file) => `assets/pose/${file}`,
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
