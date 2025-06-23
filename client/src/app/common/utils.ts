import { map, forEach } from 'lodash';

import { IPoint, IOrganAngle } from '../../types';

// POSENET MARKERS - https://google.github.io/mediapipe/solutions/pose#pose-landmark-model-blazepose-ghum-3d

//****************  POSNET -> Reability Mapping  */

const POSE_LANDMARKS_INDEXES = {
  head: 0,
  rightShoulder: 11,
  leftShoulder: 12,
  rightElbow: 13,
  leftElbow: 14,
  rightWrist: 15,
  leftWrist: 16,
  rightHip: 23,
  leftHip: 24,
  rightKnee: 25,
  leftKnee: 26,
  rightAnkle: 27,
};

const MARKERS = {
  id: 0,
  head_X: 1,
  head_Y: 2,
  leftHip_X: 3,
  leftHip_Y: 4,
  rightHip_X: 5,
  rightHip_Y: 6,
  rightKnee_X: 7,
  rightKnee_Y: 8,
  rightAnkle_X: 9,
  rightAnkle_Y: 10,
  rightWrist_X: 11,
  rightWrist_Y: 12,
  spineMiddle_X: 13, // center between 2 shoulders
  spineMiddle_Y: 14, // center between shoulders and waist
  leftKnee_X: 15,
  leftKnee_Y: 16,
  leftKnee_Z: 17,
  rightKnee_Z: 18,
  leftHandForDrawing_X: 28,
  leftHandForDrawing_Y: 29,
  hipsMiddle_X: 30, // center between 2 hips
  rightHandForDrawing_X: 31,
  rightHandForDrawing_Y: 32,
  leftShoulder_X: 33,
  leftShoulder_Y: 34,
  rightShoulder_X: 35,
  rightShoulder_Y: 36,
  distanceBetweenShoulders: 37,
  leftHandForSkeleton_X: 38,
  leftHandForSkeleton_Y: 39,
  leftHandForSkeleton_Z: 40,
  rightHandForSkeleton_X: 41,
  rightHandForSkeleton_Y: 42,
  rightHandForSkeleton_Z: 43,
  rightHip_Z: 56,
  head_Z: 57,
  videoWidth: 58,
  videoHeight: 59,
};

//**************************************************

const MIN_VISIBILITY = 0.25;
const ADJUST_MARKER_TO_VIDEO_MULTIPLIER = 10;
const handsGainY = 1;
const handsGainX = 1;
let handsId;

export const handleWebCamBuffer = (WebCamBuffer, shouldScaleToFrame, id, iframeEl = null) => {
  const depthCameraBuffer = Array(60).fill(0);

  if (!WebCamBuffer || WebCamBuffer.length === 0) {
    return depthCameraBuffer;
  }

  handsId = id;
  let videoWidth = 1280;
  let videoHeight = 720;

  const localVideoForSkeleton = document.getElementById('patient-video-skeleton') as HTMLVideoElement;
  if (localVideoForSkeleton) {
    videoWidth = localVideoForSkeleton.videoWidth;
    videoHeight = localVideoForSkeleton.videoHeight;
  }
  depthCameraBuffer[MARKERS.videoWidth] = videoWidth;
  depthCameraBuffer[MARKERS.videoHeight] = videoHeight;
  depthCameraBuffer[MARKERS.id] = 1; //body_id

  // Head
  depthCameraBuffer[MARKERS.head_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.head].x > 0
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.head].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.head_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.head].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight; //head
  depthCameraBuffer[MARKERS.head_Z] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.head].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.head].z
      : 0;

  // Mid Spine
  depthCameraBuffer[MARKERS.spineMiddle_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].x > 0 && WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].x > 0
      ? ((WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].x + WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].x) /
        2) *
      ADJUST_MARKER_TO_VIDEO_MULTIPLIER *
      videoWidth
      : 0;
  depthCameraBuffer[MARKERS.spineMiddle_Y] =
    (((WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].y + WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].y) / 2 +
      (WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].y + WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].y) /
      2) /
      2) *
    ADJUST_MARKER_TO_VIDEO_MULTIPLIER *
    videoHeight;

  // Left Shoulder
  depthCameraBuffer[MARKERS.leftShoulder_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.leftShoulder_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftShoulder].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;

  //Right Shoulder
  depthCameraBuffer[MARKERS.rightShoulder_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.rightShoulder_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightShoulder].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;

  // Distance between Shoulders
  depthCameraBuffer[MARKERS.distanceBetweenShoulders] =
    depthCameraBuffer[MARKERS.leftShoulder_X] !== 0 && depthCameraBuffer[MARKERS.rightShoulder_X] !== 0
      ? Math.abs(depthCameraBuffer[MARKERS.rightShoulder_X] - depthCameraBuffer[MARKERS.leftShoulder_X])
      : 0;

  // Left Hand
  depthCameraBuffer[MARKERS.leftHandForSkeleton_X] = depthCameraBuffer[MARKERS.leftHandForDrawing_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftWrist].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.leftHandForSkeleton_Y] = depthCameraBuffer[MARKERS.leftHandForDrawing_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftWrist].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;
  depthCameraBuffer[MARKERS.leftHandForSkeleton_Z] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftWrist].z
      : 0;

  // Right Hand
  depthCameraBuffer[MARKERS.rightHandForSkeleton_X] = depthCameraBuffer[MARKERS.rightHandForDrawing_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.rightHandForSkeleton_Y] = depthCameraBuffer[MARKERS.rightHandForDrawing_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;
  depthCameraBuffer[MARKERS.rightHandForSkeleton_Z] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].z
      : 0;

  // Hands Drawing Positions
  const newHandsPosition = filterHandMovments(
    depthCameraBuffer[MARKERS.leftHandForDrawing_X] / ADJUST_MARKER_TO_VIDEO_MULTIPLIER,
    depthCameraBuffer[MARKERS.leftHandForDrawing_Y] / ADJUST_MARKER_TO_VIDEO_MULTIPLIER,
    depthCameraBuffer[MARKERS.rightHandForDrawing_X] / ADJUST_MARKER_TO_VIDEO_MULTIPLIER,
    depthCameraBuffer[MARKERS.rightHandForDrawing_Y] / ADJUST_MARKER_TO_VIDEO_MULTIPLIER,
    depthCameraBuffer[MARKERS.videoWidth],
    depthCameraBuffer[MARKERS.videoHeight],
    shouldScaleToFrame,
    iframeEl
  );
  depthCameraBuffer[MARKERS.leftHandForDrawing_X] = newHandsPosition.l_x;
  depthCameraBuffer[MARKERS.leftHandForDrawing_Y] = newHandsPosition.l_y;
  depthCameraBuffer[MARKERS.rightHandForDrawing_X] = newHandsPosition.r_x;
  depthCameraBuffer[MARKERS.rightHandForDrawing_Y] = newHandsPosition.r_y;

  // Left Hip
  depthCameraBuffer[MARKERS.leftHip_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.leftHip_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;

  // Right Hip
  depthCameraBuffer[MARKERS.rightHip_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.rightHip_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;
  depthCameraBuffer[MARKERS.rightHip_Z] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].z
      : 0;

  // Middle point between Hips
  depthCameraBuffer[MARKERS.hipsMiddle_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].x > 0 && WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].x > 0
      ? ((WebCamBuffer[POSE_LANDMARKS_INDEXES.rightHip].x + WebCamBuffer[POSE_LANDMARKS_INDEXES.leftHip].x) / 2) *
      ADJUST_MARKER_TO_VIDEO_MULTIPLIER *
      videoWidth
      : 0;

  // Left Knee
  depthCameraBuffer[MARKERS.leftKnee_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftKnee].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftKnee].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.leftKnee_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftKnee].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftKnee].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;
  depthCameraBuffer[MARKERS.leftKnee_Z] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.leftKnee].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.leftKnee].z
      : 0;

  // Right Knee
  depthCameraBuffer[MARKERS.rightKnee_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightKnee].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightKnee].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.rightKnee_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightKnee].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightKnee].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;
  depthCameraBuffer[MARKERS.rightKnee_Z] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightKnee].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightKnee].z
      : 0;

  // Right Ankle
  depthCameraBuffer[MARKERS.rightAnkle_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightAnkle].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightAnkle].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.rightAnkle_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightAnkle].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightAnkle].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;

  // Right Wrist
  depthCameraBuffer[MARKERS.rightWrist_X] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].x * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoWidth
      : 0;
  depthCameraBuffer[MARKERS.rightWrist_Y] =
    WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].visibility > MIN_VISIBILITY
      ? WebCamBuffer[POSE_LANDMARKS_INDEXES.rightWrist].y * ADJUST_MARKER_TO_VIDEO_MULTIPLIER * videoHeight
      : 0;

  return depthCameraBuffer;
};

export const handleDepthCameraHandsSmoothing = (skeleton_buffer, shouldScaleToFrame, iframeEl = null) => {
  const updated_buffer = Object.assign({}, skeleton_buffer);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const frameWidth = updated_buffer[58];
  const frameHeight = updated_buffer[59];

  for (let i = 1; i < 56; i += 3) {
    updated_buffer[i] = updated_buffer[i] / 10;
    updated_buffer[i + 1] = updated_buffer[i + 1] / 10;
    if (!iframeEl) {
      updated_buffer[i] = (updated_buffer[i] / frameWidth) * w;
      updated_buffer[i + 1] = (updated_buffer[i + 1] / frameHeight) * h;
    } else {
      updated_buffer[i] = (updated_buffer[i] / iframeEl.offsetWidth) * w;
      updated_buffer[i + 1] = (updated_buffer[i + 1] / iframeEl.offsetHeight) * h;
    }
  }
  return updated_buffer;
};

export const filterHandMovments = (l_x, l_y, r_x, r_y, frameWidth, frameHeight, shouldScaleToFrame, iframeEl) => {
  let saveLeftHand = false;
  let saveRightHand = false;

  l_x *= handsGainX;
  l_y *= handsGainY;
  r_x *= handsGainX;
  r_y *= handsGainY;

  const newHandsPosition = {
    l_x: 0,
    l_y: 0,
    r_x: 0,
    r_y: 0,
  };
  saveLeftHand = true;
  saveRightHand = true;

  const delta = 1;
  const w = window.innerWidth * delta;
  const h = window.innerHeight * delta;

  if (saveLeftHand) {
    if (shouldScaleToFrame) {
      if (!iframeEl) {
        l_x = (l_x / frameWidth) * w;
        l_y = (l_y / frameHeight) * h;
      } else {
        l_x = (l_x / frameWidth) * iframeEl.offsetWidth;
        l_y = (l_y / frameHeight) * iframeEl.offsetHeight;
      }
    }

    newHandsPosition.l_x = l_x < 10 ? 0 : l_x;
    newHandsPosition.l_y = l_y < 10 ? 0 : l_y;
  }
  if (saveRightHand) {
    if (shouldScaleToFrame) {
      if (!iframeEl) {
        r_x = (r_x / frameWidth) * w;
        r_y = (r_y / frameHeight) * h;
      } else {
        r_x = (r_x / frameWidth) * iframeEl.offsetWidth;
        r_y = (r_y / frameHeight) * iframeEl.offsetHeight;
      }
    }
    newHandsPosition.r_x = r_x < 10 ? 0 : r_x;
    newHandsPosition.r_y = r_y < 10 ? 0 : r_y;
  }
  return newHandsPosition;
};

export const isMobileDevice = () => {
  //return 'ontouchstart' in window || navigator.msMaxTouchPoints || isIosMobile();
  return (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    isIosMobile()
  );
};

const isIosMobile = () => {
  return navigator.userAgent.match(/(iPad|iPhone|iPod)/g);
};

export const MOBILE_OR_SMALL_RESOLUTION = window.innerHeight <= 900 && window.innerWidth <= 1100 && isMobileDevice();

const getAngleBetweenPoints = (start: IPoint, middle: IPoint, end: IPoint): number => {
  const radians = Math.atan2(end.y - middle.y, end.x - middle.x) - Math.atan2(start.y - middle.y, start.x - middle.x);
  const angle = Math.abs((radians * 180.0) / Math.PI);
  return angle > 180.0 ? 360 - angle : angle;
};

const organAngles: IOrganAngle[] = [
  {
    organName: 'LS',
    angle: 0,
    startPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.leftHip,
    middlePointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.leftShoulder,
    endPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.leftElbow,
  },
  {
    organName: 'RS',
    angle: 0,
    startPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.rightHip,
    middlePointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.rightShoulder,
    endPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.rightElbow,
  },
  {
    organName: 'LE',
    angle: 0,
    startPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.leftWrist,
    middlePointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.leftElbow,
    endPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.leftShoulder,
  },
  {
    organName: 'RE',
    angle: 0,
    startPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.rightWrist,
    middlePointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.rightElbow,
    endPointWebCamBufferIndex: POSE_LANDMARKS_INDEXES.rightShoulder,
  },
];

export const getOrganAnglesFromBuffer = (webCamBuffer): IOrganAngle[] => {
  if (!webCamBuffer || webCamBuffer.length === 0) {
    return [];
  }

  return map(organAngles, (organAngle) => {
    const { startPointWebCamBufferIndex, middlePointWebCamBufferIndex, endPointWebCamBufferIndex } = organAngle;
    organAngle.angle = Math.floor(
      getAngleBetweenPoints(
        {
          x: webCamBuffer[startPointWebCamBufferIndex].x,
          y: webCamBuffer[startPointWebCamBufferIndex].y,
        },
        {
          x: webCamBuffer[middlePointWebCamBufferIndex].x,
          y: webCamBuffer[middlePointWebCamBufferIndex].y,
        },
        {
          x: webCamBuffer[endPointWebCamBufferIndex].x,
          y: webCamBuffer[endPointWebCamBufferIndex].y,
        }
      )
    );
    return organAngle;
  });
};

export const setAudioStreamsToComponent = (element: HTMLElement, audioStreams: MediaStream[]) => {
  if (!audioStreams || !element) {
    return;
  }

  forEach(audioStreams, (stream) => {
    const audioElement: HTMLAudioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.srcObject = stream;
    element.appendChild(audioElement);
  });
};
