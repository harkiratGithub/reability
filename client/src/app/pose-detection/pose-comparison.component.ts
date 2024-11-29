import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS, Results } from '@mediapipe/pose';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-pose-comparison',
  templateUrl: './pose-comparison.component.html',
  styleUrls: ['./pose-comparison.component.css'],
})
export class PoseComparisonComponent implements OnInit, AfterViewInit {
    @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('cameraElement') cameraElement!: ElementRef;
  @ViewChild('canvasElement1') canvasElement1!: ElementRef;
  @ViewChild('canvasElement2') canvasElement2!: ElementRef;
  private videoPose!: Pose;
  private cameraPose!: Pose;
  private camera!: Camera;
  private angleCalculationInterval = 5000; // 5 seconds
  private lastCalculationTime = 0;
  private lastYPositions: { [key: string]: number[] } = {
    leftWrist: [],
    rightWrist: [],
  };
  leftMatching = false;
  rightMatching = false;
  private peakDetectionThreshold = 0.01;
  private lastAngles: { [key: string]: number[] } = {
    leftWrist: [],
    rightWrist: [],
  };
  private peakLogged: { [key: string]: boolean } = {
    leftWrist: false,
    rightWrist: false,
  };
  public minVideoAngle: { [key: string]: number } = {
    leftWrist: Infinity,
    rightWrist: Infinity,
  };
  public maxVideoAngle: { [key: string]: number } = {
    leftWrist: -Infinity,
    rightWrist: -Infinity,
  };
  public cameraAngle: { [key: string]: number } = {
    leftWrist: Infinity,
    rightWrist: Infinity,
  };
  public videoAngle: { [key: string]: number } = {
    leftWrist: Infinity,
    rightWrist: Infinity,
  };
  public minCameraAngle: { [key: string]: number } = {
    leftWrist: Infinity,
    rightWrist: Infinity,
  };
  public maxCameraAngle: { [key: string]: number } = {
    leftWrist: -Infinity,
    rightWrist: -Infinity,
  };
  private matchingData: { timestamp: string; wrist: string; status: string }[] = [];
  private csvFilePath = 'matching_results.xlsx';

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    console.log('PoseComparisonComponent initialized');
    // this.initializePoseModels();
    // this.initializeCamera();
  }

  ngAfterViewInit(): void {
    this.initializePoseModels();
    this.initializeCamera();
  }

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

  private initializePoseModels() {
    this.videoPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
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
    this.videoPose.setOptions(poseOptions);
    this.cameraPose.setOptions(poseOptions);

    this.videoPose.onResults((results: Results) => {
      this.onPoseVideoResults(results, this.canvasElement1.nativeElement);
    });
    this.cameraPose.onResults((results: Results) => {
      this.onPoseCameraResults(results, this.canvasElement2.nativeElement);
    });

    this.videoElement.nativeElement.onloadeddata = () => {
      this.processVideoFrames();
    };
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
    this.camera = new Camera(this.cameraElement.nativeElement, {
      onFrame: async () => {
        await this.cameraPose.send({ image: this.cameraElement.nativeElement });
      },
      width: 640,
      height: 480,
    });
    this.camera.start();
  }

  private calculateAngleBetweenPoints(
    A: { x: number; y: number; z: number },
    B: { x: number; y: number; z: number }
  ): number {
    const vectorAB = { x: B.x - A.x, y: B.y - A.y };
    const verticalVector = { x: 0, y: 1 };

    const dotProduct =
      vectorAB.x * verticalVector.x + vectorAB.y * verticalVector.y;

    const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);
    const magnitudeVertical = Math.sqrt(
      verticalVector.x ** 2 + verticalVector.y ** 2
    );

    const angleInRadians = Math.acos(
      dotProduct / (magnitudeAB * magnitudeVertical)
    );
    return angleInRadians * (180 / Math.PI);
  }

  private onPoseVideoResults(
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

      if (results.poseLandmarks) {
        const leftShoulder = results.poseLandmarks[11];
        const leftWrist = results.poseLandmarks[15];
        const rightShoulder = results.poseLandmarks[12];
        const rightWrist = results.poseLandmarks[16];

        // Calculate angles for left and right wrists
        const leftAngle = this.calculateAngleBetweenPoints(
          { x: leftShoulder.x, y: leftShoulder.y, z: leftShoulder.z },
          { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z }
        );

        const rightAngle = this.calculateAngleBetweenPoints(
          { x: rightShoulder.x, y: rightShoulder.y, z: rightShoulder.z },
          { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z }
        );

        // Update min and max only if source is video
        if (leftAngle < this.minVideoAngle['leftWrist'])
          this.minVideoAngle['leftWrist'] = leftAngle;
        if (leftAngle > this.maxVideoAngle['leftWrist'])
          this.maxVideoAngle['leftWrist'] = leftAngle;
        if (rightAngle < this.minVideoAngle['rightWrist'])
          this.minVideoAngle['rightWrist'] = rightAngle;
        if (rightAngle > this.maxVideoAngle['rightWrist'])
          this.maxVideoAngle['rightWrist'] = rightAngle;
        this.videoAngle['leftWrist'] = leftAngle;
        this.videoAngle['rightWrist'] = rightAngle;
        const tolerance = 3;
        

        if (Math.abs(leftAngle - 90) <= 1) {
          this.recordMatch(leftAngle, 'leftWrist', 'Matched at 90 degrees', '90-degree');
        }

        if (Math.abs(rightAngle - 90) <= 1) {
          this.recordMatch(rightAngle, 'rightWrist', 'Matched at 90 degrees', '90-degree');
        }

        const withinTolerance = (
          angle: number,
          target: number,
          tolerance: number
        ) => angle >= target - tolerance && angle <= target + tolerance;

        if (
          withinTolerance(leftAngle, this.minVideoAngle['leftWrist'], tolerance)
        ) {
          this.leftMatching = withinTolerance(
            this.cameraAngle['leftWrist'],
            this.minVideoAngle['leftWrist'],
            tolerance
          );
          if (this.leftMatching) {
            this.recordMatch(leftAngle, 'leftWrist', 'Left Wrist is matching the video angle', 'min');
          }
        }

        if (
          withinTolerance(leftAngle, this.maxVideoAngle['leftWrist'], tolerance)
        ) {
          this.leftMatching = withinTolerance(
            this.cameraAngle['leftWrist'],
            this.maxVideoAngle['leftWrist'],
            tolerance
          );
          if (this.leftMatching) {
            this.recordMatch(leftAngle, 'leftWrist', 'Left Wrist is matching the video angle', 'max');
          }
        }

        if (
          withinTolerance(
            rightAngle,
            this.minVideoAngle['rightWrist'],
            tolerance
          )
        ) {
          this.rightMatching = withinTolerance(
            this.cameraAngle['rightWrist'],
            this.minVideoAngle['rightWrist'],
            tolerance
          );
          if (this.rightMatching) {
            this.recordMatch(rightAngle, 'rightWrist', 'Right Wrist is matching the video angle', 'min');
          }
        }

        if (
          withinTolerance(
            rightAngle,
            this.maxVideoAngle['rightWrist'],
            tolerance
          )
        ) {
          this.rightMatching = withinTolerance(
            this.cameraAngle['rightWrist'],
            this.maxVideoAngle['rightWrist'],
            tolerance
          );
          if (this.rightMatching) {
            this.recordMatch(rightAngle, 'rightWrist', 'Right Wrist is matching the video angle', 'max');
          }
        }

        this.cdr.detectChanges();
       

        // Additional code to draw pose landmarks and connections on the canvas
        results.poseLandmarks.forEach((landmark) => {
          canvasCtx.beginPath();
          canvasCtx.arc(
            landmark.x * canvasElement.width,
            landmark.y * canvasElement.height,
            5,
            0,
            2 * Math.PI
          );
          canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
          canvasCtx.fill();
        });

        POSE_CONNECTIONS.forEach(([start, end]) => {
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
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
          canvasCtx.stroke();
        });
      }
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

      if (results.poseLandmarks) {
        const leftShoulder = results.poseLandmarks[11];
        const leftWrist = results.poseLandmarks[15];
        const rightShoulder = results.poseLandmarks[12];
        const rightWrist = results.poseLandmarks[16];
        console.log(leftShoulder);

        // Calculate angles for left and right wrists
        const leftAngle = this.calculateAngleBetweenPoints(
          { x: leftShoulder.x, y: leftShoulder.y, z: leftShoulder.z },
          { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z }
        );

        const rightAngle = this.calculateAngleBetweenPoints(
          { x: rightShoulder.x, y: rightShoulder.y, z: rightShoulder.z },
          { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z }
        );

    
        this.cameraAngle['leftWrist'] = leftAngle;
        this.cameraAngle['rightWrist'] = rightAngle;

        this.cdr.detectChanges();

    

        // Additional code to draw pose landmarks and connections on the canvas
        results.poseLandmarks.forEach((landmark) => {
          canvasCtx.beginPath();
          canvasCtx.arc(
            landmark.x * canvasElement.width,
            landmark.y * canvasElement.height,
            5,
            0,
            2 * Math.PI
          );
          canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
          canvasCtx.fill();
        });

        POSE_CONNECTIONS.forEach(([start, end]) => {
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
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
          canvasCtx.stroke();
        });
      }
    }
  }

  private updateAngleHistory(key: string, angle: number) {
    const maxHistory = 3;
    if (!this.lastAngles[key]) {
      this.lastAngles[key] = [];
    }
    if (this.lastAngles[key].length >= maxHistory) {
      this.lastAngles[key].shift();
    }
    this.lastAngles[key].push(angle);
  }

  private isAnglePeak(key: string): boolean {
    const angles = this.lastAngles[key];
    if (angles.length < 3) return false;

    const [prev, current, next] = angles;
    return (
      (current > prev && current > next) || (current < prev && current < next)
    );
  }

  private updateYPositionHistory(key: string, newY: number) {
    const maxHistory = 3;
    if (!this.lastYPositions[key]) {
      this.lastYPositions[key] = [];
    }
    if (this.lastYPositions[key].length >= maxHistory) {
      this.lastYPositions[key].shift();
    }
    this.lastYPositions[key].push(newY);
  }

  private isPeakPosition(key: string): boolean {
    const positions = this.lastYPositions[key];
    console.log(`${key} ${positions}`);

    if (positions.length < 3) return false;

    // Check if the middle position is a peak (either max or min)
    const [prev, current, next] = positions;
    return (
      (current > prev && current > next) || (current < prev && current < next)
    );
  }
}
