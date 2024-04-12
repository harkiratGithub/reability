import { Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';

const SIZE_OF_SKELETON = 300 * 4;
const firstBodyIdIndex = 0;
const secondBodyIdIndex = 60;
const thirdBodyIdIndex = 60 * 2;
const fourthtBodyIdIndex = 60 * 3;
const fifthtBodyIdIndex = 60 * 4;
const handsGainY = 1;
const handsGainX = 1;
const frameWidthPercentage = 0.97;
const leftImgPath = 'assets/skel/left_hand.svg';
const rightImgPath = 'assets/skel/right_hand.svg';
const leftHandImgIdConst: string = 'left-hand-img';
const rightHandImgIdConst: string = 'right-hand-img';
const therapistHandsPosition = 70;
/* Each message includes skeleton data in the following format for each 0-24
detected skeleton (25 floating point numbers):
* bodyId 0
* head x 1
* head y 2
* head z 3
* neck x 4
* neck y 5
* neck z 6
* spine x 7
* spine y 8
* spine z 9
* shoulder_spine x10
* shoulder_spine y11
* shoulder_spine z12
* mid_spine x13
* mid_spine y14
* mid_spine z15
* left_shoulder x16
* left_shoulder y17
* left_shoulder z18
* right_shoulder x19
* right_shoulder y20
* right_shoulder z21
* left_elbow x22
* left_elbow y23
* left_elbow z24
* right_elbow x25
* right_elbow y26
* right_elbow z27
* left_hand x28
* left_hand y29
* left_hand z30
* right_hand x31
* right_hand y32
* right_hand z33
* left_knee x34
* left_knee y35
* left_knee z36
* right_knee x37
* right_knee y38
* right_knee z39
* base_spine x40
* base_spine y41
* base_spine z42
* left_hip x43
* left_hip y44
* left_hip z45
* left_foot x46
* left_foot y47
* left_foot z48
* right_hip x49
* right_hip y50
* right_hip z51
* right_foot x52
* right_foot y53
* right_foot z54
* is_left_hand_gripped
* is_right_hand_gripped
* .
* .
* .
* .
* width 58
* height 59

*/

@Injectable()
export class BodyHandleService {
  leftHandImgId;
  rightHandImgId;
  cameraContainerId;
  hands: any[] = [];

  l_x: number;
  l_y: number;
  r_x: number;
  r_y: number;

  frameHeight: number;
  frameWidth: number;

  old_l_x = 0;
  old_l_y = 0;
  old_r_x = 0;
  old_r_y = 0;

  areHandsCreated = false;
  prevLeftHandPositions = [];
  prevRightHandPositions = [];
  currStandardDeviationLeftHand = 0;
  currStandardDeviationRightHand = 0;

  constructor(private authenticationService: AuthenticationService) {}

  createHands(id) {
    this.cameraContainerId = `camera-container-${id}`;
    this.leftHandImgId = `${leftHandImgIdConst}-${id}`;
    this.rightHandImgId = `${rightHandImgIdConst}-${id}`;
    // if (this.areHandsCreated) {
    //   return;
    // }
    const dom = document.getElementById(this.cameraContainerId);
    if (!dom) {
      return;
    }
    const leftHand = this.getElementInsideContainer(this.cameraContainerId, this.leftHandImgId);
    const rightHand = this.getElementInsideContainer(this.cameraContainerId, this.rightHandImgId);
    if (dom && leftHand && rightHand) {
      return;
    }
    this.createHandImg('assets/skel/left_hand.svg', this.leftHandImgId, 100, 0, 200, 0);
    this.createHandImg('assets/skel/right_hand.svg', this.rightHandImgId, 300, 0, 400, 0);
    this.setHandPositionWhenNoDetection(true, id);
    this.setHandPositionWhenNoDetection(false, id);
    // this.areHandsCreated = true;
  }

  removeHands(id) {
    this.cameraContainerId = `camera-container-${id}`;
    this.leftHandImgId = `${leftHandImgIdConst}-${id}`;
    this.rightHandImgId = `${rightHandImgIdConst}-${id}`;
    // if (!this.areHandsCreated) {
    //   return;
    // }
    const dom = document.getElementById(this.cameraContainerId);

    const leftHand = this.getElementInsideContainer(this.cameraContainerId, this.leftHandImgId);
    const rightHand = this.getElementInsideContainer(this.cameraContainerId, this.rightHandImgId);

    if (dom && leftHand && rightHand) {
      leftHand.parentNode.removeChild(leftHand);
      rightHand.parentNode.removeChild(rightHand);
    }
    this.hands = this.hands.filter((hand) => hand !== this.leftHandImgId || hand !== this.rightHandImgId);
    // this.areHandsCreated = false;
  }

  handleSkeleton(buf, id, shouldScale = null, skeletonTrackingData = null) {
    this.cameraContainerId = `camera-container-${id}`;
    this.leftHandImgId = `${leftHandImgIdConst}-${id}`;
    this.rightHandImgId = `${rightHandImgIdConst}-${id}`;
    const relativeDom = document.getElementById(this.cameraContainerId);
    if (relativeDom) {
      if (
        buf[firstBodyIdIndex] == 0
        //  && buf[secondBodyIdIndex] == 0
        // && buf[thirdBodyIdIndex] == 0 && buf[fourthtBodyIdIndex] == 0
        // && buf[fifthtBodyIdIndex] == 0
      ) {
        // this.setHandPositionWhenNoDetection(true, id);
        // this.setHandPositionWhenNoDetection(false, id);
      } else {
        let skeletonStartIndex = 0;
        let skeletonEndIndex = 60;
        this.frameWidth = skeletonTrackingData
          ? skeletonTrackingData.frame.width
          : buf[skeletonEndIndex * skeletonStartIndex + skeletonEndIndex - 2];
        this.frameHeight = skeletonTrackingData
          ? skeletonTrackingData.frame.height
          : buf[skeletonEndIndex * skeletonStartIndex + skeletonEndIndex - 1];

        if (this.frameWidth == 0 || this.frameHeight == 0) {
          return;
        }

        const delta = 1;
        const w = relativeDom.offsetWidth * delta;
        const h = relativeDom.offsetHeight * delta - therapistHandsPosition;

        // depthCameraBuffer[46] = 640;
        const rect = relativeDom.getBoundingClientRect();
        // const centerPoint = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
        // offsetting everything by half a screen

        // this.l_x = this.getNewCooardinate(buf[skeletonEndIndex - 32], centerPoint.x, handsGainX);
        // this.l_y = this.getNewCooardinate(buf[skeletonEndIndex - 31], centerPoint.y, handsGainY);
        // this.r_x = this.getNewCooardinate(buf[skeletonEndIndex - 29], centerPoint.x, handsGainX);
        // this.r_y = this.getNewCooardinate(buf[skeletonEndIndex - 28], centerPoint.y, handsGainY);

        this.l_x = buf[skeletonEndIndex - 32];
        this.l_y = buf[skeletonEndIndex - 31];
        this.r_x = buf[skeletonEndIndex - 29];
        this.r_y = buf[skeletonEndIndex - 28];

        if (shouldScale) {
          this.l_x = (skeletonTrackingData.hands.l_x / this.frameWidth) * w;
          this.l_y = (skeletonTrackingData.hands.l_y / this.frameHeight) * h - therapistHandsPosition;
          this.r_x = (skeletonTrackingData.hands.r_x / this.frameWidth) * w;
          this.r_y = (skeletonTrackingData.hands.r_y / this.frameHeight) * h - therapistHandsPosition;
        } else {
          this.l_x = this.setBounds(
            this.l_x,
            (rect.x + rect.width) * frameWidthPercentage,
            rect.x,
            (((rect.x + rect.width) * 0.85) / 100) * 5
          );
          this.l_y = this.setBounds(this.l_y, rect.y + rect.height, rect.y, ((rect.y + rect.height) / 100) * 10);
          this.r_x = this.setBounds(
            this.r_x,
            (rect.x + rect.width) * frameWidthPercentage,
            rect.x,
            (((rect.x + rect.width) * 0.85) / 100) * 5
          );
          this.r_y = this.setBounds(this.r_y, rect.y + rect.height, rect.y, ((rect.y + rect.height) / 100) * 10);
        }

        if (this.l_x === rect.x && this.l_y === rect.y) {
          setTimeout(() => {
            if (this.l_x === rect.x && this.l_y === rect.y) {
              this.setHandPositionWhenNoDetection(true, id);
            }
          }, 2000);
          // this.setHandPositionWhenNoDetection(true, id);
        }
        if (this.r_x === rect.x && this.r_y === rect.y) {
          setTimeout(() => {
            if (this.r_x === rect.x && this.r_y === rect.y) {
              this.setHandPositionWhenNoDetection(false, id);
            }
          }, 2000);
          // this.setHandPositionWhenNoDetection(false, id);
        }
        if (!Number.isNaN(this.l_x) && !Number.isNaN(this.l_y) && !Number.isNaN(this.r_x) && !Number.isNaN(this.r_y)) {
          if (shouldScale) {
            if (this.l_x > rect.x || this.l_y > rect.y) {
              this.drawHandsFromCoordinates(true, id);
            }

            if (this.r_x > rect.x || this.r_y > rect.y) {
              this.drawHandsFromCoordinates(false, id);
            }
          } else {
            if (
              this.l_x > rect.x + ((window.innerWidth * 0.85) / 100) * 5 ||
              this.l_y > rect.y + (window.innerHeight / 100) * 10
            ) {
              this.drawHandsFromCoordinates(true, id);
            }
            if (
              this.r_x > rect.x + ((window.innerWidth * 0.85) / 100) * 5 ||
              this.r_y > rect.y + (window.innerHeight / 100) * 10
            ) {
              this.drawHandsFromCoordinates(false, id);
            }
          }
        }
      }
    }
    //check for no detection
  }

  getNewCooardinate = (cord, center, gain) => {
    return cord > center ? cord + (cord - center) * (gain - 1) : cord - (center - cord) * (gain - 1);
  };

  createHandImg(imgPath: string, id: string, left: number, right: number, top: number, bottom: number) {
    const handImg = document.createElement('img');
    handImg.setAttribute('src', imgPath);
    handImg.setAttribute('id', id);
    handImg.setAttribute('width', '75px');
    handImg.setAttribute('height', '75px');
    handImg.style.display = 'block';
    handImg.style.pointerEvents = 'none';
    handImg.style.position = 'fixed';
    handImg.style.top = top + 'px';
    handImg.style.left = left + 'px';
    handImg.style.zIndex = '2000';
    handImg.style.setProperty('transition', 'transform 0.05s linear 1s');
    handImg.style.setProperty('will-change', 'left, top');

    const dom = document.getElementById(this.cameraContainerId);
    if (dom) {
      dom.appendChild(handImg);
    }
  }

  moveHand(src: string, id: string, left: number, top: number, camera_container_id: string, isHandsNotRecognized?) {
    if (left < -100 || top < -100) {
      return;
    }

    let img = this.hands[id];

    if (!img) {
      img = this.getElementInsideContainer(camera_container_id, id);
      if (img) {
        img.setAttribute('src', src);
        img.style.display = 'block'; // make visible if running for the first time
        this.hands[id] = img;
      }
    }
    if (img) {
      img.style.display = 'block';
      img.style.top = top + 'px';
      img.style.left = left + 'px';
      img.style.width = '4vw';
      img.style.height = '4vw';
      if (isHandsNotRecognized) {
        img.style.setProperty('transition', 'all 2s');
      } else {
        img.style.setProperty('transition', 'transform 0.05s linear 1s');
      }
    }
  }

  drawHandsFromCoordinates(isLeft, id) {
    this.cameraContainerId = `camera-container-${id}`;
    this.leftHandImgId = `${leftHandImgIdConst}-${id}`;
    this.rightHandImgId = `${rightHandImgIdConst}-${id}`;

    return isLeft
      ? this.moveHand(leftImgPath, `${leftHandImgIdConst}-${id}`, this.l_x, this.l_y, `camera-container-${id}`)
      : this.moveHand(rightImgPath, `${rightHandImgIdConst}-${id}`, this.r_x, this.r_y, `camera-container-${id}`);
  }

  setHandPositionWhenNoDetection(isLeft, id) {
    if (isLeft) {
      const leftHandDefaultPosition = {
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight - (window.innerHeight / 100) * 10,
      };
      this.moveHand(
        leftImgPath,
        `${leftHandImgIdConst}-${id}`,
        leftHandDefaultPosition.x,
        leftHandDefaultPosition.y,
        `camera-container-${id}`,
        true
      );
    } else {
      const rightHandDefaultPosition = {
        x: window.innerWidth / 2 - 80 + 100,
        y: window.innerHeight - (window.innerHeight / 100) * 10,
      };
      this.moveHand(
        rightImgPath,
        `${rightHandImgIdConst}-${id}`,
        rightHandDefaultPosition.x,
        rightHandDefaultPosition.y,
        `camera-container-${id}`,
        true
      );
    }
  }

  setBounds = (point, max, min, gain) => {
    if (point > max - gain) {
      return max - gain;
    }
    if (point <= min + gain) {
      return min;
    }
    return point;
  };

  getElementInsideContainer = (containerID, childID) => {
    const elm = document.getElementById(childID);
    const parent = elm ? elm.parentNode : {};
    return parent['id'] && parent['id'] === containerID ? elm : null;
  };
}
