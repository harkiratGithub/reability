import { HttpClient } from '@angular/common/http';
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
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-pose-comparison',
  templateUrl: './pose-comparison.component.html',
  styleUrls: ['./pose-comparison.component.css'],
})
export class PoseComparisonComponent implements OnInit, AfterViewInit {
  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('videoIframe', { static: true }) videoIframe!: ElementRef;
  @ViewChild('cameraElement') cameraElement!: ElementRef;
  @ViewChild('canvasElement1') canvasElement1!: ElementRef;
  @ViewChild('canvasElement2') canvasElement2!: ElementRef;
  private videoPose!: Pose;
  private cameraPose!: Pose;
  private camera!: Camera;
  rightComment = '';
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
  private csvData: any[] = [];
  private currentFrameIndex: number = 0;
  private liveVideoData: { 'Min/Max': string; timestamp: string; Deg: string; }[] = [];
  // private matchingVideoData: { timestamp: string; 'LSA Deg': string; 'RSA Deg': string; }[] = [];
  private matchingVideoData: { timestamp: string; 'Deg': string; }[] = [];
  private matchingCameraData: { timestamp: string; 'LSA Deg': string; 'RSA Deg': string; }[] = [];
  private startTime: number;
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) { }

  ngOnInit(): void {
    console.log('PoseComparisonComponent initialized');
    // this.initializePoseModels();
    // this.initializeCamera();
    // this.loadCSVFromPath('assets/pose_metadata.csv');
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

  private loadCSVFromPath(filePath: string) {
    this.http.get(filePath, { responseType: 'text' }).subscribe(
      (data) => {
        Papa.parse(data, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            this.csvData = results.data; // Store CSV data
            // console.log('CSV Data Loaded:', this.csvData);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
          },
        });
      },
      (error) => {
        console.error('Error loading CSV:', error);
      }
    );
  }

  getCoordinatesForFrame(frameIndex: number) {
    if (frameIndex >= this.csvData.length) return null;

    const frameData = this.csvData.filter(row => row[0] === frameIndex);

    // Extract coordinates for each landmark
    const leftShoulder = frameData.find(row => row[2] === 'LEFT_SHOULDER');
    const rightShoulder = frameData.find(row => row[2] === 'RIGHT_SHOULDER');
    const leftWrist = frameData.find(row => row[2] === 'LEFT_WRIST');
    const rightWrist = frameData.find(row => row[2] === 'RIGHT_WRIST');

    // Return coordinates in the required format
    return {
      leftShoulder: leftShoulder ? { x: leftShoulder[3], y: leftShoulder[4], z: leftShoulder[5] } : null,
      rightShoulder: rightShoulder ? { x: rightShoulder[3], y: rightShoulder[4], z: rightShoulder[5] } : null,
      leftWrist: leftWrist ? { x: leftWrist[3], y: leftWrist[4], z: leftWrist[5] } : null,
      rightWrist: rightWrist ? { x: rightWrist[3], y: rightWrist[4], z: rightWrist[5] } : null,
    };
  }

  ngAfterViewInit(): void {
    this.initializePoseModels();
    this.initializeCamera();

    if (!this.startTime) {
      this.startTime = new Date().getTime(); // Save the initial timestamp
    }
  }

  private recordMatch(
    angle: number,
    wrist: string,
    status: string,
    angleType: 'min' | 'max' | '90-degree'
  ) {
    // Retrieve the current timestamp and existing data
    const timestamp = new Date().toISOString();
    const currentTimestamp = new Date().getTime();
    const toleranceMillis = 2000; // ±2 seconds tolerance
    let existingData = JSON.parse(localStorage.getItem('matchingData') || '[]');

    // Check if there's already an entry for the given wrist, angleType, and time window
    const existingEntry = existingData.find((entry: any) => {
      const entryTimestamp = new Date(entry.timestamp).getTime();
      return (
        Math.abs(entryTimestamp - currentTimestamp) <= toleranceMillis && // Check time tolerance
        entry.wrist === wrist &&
        entry.angleType === angleType
      );
    });

    if (!existingEntry) {
      // Save the new match only if it hasn't been recorded within the time tolerance
      const newEntry = { timestamp, wrist, status, angleType, angle };
      existingData.push(newEntry);

      // Save updated data back to localStorage
      localStorage.setItem('matchingData', JSON.stringify(existingData));
    }

    // Special case for a 90-degree angle match with ±1 degree tolerance
    if (angleType === '90-degree' && Math.abs(angle - 90) <= 1) {
      const ninetyDegreeEntry = existingData.find((entry: any) => {
        const entryTimestamp = new Date(entry.timestamp).getTime();
        return (
          Math.abs(entryTimestamp - currentTimestamp) <= toleranceMillis && // Check time tolerance
          entry.wrist === wrist &&
          entry.angleType === angleType
        );
      });

      if (!ninetyDegreeEntry) {
        const ninetyDegreeTimestamp = new Date().toISOString();
        const newNinetyDegreeEntry = {
          timestamp: ninetyDegreeTimestamp,
          wrist,
          status,
          angleType,
          angle,
        };
        existingData.push(newNinetyDegreeEntry);

        // Save updated data back to localStorage
        localStorage.setItem('matchingData', JSON.stringify(existingData));
      }
    }
  }

  generateCSV() {
    this.saveToCSV(this.matchingVideoData, 'video_matching_data.csv');
    this.saveToCSV(this.matchingCameraData, 'camera_matching_data.csv');

    const matchingClipData = this.getClipPatientData(this.matchingVideoData);
    // const matchingPatientData = this.getClipPatientData(this.matchingCameraData);
    console.log('matchingClipData', matchingClipData);
    // console.log('matchingPatientData', matchingPatientData);

    // const matchingData = this.calculateAllMinMaxComparisons(this.matchingVideoData, this.matchingCameraData);
    // // this.saveComparisonToCSV(matchingData);
    this.saveToCSV(matchingClipData.matchingData, 'clip_min_max_matches.csv');
    // this.saveToCSV(matchingPatientData.matchingData, 'patient_min_max_matches.csv');

    const results = this.matchClipAndPatientData(matchingClipData.matchingData, this.matchingCameraData);
    const updateComments = this.updateComments(results);
    this.saveToCSV(updateComments, 'min_max_matches.csv');
  }

  matchClipAndPatientData(matchingClipData: any[], matchingPatientData: any[]) {
    const results = [];
    const timeThreshold = 3; // Time difference threshold (seconds)
    const angleThreshold = 5; // Angle difference threshold

    // Loop through clip and patient data to find matches
    matchingClipData.forEach((clipEntry) => {
      const closestPatient = matchingPatientData.reduce(
        (closest, patientEntry) => {
          const timeDiff = Math.abs(+clipEntry.ClipTimestamp - +patientEntry.timestamp);
          const angleLeftDiff = Math.abs(clipEntry.ClipDeg - patientEntry['LSA Deg']);
          const angleRightDiff = Math.abs(clipEntry.ClipDeg - patientEntry['RSA Deg']);

          if (timeDiff <= timeThreshold) {
            if (!closest || angleRightDiff < closest.angleRightDiff || angleLeftDiff < closest.angleLeftDiff || ((angleRightDiff === closest.angleRightDiff || angleLeftDiff === closest.angleLeftDiff) && timeDiff < closest.timeDiff)) {
              return { patientEntry, timeDiff, angleRightDiff, angleLeftDiff };
            }
          }
          return closest;
        },
        null
      );

      const isRightGood =
        closestPatient &&
        closestPatient.timeDiff <= timeThreshold &&
        closestPatient.angleRightDiff <= angleThreshold;

      const isLeftGood =
        closestPatient &&
        closestPatient.timeDiff <= timeThreshold &&
        closestPatient.angleLeftDiff <= angleThreshold;

      // Store the comparison data
      results.push({
        ClipDeg: clipEntry.ClipDeg,
        ClipMinMax: clipEntry.ClipValue,
        PatientMinMax: clipEntry.ClipValue,
        ClipTimestamp: clipEntry.ClipTimestamp,
        LeftComments: isLeftGood ? "Good" : "Not Good",
        RightComments: isRightGood ? "Good" : "Not Good",
        PatientLeftDeg: closestPatient?.patientEntry['LSA Deg'],
        PatientRightDeg: closestPatient?.patientEntry['RSA Deg'],
        PatientTimestamp: closestPatient?.patientEntry.timestamp,
      });
    });

    return results;
  }

  updateComments(matchingData: any[]) {
    const timestampThreshold = 2; // Difference in seconds
    const angleThreshold = 3; // Difference in degrees

    matchingData.forEach((entry) => {
      const timestampDiff = Math.abs(+entry.ClipTimestamp - +entry.PatientTimestamp);
      const angleLeftDiff = +entry.ClipDeg - +entry.PatientLeftDeg;
      const angleRightDiff = +entry.ClipDeg - +entry.PatientRightDeg;

      if (timestampDiff > timestampThreshold && Math.abs(angleRightDiff) <= angleThreshold) {
        entry.RightComments = "Too Late";
      } else if (angleRightDiff > angleThreshold) {
        entry.RightComments = "Too Low";
      } else if (angleRightDiff < -angleThreshold) {
        entry.RightComments = "Too High";
      }

      if (timestampDiff > timestampThreshold && Math.abs(angleLeftDiff) <= angleThreshold) {
        entry.LeftComments = "Too Late";
      } else if (angleLeftDiff > angleThreshold) {
        entry.LeftComments = "Too Low";
      } else if (angleLeftDiff < -angleThreshold) {
        entry.LeftComments = "Too High";
      }
    });

    return matchingData;
  }

  getClipPatientData(data: any) {
    let min = Infinity;
    let max = -Infinity;

    // Identify the min and max values for LSA and RSA
    data.forEach(entry => {
      if (+entry['Deg'] < min) min = +entry['Deg'] > 3 ? +entry['Deg'] : 3;
      if (+entry['Deg'] > max) max = +entry['Deg'];
    });
    // min = 15;
    // max = 83;

    const mid = (min + max) / 2;

    // Define thresholds
    const threshold = 5;
    const timeThreshold = 3; // in seconds

    // Initialize tracking variables for timestamps
    const lastTimestamps = {
      min: null,
      max: null,
      mid: null
    };

    // Store nearby values
    const nearbyValues = {
      min: [],
      max: [],
      mid: []
    };
    const matchingData = [];

    // Reusable function to check and push values
    function checkAndPush(
      entry: any,
      key: 'min' | 'max' | 'mid',
      targetValue: number,
      valueKey: string
    ) {
      const angleDiff = Math.abs(entry[valueKey] - targetValue);

      if (angleDiff <= threshold) {
        const lastTimestamp = lastTimestamps[key];
        const currentTimestamp = +entry.timestamp;
        const matchingDataLength = matchingData.length;
        const lastMatchingData = matchingData[matchingDataLength - 1];

        if (!lastTimestamp || (currentTimestamp - lastTimestamp) >= timeThreshold) {
          // Push the value into nearbyValues
          nearbyValues[key].push({ timestamp: entry.timestamp, [valueKey]: entry[valueKey] });

          // Update the last timestamp for the key
          lastTimestamps[key] = currentTimestamp;

          // Add to matchingData if the key matches RSA
          // if (key.includes("LSA")) {
          matchingData.push({
            ClipValue: key.includes("min") ? "Min Value" : key.includes("max") ? "Max Value" : "Mid Value",
            ClipTimestamp: entry.timestamp,
            ClipDeg: entry[valueKey],
          });
          // }
        }
        // key.includes("RSA") && 
        if (matchingDataLength > 0) {
          if (key.includes("min") && lastMatchingData['ClipValue'] === "Min Value" && lastMatchingData['ClipDeg'] > entry[valueKey]) {
            matchingData[matchingDataLength - 1]['ClipDeg'] = entry[valueKey];
            matchingData[matchingDataLength - 1]['ClipTimestamp'] = entry.timestamp;
          }

          if (key.includes("max") && lastMatchingData['ClipValue'] === "Max Value" && lastMatchingData['ClipDeg'] < entry[valueKey]) {
            matchingData[matchingDataLength - 1]['ClipDeg'] = entry[valueKey];
            matchingData[matchingDataLength - 1]['ClipTimestamp'] = entry.timestamp;
          }
        }
      }
    }

    // Iterate over the dataset
    data.forEach((entry, index) => {
      // Check nearby values for min and max LSA
      checkAndPush(entry, 'min', min, 'Deg');
      checkAndPush(entry, 'max', max, 'Deg');
      checkAndPush(entry, 'mid', mid, 'Deg');

      // Check nearby values for min and max RSA
      // checkAndPush(entry, 'min', min, 'RSA Deg');
      // checkAndPush(entry, 'max', max, 'RSA Deg');
      // checkAndPush(entry, 'mid', mid, 'RSA Deg');
    });

    return {
      min,
      max,
      nearbyValues,
      matchingData
    };
  }

  getLivePatientData(data: any) {
    let minLSA = Infinity;
    let maxLSA = -Infinity;
    let minRSA = Infinity;
    let maxRSA = -Infinity;

    // Identify the min and max values for LSA and RSA
    data.forEach(entry => {
      if (+entry['LSA Deg'] < minLSA) minLSA = entry['LSA Deg'] > 3 ? entry['LSA Deg'] : 3;
      if (+entry['LSA Deg'] > maxLSA) maxLSA = entry['LSA Deg'];
      if (+entry['RSA Deg'] < minRSA) minRSA = entry['RSA Deg'] > 3 ? entry['RSA Deg'] : 3;
      if (+entry['RSA Deg'] > maxRSA) maxRSA = entry['RSA Deg'];
    });

    // Define thresholds
    const threshold = 4;
    const timeThreshold = 8; // in seconds

    // Initialize tracking variables for timestamps
    const lastTimestamps = {
      minLSA: null,
      maxLSA: null,
      minRSA: null,
      maxRSA: null,
    };

    const matchingData = [];

    // Reusable function to check and push values
    function checkAndPush(
      entry: any,
      key: 'minLSA' | 'maxLSA' | 'minRSA' | 'maxRSA',
      targetValue: number,
      valueKey: string
    ) {
      const angleDiff = Math.abs(entry[valueKey] - targetValue);

      if (angleDiff <= threshold) {
        const lastTimestamp = lastTimestamps[key];
        const currentTimestamp = +entry.timestamp;
        const matchingDataLength = matchingData.length;
        const lastMatchingData = matchingData[matchingDataLength - 1];

        if (!lastTimestamp || (currentTimestamp - lastTimestamp) >= timeThreshold) {
          // Update the last timestamp for the key
          lastTimestamps[key] = currentTimestamp;

          // Add to matchingData if the key matches RSA
          if (key.includes("RSA")) {
            matchingData.push({
              "Min/Max": key.includes("min") ? "Min Value" : "Max Value",
              timestamp: entry.timestamp,
              Deg: entry[valueKey],
            });
          }
        }

        if (key.includes("RSA") && matchingDataLength > 0) {
          if (key.includes("min") && lastMatchingData['Min/Max'] === "Min Value" && lastMatchingData['Deg'] > entry[valueKey]) {
            matchingData[matchingDataLength - 1]['Deg'] = entry[valueKey];
            matchingData[matchingDataLength - 1]['timestamp'] = entry.timestamp;
          }

          if (key.includes("max") && lastMatchingData['Min/Max'] === "Max Value" && lastMatchingData['Deg'] < entry[valueKey]) {
            matchingData[matchingDataLength - 1]['Deg'] = entry[valueKey];
            matchingData[matchingDataLength - 1]['timestamp'] = entry.timestamp;
          }
        }
      }
    }

    // Iterate over the dataset
    data.forEach((entry, index) => {
      checkAndPush(entry, 'minRSA', minRSA, 'RSA Deg');
      checkAndPush(entry, 'maxRSA', maxRSA, 'RSA Deg');
    });

    return {
      minLSA,
      maxLSA,
      minRSA,
      maxRSA,
      matchingData
    };
  }

  calculateAllMinMaxComparisons(clipData, patientData) {
    const results = [];

    // Helper function to find all min and max points
    const getAllMinMaxPoints = (data, key) => {
      const sortedData = [...data].sort((a, b) => a[key] - b[key]);
      const minPoints = sortedData.filter((point) => point[key] === sortedData[0][key]);
      const maxPoints = sortedData.filter((point) => point[key] === sortedData[sortedData.length - 1][key]);
      return { minPoints, maxPoints };
    };

    // Find all min and max for Clip and Patient
    const clipMinMax = getAllMinMaxPoints(clipData, 'RSA Deg');
    const patientMinMax = getAllMinMaxPoints(patientData, 'RSA Deg');

    // Compare each Clip min/max with Patient min/max
    const comparePoints = (clipPoints, patientPoints, type) => {
      clipPoints.forEach((clipPoint) => {
        let closestMatch = null;
        let smallestTimeDiff = Infinity;

        // Find the closest patient point
        patientPoints.forEach((patientPoint) => {
          const timeDiff = Math.abs(clipPoint.timestamp - patientPoint.timestamp);
          if (timeDiff < smallestTimeDiff) {
            closestMatch = patientPoint;
            smallestTimeDiff = timeDiff;
          }
        });

        // Add result with comment
        results.push({
          Type: type,
          'Clip Time': clipPoint.timestamp,
          'Clip SA Deg': clipPoint['RSA Deg'],
          'Patient Time': closestMatch?.timestamp,
          'Patient SA Deg': closestMatch?.['RSA Deg'],
          Comment: smallestTimeDiff <= 1 ? 'Good' : 'Not Good',
        });
      });
    };

    // Process min and max points
    comparePoints(clipMinMax.minPoints, patientMinMax.minPoints, 'Min');
    comparePoints(clipMinMax.maxPoints, patientMinMax.maxPoints, 'Max');

    return results;
  };

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
    // const iframe = document.getElementById('videoIframe') as HTMLIFrameElement;
    // const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    // const iframe = this.videoIframe.nativeElement;
    // const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    // if (iframeDocument) {
    //   console.log('iframeDocument', iframeDocument);

    //   // const videoElement = iframeDocument.querySelector('video');
    //   const videoElement = iframeDocument.getElementById('videoElement') as HTMLVideoElement;

    //   console.log('videoElement', videoElement);
    //   if (videoElement) {

    //     videoElement.onloadeddata = () => {
    //       this.processVideoFrames(videoElement);
    //     };
    //   }
    // }
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
    // this.camera.start();
  }

  calculateAngle(landmarkA: any, landmarkB: any, landmarkC: any): number {
    // Vector AB (from A to B)
    const ABx = landmarkB.x - landmarkA.x;
    const ABy = landmarkB.y - landmarkA.y;
    const ABz = landmarkB.z - landmarkA.z;

    // Vector AC (from A to C)
    const ACx = landmarkC.x - landmarkA.x;
    const ACy = landmarkC.y - landmarkA.y;
    const ACz = landmarkC.z - landmarkA.z;

    // Dot product of AB and AC
    const dotProduct = ABx * ACx + ABy * ACy + ABz * ACz;

    // Magnitude of vectors AB and AC
    const magnitudeAB = Math.sqrt(ABx * ABx + ABy * ABy + ABz * ABz);
    const magnitudeAC = Math.sqrt(ACx * ACx + ACy * ACy + ACz * ACz);

    // Calculate the angle in radians and convert to degrees
    const angleRad = Math.acos(dotProduct / (magnitudeAB * magnitudeAC));
    return (angleRad * 180) / Math.PI; // Convert to degrees
  }

  // private calculateAngleBetweenPoints(
  //   A: { x: number; y: number },
  //   B: { x: number; y: number }
  // ): number {
  //   const vectorAB = { x: B.x - A.x, y: B.y - A.y };
  //   const verticalVector = { x: 0, y: 1 };

  //   const dotProduct =
  //     vectorAB.x * verticalVector.x + vectorAB.y * verticalVector.y;
  //   const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);

  //   const angleInRadians = Math.acos(dotProduct / magnitudeAB);
  //   return angleInRadians * (180 / Math.PI);
  // }

  private calculateAngleBetweenPoints(
    A: { x: number; y: number; z: number },
    B: { x: number; y: number; z: number }
  ): number {
    const vectorAB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
    const verticalVector = { x: 0, y: 0, z: -1 };

    const dotProduct =
      vectorAB.x * verticalVector.x + vectorAB.y * verticalVector.y + vectorAB.z * verticalVector.z;

    const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2 + vectorAB.z ** 2);
    const magnitudeVertical = Math.sqrt(
      verticalVector.x ** 2 + verticalVector.y ** 2 + verticalVector.z ** 2
    );

    const angleInRadians = Math.acos(
      dotProduct / (magnitudeAB * magnitudeVertical)
    );
    return angleInRadians * (180 / Math.PI);
  }

  private calculateAngleBetweenThreePoints(
    A: { x: number; y: number; z: number },
    B: { x: number; y: number; z: number },
    C: { x: number; y: number; z: number }
  ): number {
    // Vector AB
    const AB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };

    // Vector BC
    const BC = { x: C.x - B.x, y: C.y - B.y, z: C.z - B.z };

    // Dot product of AB and BC
    const dotProduct = AB.x * BC.x + AB.y * BC.y + AB.z * BC.z;

    // Magnitudes of AB and BC
    const magnitudeAB = Math.sqrt(AB.x ** 2 + AB.y ** 2 + AB.z ** 2);
    const magnitudeBC = Math.sqrt(BC.x ** 2 + BC.y ** 2 + BC.z ** 2);

    // Angle in radians
    const angleInRadians = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));

    // Convert to degrees
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
        const tolerance = 3;
        const leftShoulder = results.poseLandmarks[24];
        const leftElbow = results.poseLandmarks[26];
        const leftWrist = results.poseLandmarks[15];
        const rightShoulder = results.poseLandmarks[23];
        const rightWrist = results.poseLandmarks[25];
        // console.log(leftShoulder, leftElbow, leftWrist);

        // const frameData = this.getCoordinatesForFrame(this.currentFrameIndex);

        // if (!frameData) return; // No data for the frame

        // const { leftShoulder, leftWrist, rightShoulder, rightWrist } = frameData;

        // const leftAngle = this.calculateAngleBetweenPoints(leftShoulder, leftWrist);
        // const rightAngle = this.calculateAngleBetweenPoints(rightShoulder, rightWrist);
        // Calculate angles for left and right wrists
        // const leftAngle = this.calculateAngleBetweenThreePoints(
        //   { x: leftShoulder.x, y: leftShoulder.y, z: leftShoulder.z },
        //   { x: leftElbow.x, y: leftElbow.y, z: leftElbow.z },
        //   { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z }
        // );

        const leftAngle = this.calculateAngleBetweenPoints(
          { x: leftShoulder.x, y: leftShoulder.y, z: leftShoulder.z },
          { x: leftElbow.x, y: leftElbow.y, z: leftElbow.z }
        );

        const rightAngle = this.calculateAngleBetweenPoints(
          { x: rightShoulder.x, y: rightShoulder.y, z: rightShoulder.z },
          { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z }
        );
        const elapsedTime = ((new Date().getTime() - this.startTime) / 1000).toFixed(3);
        this.matchingVideoData.push({
          timestamp: `${elapsedTime}`,
          'Deg': `${Math.round(leftAngle)}`,
        });

        const liveVideoResults = this.getLivePatientData(this.matchingVideoData);

        // setTimeout(() => {
        //   const liveResults = this.matchClipAndPatientData(liveVideoResults.matchingData, this.matchingCameraData);
        //   const updateComments = this.updateComments(liveResults);
        //   this.rightComment = updateComments[updateComments.length - 1].Comments;
        // }, 500);

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

        results.poseLandmarks.forEach((landmark, index) => {
          if (index === 24 || index === 26 || index == 28 || index === 23 || index === 25 || index == 27) {
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
          }
        });

        POSE_CONNECTIONS.forEach(([start, end]) => {
          if ((start === 24 && end === 26) || (start === 26 && end === 28) || (start === 23 && end === 25) || (start === 25 && end === 27)) {
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
          }
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

        const elapsedTime = ((new Date().getTime() - this.startTime) / 1000).toFixed(3);
        this.matchingCameraData.push({
          timestamp: `${elapsedTime}`,
          'LSA Deg': `${Math.round(leftAngle)}`,
          'RSA Deg': `${Math.round(rightAngle)}`
        });
        this.cdr.detectChanges();

        // Additional code to draw pose landmarks and connections on the canvas
        results.poseLandmarks.forEach((landmark, index) => {
          if (index === 11 || index === 12 || index === 13 || index === 14 || index === 15 || index === 16 || index === 23 || index === 24) {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasElement.width,
              landmark.y * canvasElement.height,
              7,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            canvasCtx.fill();
          }
        });

        POSE_CONNECTIONS.forEach(([start, end]) => {
          if ((start === 11 && (end === 13 || end === 23)) || (start === 13 && end === 15) || (start === 12 && (end === 14 || end === 24)) || (start === 14 && end === 16)) {
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
            canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
            if ((start === 12 && (end === 14 || end === 24)) || (start === 14 && end === 16)) {
              canvasCtx.strokeStyle = this.rightMatching ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            }
            if ((start === 11 && (end === 13 || end === 23)) || (start === 13 && end === 15)) {
              canvasCtx.strokeStyle = this.leftMatching ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            }
            canvasCtx.stroke();
          }
        });
      }
    }
  }
}
