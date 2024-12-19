const sdkVersion = '1.3.3';
let leftImgPath = './left_hand.svg';
let rightImgPath = './right_hand.svg';
const leftHandImgId = 'left-hand-img';
const rightHandImgId = 'right-hand-img';

let joystickImgPath = './joystick.svg';
const joystickImgId = 'joystick-img';

const BUFFER_POSITIONS = {
  LEFT_HIP_X: 3,
  LEFT_HIP_Y: 4,
  RIGHT_HIP_X: 5,
  RIGHT_HIP_Y: 6,
  RIGHT_KNEE_X: 7,
  RIGHT_KNEE_Y: 8,
  LEFT_KNEE_X: 15,
  LEFT_KNEE_Y: 16,
  LEFT_KNEE_Z: 17,
  RIGHT_KNEE_Z: 18,
  LEFT_HAND_X: 28,
  LEFT_HAND_Y: 29,
  RIGHT_HAND_X: 31,
  RIGHT_HAND_Y: 32,
  LEFT_SHOULDER_X: 33,
  LEFT_SHOULDER_Y: 34,
  RIGHT_SHOULDER_X: 35,
  RIGHT_SHOULDER_Y: 36,
  LEFT_HAND_Z: 40,
  RIGHT_HAND_Z: 43,
  RIGHT_HIP_Z: 56,
  HEAD_Z: 57,
  FRAME_WIDTH: 58,
  FRAME_HEIGHT: 59,
};

const AVAILABLE_HANDS = {
  NONE: 'none',
  ONLY_LEFT: 'left',
  ONLY_RIGHT: 'right',
  BOTH_HANDS: 'both',
};

const JOYSTICK_HORIZONTAL_MOVEMENT_ORGANS = {
  NONE: 'none',
  BACK: 'back',
};

const JOYSTICK_VERTICAL_MOVEMENT_ORGANS = {
  NONE: 'none',
  HEAD: 'head',
};

const DIRECTIONS = {
  NONE: 'none',
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
};
const HAND_STATUS = {
  DISABLED: 0,
  ACTIVE: 1,
};

const SIDES = {
  NONE: 'NONE',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
};

const WALK_STATUS = {
  WALK: 'WALK',
  STOP: 'STOP',
};

const MAX_ANGLE_FOR_HORIZONTAL_BACK_MOVEMENT = 70;
const HEAD_UP_VERTICAL_MOVEMENT_HYSTERESIS = 0.08;
const HEAD_DOWN_VERTICAL_MOVEMENT_HYSTERESIS = 0.2;
const NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT = 10;

let hands = [];
let areHandsCreated = false;
let isGameAreaLessThanIFrameArea = false;
let internalGameFrameTopLeft;
let internalGameFrameBottomRight;
let previousLeftHandLCords;
let previousRightHandCords;
let availableHands = AVAILABLE_HANDS.NONE;
let isHandsHysteresis = false;

let isJoystickCreated = false;
let joystickHorizontalOrgan = JOYSTICK_HORIZONTAL_MOVEMENT_ORGANS.NONE;
let joystickVerticalOrgan = JOYSTICK_VERTICAL_MOVEMENT_ORGANS.NONE;
let joyStickImagePositionX = 0;
let joyStickImagePositionY = 0;
let joystickMoveCallback;
let currentJoystickHorizontalDirection = DIRECTIONS.NONE;
let currentJoystickVerticalDirection = DIRECTIONS.NONE;

let leftHandFrameDetectionCounter = 0;
let rightHandFrameDetectionCounter = 0;
let leftHandStatus = HAND_STATUS.DISABLED;
let rightHandStatus = HAND_STATUS.DISABLED;

let isWalkingSupport = false;
let walkingHysteresis = 180;
let walkingTimeout = 5000;
let lastUpperLegSide = SIDES.NONE;
let currentWalkStatus = WALK_STATUS.STOP;
let walkTimer;
let walkStatusCallback;

let initHeadPositionZ;

const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
const setBounds = (point, max, gain) => {
  if (point > max - gain) {
    return max - gain;
  }

  return point;
};
const buildCustomEvent = (type, data) =>
  new CustomEvent(type, {
    bubbles: true,
    cancelable: true,
    detail: data,
  });
const dispatchCustomEvent = (targetElement, eventType, data) =>
  targetElement.dispatchEvent(buildCustomEvent(eventType, data));

const isLeftHandAvailable = () =>
  availableHands === AVAILABLE_HANDS.ONLY_LEFT || availableHands === AVAILABLE_HANDS.BOTH_HANDS;

const isRightHandAvailable = () =>
  availableHands === AVAILABLE_HANDS.ONLY_RIGHT || availableHands === AVAILABLE_HANDS.BOTH_HANDS;

const areHandsDisabled = () => availableHands === AVAILABLE_HANDS.NONE;

const isJoystickAvailable = () =>
  joystickHorizontalOrgan !== JOYSTICK_HORIZONTAL_MOVEMENT_ORGANS.NONE ||
  joystickVerticalOrgan !== JOYSTICK_VERTICAL_MOVEMENT_ORGANS.NONE;

// -----------------------------------------------------------------------
// notifications emitter
const CUSTOM_EVENT_TYPES = {
  HANDS_MOVE: 'hands_move',
  RIGHT_HAND_START: 'right_hand_start',
  LEFT_HAND_START: 'left_hand_start',
  RIGHT_HAND_END: 'right_hand_end',
  LEFT_HAND_END: 'left_hand_end',
  RIGHT_HAND_CLICK: 'right_hand_click',
  LEFT_HAND_CLICK: 'left_hand_click',
  RIGHT_HAND_STOPPED: 'right_hand_stopped',
  RIGHT_HAND_MOVED: 'right_hand_moved',
  LEFT_HAND_STOPPED: 'left_hand_stopped',
  LEFT_HAND_MOVED: 'right_hand_moved',
};

const notificationsEmitter = (() => {
  let tolerance; // pixels
  let handStartHoverMS;
  let handClickTimeMS;
  let leftHand, rightHand;

  const setInitialConfiguration = (tolerancePX = 25, handHoverMS = 250, handClickMS = 2000) => {
    tolerance = tolerancePX;
    handStartHoverMS = handHoverMS;
    handClickTimeMS = handClickMS;

    if (isRightHandAvailable()) {
      rightHand = common(true);
    }
    if (isLeftHandAvailable()) {
      leftHand = common(false);
    }
  };

  const updateHands = () => {
    rightHand = isRightHandAvailable() ? common(true) : undefined;
    leftHand = isLeftHandAvailable() ? common(false) : undefined;
  };

  const updateTolerance = (tolerancePX) => {
    tolerance = tolerancePX;
  };

  const notifyHandsMove = (data) => {
    if (areHandsDisabled()) {
      return;
    }
    dispatchCustomEvent(document, CUSTOM_EVENT_TYPES.HANDS_MOVE, data);
  };

  const notifyJoystickMove = (data) => {
    if (!isJoystickAvailable()) {
      return;
    }
    if (joystickMoveCallback) {
      joystickMoveCallback(data);
    }
  };

  const notifyWalkStatus = () => {
    if (walkStatusCallback) {
      walkStatusCallback(currentWalkStatus);
    }
  };

  const mouseMoveFunction = throttle((e) => {
    if (areHandsDisabled()) {
      return;
    }
    const { clientX, clientY } = e;

    let currentHand;
    if (e.shiftKey && isLeftHandAvailable()) {
      currentHand = leftHand;
    } else if (!e.shiftKey && isRightHandAvailable()) {
      currentHand = rightHand;
    } else {
      return;
    }

    notifyHandsMove({
      r_x: !e.shiftKey ? clientX : 0,
      r_y: !e.shiftKey ? clientY : 0,
      l_x: e.shiftKey ? clientX : 0,
      l_y: e.shiftKey ? clientY : 0,
    });
    currentHand.handleMove(e);
  }, 10);

  const getHandsPixelPointsFromBuffer = (buf) => {
    // offsetting everything by half a screen
    let leftX = buf[BUFFER_POSITIONS.LEFT_HAND_X];
    let leftY = buf[BUFFER_POSITIONS.LEFT_HAND_Y];
    let rightX = buf[BUFFER_POSITIONS.RIGHT_HAND_X];
    let rightY = buf[BUFFER_POSITIONS.RIGHT_HAND_Y];

    const frameWidth = buf[BUFFER_POSITIONS.FRAME_WIDTH];
    const frameHeight = buf[BUFFER_POSITIONS.FRAME_HEIGHT];

    if (frameWidth === 0 || frameHeight === 0) {
      return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    leftX = setBounds((leftX / frameWidth) * windowWidth, windowWidth, (windowWidth / 100) * 5);
    leftY = setBounds((leftY / frameHeight) * windowHeight, windowHeight, (windowHeight / 100) * 10);

    rightX = setBounds((rightX / frameWidth) * windowWidth, windowWidth, (windowWidth / 100) * 5);
    rightY = setBounds((rightY / frameHeight) * windowHeight, windowHeight, (windowHeight / 100) * 10);

    if (isGameAreaLessThanIFrameArea) {
      const gameAreaWidth = internalGameFrameBottomRight.x - internalGameFrameTopLeft.x;
      const gameAreaHeight = internalGameFrameBottomRight.y - internalGameFrameTopLeft.y;

      leftX = (leftX / windowWidth) * gameAreaWidth + internalGameFrameTopLeft.x;
      leftY = (leftY / windowHeight) * gameAreaHeight + internalGameFrameTopLeft.y;

      rightX = (rightX / windowWidth) * gameAreaWidth + internalGameFrameTopLeft.x;
      rightY = (rightY / windowHeight) * gameAreaHeight + internalGameFrameTopLeft.y;
    }
    if (isHandsHysteresis) {
      let { rX, rY, lX, lY } = getHandsPositionHysteresis(rightX, rightY, leftX, leftY);
      leftX = lX;
      leftY = lY;
      rightX = rX;
      rightY = rY;
    }
    const leftHandCords = {
      clientX: leftX,
      clientY: leftY,
    };

    const rightHandCords = {
      clientX: rightX,
      clientY: rightY,
    };
    return {
      leftHandCords,
      rightHandCords,
    };
  };

  const getNewCooardinate = (cord, center, gain) => {
    return cord > center ? cord + (cord - center) * (gain - 1) : cord - (center - cord) * (gain - 1);
  };

  const createHands = () => {
    if (areHandsCreated || areHandsDisabled()) {
      return;
    }
    const dom = document.getElementById('game-screen');
    const leftHand = document.getElementById(leftHandImgId);
    const rightHand = document.getElementById(rightHandImgId);

    if (leftHand) {
      dom.removeChild(leftHand);
    }

    if (rightHand) {
      dom.removeChild(rightHand);
    }

    if (isLeftHandAvailable()) {
      createHandImg(leftImgPath, leftHandImgId, 100, 0, 200, 0);
      setHandPositionWhenNoDetection(true);
    }
    if (isRightHandAvailable()) {
      createHandImg(rightImgPath, rightHandImgId, 300, 0, 400, 0);
      setHandPositionWhenNoDetection(false);
    }

    areHandsCreated = true;
  };

  const createJoystick = () => {
    if (isJoystickCreated) {
      return;
    }

    if (isJoystickAvailable()) {
      createJoystickImg(joystickImgPath, joystickImgId, 100, 0, 200, 0);
      setJoystickPositionWhenNoDetection();
    }

    isJoystickCreated = true;
  };

  const removeHands = () => {
    const dom = document.getElementById('game-screen');
    const leftHand = document.getElementById(leftHandImgId);
    const rightHand = document.getElementById(rightHandImgId);

    if (leftHand) {
      dom.removeChild(leftHand);
    }

    if (rightHand) {
      dom.removeChild(rightHand);
    }

    hands = [];
    areHandsCreated = false;
  };

  const moveHand = (src, id, left, top, isHandsNotRecognized = null) => {
    if (left < -100 || top < -100) {
      return;
    }

    let img = hands[id];

    if (!img) {
      img = document.getElementById(id);
      if (img) {
        img.setAttribute('src', src);
        img.style.display = 'block'; // make visible if running for the first time
        hands[id] = img;
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
  };

  const moveJoystick = (left, top) => {
    const img = document.getElementById(joystickImgId);
    if (!img) {
      return;
    }

    const xPosition = joyStickImagePositionX + left;
    const yPosition = joyStickImagePositionY + top;

    img.setAttribute('src', joystickImgPath);
    img.style.display = 'block';
    img.style.top = yPosition + 'px';
    img.style.left = xPosition + 'px';
    img.style.width = '4vw';
    img.style.height = '4vw';

    joyStickImagePositionX += left;
    joyStickImagePositionY += top;
  };

  const createHandImg = (imgPath, id, left, right, top, bottom) => {
    const handImg = document.createElement('img');
    handImg.setAttribute('src', imgPath);
    handImg.setAttribute('id', id);
    handImg.style.display = 'block';
    handImg.style.pointerEvents = 'none';
    handImg.style.position = 'fixed';
    handImg.style.top = top + 'px';
    handImg.style.left = left + 'px';
    handImg.style.zIndex = '2000';
    handImg.style.width = '4vw';
    handImg.style.height = '4vw';
    handImg.style.setProperty('transition', 'transform 0.05s linear 1s');
    handImg.style.setProperty('will-change', 'left, top');
    const dom = document.getElementById('game-screen');
    dom.appendChild(handImg);
  };

  const createJoystickImg = (left, top) => {
    const img = document.createElement('img');
    img.setAttribute('src', joystickImgPath);
    img.setAttribute('id', joystickImgId);
    img.style.display = 'block';
    img.style.pointerEvents = 'none';
    img.style.position = 'fixed';
    img.style.top = top + 'px';
    img.style.left = left + 'px';
    img.style.zIndex = '2000';
    img.style.width = '4vw';
    img.style.height = '4vw';
    img.style.setProperty('transition', 'transform 0.05s linear 1s');
    img.style.setProperty('will-change', 'left, top');
    const gameElement = document.getElementById('game-screen');
    gameElement.appendChild(img);
  };

  const setHandPositionWhenNoDetection = (isLeft) => {
    if (areHandsDisabled()) {
      return;
    }
    if (isLeft && isLeftHandAvailable()) {
      const leftHandDefaultPosition = {
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight - (window.innerHeight / 100) * 10,
      };
      moveHand(leftImgPath, leftHandImgId, leftHandDefaultPosition.x, leftHandDefaultPosition.y, true);
    } else if (!isLeft && isRightHandAvailable()) {
      const rightHandDefaultPosition = {
        x: window.innerWidth / 2 - 80 + 100,
        y: window.innerHeight - (window.innerHeight / 100) * 10,
      };
      moveHand(rightImgPath, rightHandImgId, rightHandDefaultPosition.x, rightHandDefaultPosition.y, true);
    }
  };

  const setJoystickPositionWhenNoDetection = () => {
    if (!isJoystickAvailable()) {
      return;
    }
    joyStickImagePositionX = window.innerWidth / 2 - 80;
    joyStickImagePositionY = window.innerHeight - (window.innerHeight / 100) * 10;
    moveJoystick(0, 0);
  };

  const isHandInInternalGameFrame = (handPositionX, handPositionY) => {
    return (
      handPositionX > internalGameFrameTopLeft.x &&
      handPositionX < internalGameFrameBottomRight.x &&
      handPositionY > internalGameFrameTopLeft.y &&
      handPositionY < internalGameFrameBottomRight.y
    );
  };

  const handleHandsFromBuffer = (buf) => {
    if (!buf) {
      removeHands();
      return;
    }
    const handsPixels = getHandsPixelPointsFromBuffer(buf);
    if (!handsPixels) {
      return;
    }

    let { rightHandCords, leftHandCords } = handsPixels;

    if (isGameAreaLessThanIFrameArea) {
      if (isHandInInternalGameFrame(rightHandCords.clientX, rightHandCords.clientY) || !previousRightHandCords) {
        previousRightHandCords = { ...rightHandCords };
      } else {
        rightHandCords = { ...previousRightHandCords };
      }

      if (isHandInInternalGameFrame(leftHandCords.clientX, leftHandCords.clientY) || !previousLeftHandLCords) {
        previousLeftHandLCords = { ...leftHandCords };
      } else {
        leftHandCords = { ...previousLeftHandLCords };
      }
    }

    createHands();

    notifyHandsMove({
      r_x: rightHandCords.clientX,
      r_y: rightHandCords.clientY,
      l_x: leftHandCords.clientX,
      l_y: leftHandCords.clientY,
    });
    if (
      isRightHandAvailable() &&
      !isNaN(rightHandCords.clientX) &&
      !isNaN(rightHandCords.clientY) &&
      rightHandCords.clientX > 0 &&
      rightHandCords.clientY > 0 &&
      rightHand
    ) {
      rightHand.handleMove(rightHandCords);
      moveHand(rightImgPath, rightHandImgId, rightHandCords.clientX, rightHandCords.clientY);
    }
    if (
      isLeftHandAvailable() &&
      !isNaN(leftHandCords.clientX) &&
      !isNaN(leftHandCords.clientY) &&
      leftHandCords.clientX > 0 &&
      leftHandCords.clientY > 0 &&
      leftHand
    ) {
      leftHand.handleMove(leftHandCords);
      moveHand(leftImgPath, leftHandImgId, leftHandCords.clientX, leftHandCords.clientY);
    }

    if (isLeftHandAvailable() && leftHand && leftHandCords.clientX === 0 && leftHandCords.clientY === 0) {
      setTimeout(() => {
        if (leftHandCords.clientX === 0 && leftHandCords.clientY === 0) {
          setHandPositionWhenNoDetection(true);
        }
      }, 2000);
    }
    if (isRightHandAvailable() && rightHand && rightHandCords.clientX === 0 && rightHandCords.clientY === 0) {
      setTimeout(() => {
        if (rightHandCords.clientX === 0 && rightHandCords.clientY === 0) {
          setHandPositionWhenNoDetection(false);
        }
      }, 2000);
    }
  };

  const handleJoystickFromBuffer = (buf) => {
    if (!buf || !isJoystickAvailable()) {
      return;
    }

    if (!isJoystickCreated) {
      createJoystick();
    }

    const newHorizontalDirection = getHorizontalDirectionFromBuffer(buf);
    const newVerticalDirection =
      newHorizontalDirection === DIRECTIONS.NONE ? getVerticalDirectionFromBuffer(buf) : DIRECTIONS.NONE;

    if (
      newHorizontalDirection !== currentJoystickHorizontalDirection ||
      newVerticalDirection !== currentJoystickVerticalDirection
    ) {
      notifyJoystickMove({
        horizontal: newHorizontalDirection,
        vertical: newVerticalDirection,
      });

      currentJoystickHorizontalDirection = newHorizontalDirection;
      currentJoystickVerticalDirection = newVerticalDirection;
    }

    const movementsAvailability = getMovementAvailabilities(
      currentJoystickHorizontalDirection,
      currentJoystickVerticalDirection
    );

    const xDirectionMovementMultiplier = currentJoystickHorizontalDirection == DIRECTIONS.RIGHT ? 1 : -1;
    const yDirectionMovementMultiplier = currentJoystickVerticalDirection == DIRECTIONS.DOWN ? 1 : -1;

    const xPixelsToMove =
      currentJoystickHorizontalDirection == DIRECTIONS.NONE || !movementsAvailability.horizontal
        ? 0
        : NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT * xDirectionMovementMultiplier;
    const yPixelsToMove =
      currentJoystickVerticalDirection == DIRECTIONS.NONE || !movementsAvailability.vertical
        ? 0
        : NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT * yDirectionMovementMultiplier;

    moveJoystick(xPixelsToMove, yPixelsToMove);
  };

  const getHorizontalDirectionFromBuffer = (buf) => {
    switch (joystickHorizontalOrgan) {
      case JOYSTICK_HORIZONTAL_MOVEMENT_ORGANS.BACK:
        return getHorizontalDirectionAccordingToTheBack(buf);
      default:
        return DIRECTIONS.NONE;
    }
  };

  const getVerticalDirectionFromBuffer = (buf) => {
    switch (joystickVerticalOrgan) {
      case JOYSTICK_VERTICAL_MOVEMENT_ORGANS.HEAD:
        return getVerticalDirectionAccordingToTheHead(buf);
      default:
        return DIRECTIONS.NONE;
    }
  };

  const getHorizontalDirectionAccordingToTheBack = (buf) => {
    let startX, startY, middleX, middleY, endX, endY;

    startX = buf[BUFFER_POSITIONS.RIGHT_SHOULDER_X];
    startY = buf[BUFFER_POSITIONS.RIGHT_SHOULDER_Y];
    middleX = buf[BUFFER_POSITIONS.RIGHT_HIP_X];
    middleY = buf[BUFFER_POSITIONS.RIGHT_HIP_Y];
    endX = middleX + 100;
    endY = middleY;

    const rightAngle = getAngleBetweenPoints(startX, startY, middleX, middleY, endX, endY);
    if (rightAngle < MAX_ANGLE_FOR_HORIZONTAL_BACK_MOVEMENT) {
      return DIRECTIONS.RIGHT;
    }

    startX = buf[BUFFER_POSITIONS.LEFT_SHOULDER_X];
    startY = buf[BUFFER_POSITIONS.LEFT_SHOULDER_Y];
    middleX = buf[BUFFER_POSITIONS.LEFT_HIP_X];
    middleY = buf[BUFFER_POSITIONS.LEFT_HIP_Y];
    endX = 0;
    endY = middleY;

    const leftAngle = getAngleBetweenPoints(startX, startY, middleX, middleY, endX, endY);
    if (360 - leftAngle < MAX_ANGLE_FOR_HORIZONTAL_BACK_MOVEMENT) {
      return DIRECTIONS.LEFT;
    }

    return DIRECTIONS.NONE;
  };

  function getHandsPositionHysteresis(rightX, rightY, leftX, leftY) {
    const ignoreZone = window.innerHeight * 0.85;
    const frameDetectionCount = 3;

    if (leftHandStatus === HAND_STATUS.ACTIVE) {
      if (leftY === 0 || leftY > ignoreZone) {
        leftHandStatus = HAND_STATUS.DISABLED;
      }
      return { rX: 0, rY: 0, lX: leftX, lY: leftY };
    }
    if (rightHandStatus === HAND_STATUS.ACTIVE) {
      if (rightY === 0 || rightY > ignoreZone) {
        rightHandStatus = HAND_STATUS.DISABLED;
      }
      return { rX: rightX, rY: rightY, lX: 0, lY: 0 };
    }
    if (rightHandStatus === HAND_STATUS.DISABLED && leftHandStatus === HAND_STATUS.DISABLED) {
      if (leftY < ignoreZone && leftY !== 0) {
        if (leftHandFrameDetectionCounter > frameDetectionCount) {
          leftHandStatus = HAND_STATUS.ACTIVE;
          leftHandFrameDetectionCounter = 0;
        }
        leftHandFrameDetectionCounter++;
      } else if (rightY < ignoreZone && rightY !== 0) {
        if (rightHandFrameDetectionCounter > frameDetectionCount) {
          rightHandStatus = HAND_STATUS.ACTIVE;
          rightHandFrameDetectionCounter = 0;
        }
        rightHandFrameDetectionCounter++;
      }
      return { rX: 0, rY: 0, lX: 0, lY: 0 };
    }
  }

  const getVerticalDirectionAccordingToTheHead = (buf) => {
    const headZ = buf[BUFFER_POSITIONS.HEAD_Z];
    const rightHipZ = buf[BUFFER_POSITIONS.RIGHT_HIP_Z];

    if (headZ === 0 || rightHipZ === 0) {
      return DIRECTIONS.NONE;
    }

    if (headZ > initHeadPositionZ + HEAD_UP_VERTICAL_MOVEMENT_HYSTERESIS) {
      return DIRECTIONS.UP;
    }

    if (headZ < initHeadPositionZ - HEAD_DOWN_VERTICAL_MOVEMENT_HYSTERESIS) {
      return DIRECTIONS.DOWN;
    }

    return DIRECTIONS.NONE;
  };

  const getMovementAvailabilities = (horizontalDirection, verticalDirection) => {
    if (horizontalDirection == DIRECTIONS.NONE && verticalDirection == DIRECTIONS.NONE) {
      return {
        horizontal: false,
        vertical: false,
      };
    }

    let isHorizontalMovementWillBeOutsideGameArea = false;
    let isVerticalMovementWillBeOutsideGameArea = false;

    if (!isGameAreaLessThanIFrameArea) {
      if (horizontalDirection !== DIRECTIONS.NONE) {
        isHorizontalMovementWillBeOutsideGameArea =
          horizontalDirection == DIRECTIONS.RIGHT
            ? joyStickImagePositionX + NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT >
              window.innerWidth - window.innerWidth * 0.04
            : joyStickImagePositionX - NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT < 0;
      }
      if (verticalDirection !== DIRECTIONS.NONE) {
        isVerticalMovementWillBeOutsideGameArea =
          verticalDirection == DIRECTIONS.DOWN
            ? joyStickImagePositionY + NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT >
              window.innerHeight - window.innerHeight * 0.04
            : joyStickImagePositionY - NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT < 0;
      }

      return {
        horizontal: !isHorizontalMovementWillBeOutsideGameArea,
        vertical: !isVerticalMovementWillBeOutsideGameArea,
      };
    }

    if (horizontalDirection !== DIRECTIONS.NONE) {
      isHorizontalMovementWillBeOutsideGameArea =
        horizontalDirection == DIRECTIONS.RIGHT
          ? joyStickImagePositionX + NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT > internalGameFrameBottomRight.x
          : joyStickImagePositionX - NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT < internalGameFrameTopLeft.x;
    }
    if (verticalDirection !== DIRECTIONS.NONE) {
      isVerticalMovementWillBeOutsideGameArea =
        verticalDirection == DIRECTIONS.DOWN
          ? joyStickImagePositionY + NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT > internalGameFrameBottomRight.y
          : joyStickImagePositionY - NUMBER_OF_PIXELS_IN_JOYSTICK_MOVEMENT < internalGameFrameTopLeft.y;
    }

    return {
      horizontal: !isHorizontalMovementWillBeOutsideGameArea,
      vertical: !isVerticalMovementWillBeOutsideGameArea,
    };
  };

  const getAngleBetweenPoints = (startX, startY, middleX, middleY, endX, endY) => {
    const radians = Math.atan2(endY - middleY, endX - middleX) - Math.atan2(startY - middleY, startX - middleX);
    const angle = Math.abs((radians * 180.0) / Math.PI);
    return angle;
  };

  // common logic for dispatching hand events
  const common = (isRightHand) => {
    let previousElement;
    let previousCords;
    let isHandStart;

    let hoverTimeoutId;
    let clickTimeoutId;

    let customEventType;

    const initParams = () => {
      previousElement = null;
      previousCords = null;
      isHandStart = false;
    };
    const initEvents = (isRightHand) => {
      return {
        HAND_START: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_START : CUSTOM_EVENT_TYPES.LEFT_HAND_START,
        HAND_END: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_END : CUSTOM_EVENT_TYPES.LEFT_HAND_END,
        HAND_CLICK: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_CLICK : CUSTOM_EVENT_TYPES.LEFT_HAND_CLICK,
        HAND_STOPPED: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_STOPPED : CUSTOM_EVENT_TYPES.LEFT_HAND_STOPPED,
        HAND_MOVE: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_MOVED : CUSTOM_EVENT_TYPES.LEFT_HAND_MOVED,
      };
    };

    initParams();
    customEventType = initEvents(isRightHand);

    const handleMove = ({ clientX, clientY }) => {
      const intersectElement = document.elementFromPoint(clientX, clientY);

      if (!previousElement) {
        previousElement = intersectElement;
        previousCords = {
          x: clientX,
          y: clientY,
        };
        startHoverTimout({ clientX, clientY });
        return;
      }
      checkIfInBounds(clientX, clientY);
    };
    // specific events
    const notifySpecificHandEvent = (data, type) => {
      if (!previousElement) {
        return;
      }
      dispatchCustomEvent(previousElement, type, data);
    };
    const startHoverTimout = (data) => {
      hoverTimeoutId = setTimeout(() => {
        handleStartHand(data);
      }, handStartHoverMS);
    };
    const clearHoverTimeout = () => {
      clearTimeout(hoverTimeoutId);
      hoverTimeoutId = null;
    };
    const startClickTimeout = (data) => {
      clickTimeoutId = setTimeout(() => {
        handleClickHand(data);
      }, handClickTimeMS);
    };
    const clearClickTimeout = () => {
      clearTimeout(clickTimeoutId);
      clickTimeoutId = null;
    };
    const checkIfInBounds = (clientX, clientY) => {
      if (!previousCords) {
        return;
      }
      // in bounds
      if (Math.abs(clientX - previousCords.x) <= tolerance && Math.abs(clientY - previousCords.y) <= tolerance) {
        return;
      }
      handleOutOfBounds({ clientX, clientY });
    };
    const handleOutOfBounds = (data) => {
      if (isHandStart) {
        handleEndHand(data);
      } else {
        resetToInitialState();
      }
    };
    const handleStartHand = (data) => {
      isHandStart = true;
      notifySpecificHandEvent(data, customEventType.HAND_START);
      notifySpecificHandEvent(data, customEventType.HAND_STOPPED);
      startClickTimeout(data);
    };
    const handleEndHand = (data) => {
      if (!isHandStart) {
        return;
      }
      notifySpecificHandEvent(data, customEventType.HAND_END);
      notifySpecificHandEvent(data, customEventType.HAND_MOVE);
      resetToInitialState();
    };
    const handleClickHand = (data) => {
      if (!isHandStart) {
        return;
      }
      notifySpecificHandEvent(data, customEventType.HAND_CLICK);
      resetToInitialState();
    };
    const resetToInitialState = () => {
      initParams();
      clearHoverTimeout();
      clearClickTimeout();
    };

    return {
      handleMove,
    };
  };

  const handleWalkingFromBuffer = (buf) => {
    const leftKneeY = buf[BUFFER_POSITIONS.LEFT_KNEE_Y];
    const rightKneeY = buf[BUFFER_POSITIONS.RIGHT_KNEE_Y];

    const leftKneeZ = buf[BUFFER_POSITIONS.LEFT_KNEE_Z];
    const rightKneeZ = buf[BUFFER_POSITIONS.RIGHT_KNEE_Z];

    if (!leftKneeY || !rightKneeY || !leftKneeZ || !rightKneeZ) {
      return;
    }

    // const topLeg = leftKneeY < rightKneeY ? SIDES.LEFT : SIDES.RIGHT;
    // if (topLeg === lastUpperLegSide) {
    //   return;
    // }

    if (
      Math.abs(leftKneeY - rightKneeY) < walkingHysteresis &&
      Math.abs(leftKneeZ - rightKneeZ) < walkingHysteresis / 1000
    ) {
      return;
    }

    // lastUpperLegSide = topLeg;
    if (walkTimer) {
      clearTimeout(walkTimer);
    }
    if (currentWalkStatus === WALK_STATUS.STOP) {
      currentWalkStatus = WALK_STATUS.WALK;
      notifyWalkStatus();
    }
    walkTimer = setTimeout(() => {
      currentWalkStatus = WALK_STATUS.STOP;
      notifyWalkStatus();
    }, walkingTimeout);
  };

  //**************************************************************************************************************** */
  //************************                          END OF METHODS                           ********************* */
  //**************************************************************************************************************** */

  return {
    subscribe: (initialParameters) => {
      // set notifcations emitter starting parameters
      const { tolerancePX, handHoverMS, handClickMS } = initialParameters;
      setInitialConfiguration(tolerancePX, handHoverMS, handClickMS);
      document.addEventListener('mousemove', mouseMoveFunction);
    },
    unsubscribe: () => {
      rightHand = null;
      leftHand = null;
      document.removeEventListener('mousemove', mouseMoveFunction);
    },
    handleSkeleton: (buf) => {
      if (!buf || buf.length === 0) {
        return;
      }
      if (leftImgPath && rightImgPath) {
        handleHandsFromBuffer(buf);
      }
      if (joystickImgPath) {
        handleJoystickFromBuffer(buf);
      }
      if (isWalkingSupport) {
        handleWalkingFromBuffer(buf);
      }
    },
    updateToleranceSettings: (tolerance) => {
      updateTolerance(tolerance);
    },
    updateHandsSettings: () => {
      updateHands();
    },
  };
})();

// -----------------------------------------------------------------------

const MESSAGES = {
  READY: 'ready',
  SETTINGS: 'settings',
  IS_THERAPIST: 'is_therapist',
  NEW_SETTINGS: 'new_settings',
  SKELETON: 'skeleton',
  STATE: 'state',
  SUMMARY: 'summary',
  PAUSE: 'pause',
  RESUME: 'resume',
  GENERIC_MESSAGE: 'generic_message',
  QUIT_GAME: 'end_game',
  GET_NOTIFICATIONS: 'get_notifications',
  GET_SDK_VERSION: 'get_sdk_version',
  QUIT_GAME_FROM_THERAPIST: 'quit_game_from_therapist',
  RESTART_GAME: 'restart_game',
  SETTINGS_MODAL_OPENED: 'settings_modal_opened',
  SHOW_GAME_INSTRUCTIONS: 'show_game_instructions',
  SEND_QUIT_MESSAGE: 'send_quit_message',
  SHOW_END_GAME_MODAL: 'show_end_game_modal',
  SEND_RESTART_GAME_MESSAGE: 'send_restart_game_massage',
  ENTER_FULL_SCREEN_MODE: 'enter_full_screen_mode',
  MEDIA_STREAM: 'media_stream',
  GAME_READY_TO_START: 'game_ready_to_start',
  START_GAME: 'start_game',
  RECOVERED_NETWORK_FALIURE: 'recovered_network_faliure',
  NEW_EXTERNAL_SETTINGS: 'new_external_settings',
  CLOSE_EXTERNAL_CONFIGURATOR: 'close_external_configurator',
  MUTE_GAME_SOUND: 'mute_game_sound',
  SEND_MEDIA_STREAM: 'send_media_stream',
  APP_DISPLAY_STATUS: 'app_display_status',
  GAME_INTRODUCTION_DONE: 'game_introduction_done',
  APP_DISPLAY_GAME_MESSAGE: 'app_display_game_message',
  UPLOAD_IMAGE: 'upload_image',
  IMAGE_UPLOADED: 'image_uploaded',
  ADD_USER_GAME_DATA: 'add_user_game_data',
  UPDATE_USER_GAME_DATA: 'update_user_game_data',
  DELETE_USER_GAME_DATA: 'delete_user_game_data',
  UPDATE_USER_GAME_DATA_STATUS: 'update_user_game_data_status',
  GET_USER_GAME_DATA: 'get_user_game_data',
  USER_GAME_DATA_CREATED: 'user_game_data_created',
  USER_GAME_DATA: 'user_game_data',
  ADD_GAME_DATA: 'add_game_data',
  UPDATE_GAME_DATA: 'update_game_data',
  DELETE_GAME_DATA: 'delete_game_data',
  UPDATE_GAME_DATA_STATUS: 'update_game_data_status',
  GAME_DATA_CREATED: 'game_data_created',
  GET_SHORT_GAME_DATA: 'get_short_game_data',
  SHORT_GAME_DATA: 'short_game_data',
  GET_GAME_DATA: 'get_game_data',
  GAME_DATA: 'game_data',
  CHANGE_USER_GAME_DATA_DRAWER: 'change_user_game_data_drawer',
  ADD_USER_GAME_LOG: 'add_user_game_log',
  SEND_LOG_TO_SERVER: 'send_log_to_server',
};

export default function sdk() {
  const doNothing = () => {};
  let therapist = undefined;
  let settings = undefined;
  let therapistPeerId = undefined;
  let listeningToNotifications = false;
  let isPaused = false;
  let isInSplitScreenView = undefined;
  let connectedPatientSettings = undefined;
  let userPeerId = undefined;
  let externalConfigurator = undefined;
  let playerDetails = undefined;

  const callbacks = initCallbacks(MESSAGES);

  function initCallbacks(msgs) {
    const callbacks = {};
    for (const msg of Object.values(msgs)) {
      callbacks[msg] = doNothing;
    }

    return callbacks;
  }
  function bindEvent(element, eventName, eventHandler) {
    if (element.addEventListener) {
      element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
      element.attachEvent('on' + eventName, eventHandler);
    }
  }
  function registerToCallback(key, callback) {
    callbacks[key] = callback;
  }
  function addTypeToMessage(msg, type) {
    const msgToSend = {
      type,
      msg,
    };
    return msgToSend;
  }
  function sendMessageToParent(msg) {
    window.parent.postMessage(JSON.stringify(msg), '*');
  }
  function sendSdkVersion() {
    sendMessageToParent(addTypeToMessage(sdkVersion, MESSAGES.GET_SDK_VERSION));
  }

  function checkSdkReady() {
    // patient ready
    if (settings) {
      callbacks[MESSAGES.READY](settings);
    }
    // therapist ready
    if (therapist) {
      callbacks[MESSAGES.READY]();
    }
  }

  function setHandImages(leftHandPath, rightHandPath) {
    leftImgPath = leftHandPath;
    rightImgPath = rightHandPath;
    areHandsCreated = false;
  }

  function setJoystickImage(path) {
    joystickImgPath = path;
    isJoystickCreated = false;
  }

  function setGameAreaBoundsByPoints(topLeft, bottomRight) {
    internalGameFrameTopLeft = topLeft;
    internalGameFrameBottomRight = bottomRight;
    isGameAreaLessThanIFrameArea = true;
  }

  function subscribeToMessages() {
    bindEvent(window, 'message', function (e) {
      if (e.data.buffer) {
        callbacks[MESSAGES.MEDIA_STREAM](e.data);
      }
      if (typeof e.data !== 'string') {
        return;
      }
      var data = JSON.parse(e.data);
      switch (data.type) {
        case MESSAGES.SETTINGS:
          settings = data.msg;
          checkSdkReady();
          break;
        case MESSAGES.IS_THERAPIST:
          const {
            isTherapist,
            peerId = null,
            isSplitScreenView = null,
            patientSettings = null,
            game_settings = null,
            userId = null,
            isExternalConfigurator = false,
            playerUserId = 0,
            playerFirstName = '',
            playerLastName = '',
          } = data.msg;
          therapist = isTherapist;
          therapistPeerId = peerId;
          userPeerId = userId;
          isInSplitScreenView = isSplitScreenView;
          connectedPatientSettings = patientSettings;
          externalConfigurator = isExternalConfigurator;
          settings = game_settings;
          if (connectedPatientSettings) {
            connectedPatientSettings.isTherapist = isTherapist;
          }
          playerDetails = { playerUserId, playerFirstName, playerLastName };
          checkSdkReady();
          break;
        case MESSAGES.NEW_SETTINGS:
          settings = data.msg;
          callbacks[MESSAGES.NEW_SETTINGS](data.msg);
          break;
        case MESSAGES.SKELETON:
          if (isPaused) {
            return;
          }
          if (listeningToNotifications) {
            notificationsEmitter.handleSkeleton(data.msg);
          }
          callbacks[MESSAGES.SKELETON](data.msg);
          break;
        case MESSAGES.STATE:
          callbacks[MESSAGES.STATE](data.msg);
          break;
        case MESSAGES.SUMMARY:
          callbacks[MESSAGES.SUMMARY](data.msg);
          break;
        case MESSAGES.PAUSE:
          isPaused = true;
          callbacks[MESSAGES.PAUSE](data.msg);
          break;
        case MESSAGES.RESUME:
          isPaused = false;
          callbacks[MESSAGES.RESUME](data.msg);
          break;
        case MESSAGES.GENERIC_MESSAGE:
          callbacks[MESSAGES.GENERIC_MESSAGE](data.msg);
          break;
        case MESSAGES.QUIT_GAME:
          callbacks[MESSAGES.QUIT_GAME](data.msg);
          break;
        case MESSAGES.QUIT_GAME_FROM_THERAPIST:
          callbacks[MESSAGES.QUIT_GAME_FROM_THERAPIST](data.msg);
          break;
        case MESSAGES.RESTART_GAME:
          callbacks[MESSAGES.RESTART_GAME](data.msg);
          break;
        case MESSAGES.GET_SDK_VERSION:
          callbacks[MESSAGES.GET_SDK_VERSION](data.msg);
          break;
        case MESSAGES.READY:
          callbacks[MESSAGES.READY](data.msg);
          break;
        case MESSAGES.SHOW_GAME_INSTRUCTIONS:
          callbacks[MESSAGES.SHOW_GAME_INSTRUCTIONS](data.msg);
          break;
        case MESSAGES.SETTINGS_MODAL_OPENED:
          callbacks[MESSAGES.SETTINGS_MODAL_OPENED](data.msg);
          break;
        case MESSAGES.SEND_QUIT_MESSAGE:
          callbacks[MESSAGES.SEND_QUIT_MESSAGE](data.msg);
          break;
        case MESSAGES.SHOW_END_GAME_MODAL:
          callbacks[MESSAGES.SHOW_END_GAME_MODAL](data.msg);
          break;
        case MESSAGES.SEND_RESTART_GAME_MESSAGE:
          callbacks[MESSAGES.SEND_RESTART_GAME_MESSAGE](data.msg);
          break;
        case MESSAGES.ENTER_FULL_SCREEN_MODE:
          callbacks[MESSAGES.ENTER_FULL_SCREEN_MODE](data.msg);
          break;
        case MESSAGES.MEDIA_STREAM:
          callbacks[MESSAGES.MEDIA_STREAM](data.msg);
          break;
        case MESSAGES.START_GAME:
          callbacks[MESSAGES.START_GAME](data.msg);
          break;
        case MESSAGES.GAME_READY_TO_START:
          callbacks[MESSAGES.GAME_READY_TO_START](data.msg);
          break;
        case MESSAGES.RECOVERED_NETWORK_FALIURE:
          callbacks[MESSAGES.RECOVERED_NETWORK_FALIURE](data.msg);
          break;
        case MESSAGES.MUTE_GAME_SOUND:
          callbacks[MESSAGES.MUTE_GAME_SOUND](data.msg);
          break;
        case MESSAGES.SEND_MEDIA_STREAM:
          callbacks[MESSAGES.SEND_MEDIA_STREAM](data.msg);
          break;
        case MESSAGES.APP_DISPLAY_STATUS:
          callbacks[MESSAGES.APP_DISPLAY_STATUS](data.msg);
          break;
        case MESSAGES.GAME_INTRODUCTION_DONE:
          callbacks[MESSAGES.GAME_INTRODUCTION_DONE](data.msg);
          break;
        case MESSAGES.IMAGE_UPLOADED:
          callbacks[MESSAGES.IMAGE_UPLOADED](data.msg);
          break;
        case MESSAGES.USER_GAME_DATA_CREATED:
          callbacks[MESSAGES.USER_GAME_DATA_CREATED](data.msg);
          break;
        case MESSAGES.USER_GAME_DATA:
          callbacks[MESSAGES.USER_GAME_DATA](data.msg);
          break;
        case MESSAGES.SHORT_GAME_DATA:
          callbacks[MESSAGES.SHORT_GAME_DATA](data.msg);
          break;
        case MESSAGES.GAME_DATA:
          callbacks[MESSAGES.GAME_DATA](data.msg);
          break;
        default:
          console.log('no case for this type of message', data.type);
          break;
      }
    });
  }

  return {
    init: function () {
      subscribeToMessages();
      sendSdkVersion();
    },

    setInitialHeadPositionZ: function (data) {
      initHeadPositionZ = data;
    },

    getSdkReady: function (callback) {
      registerToCallback(MESSAGES.READY, callback);
    },
    isTherapist: function () {
      return therapist;
    },
    therapistPeerId: function () {
      return therapistPeerId;
    },
    isSplitScreenView: function () {
      return isInSplitScreenView;
    },
    getSettings: function () {
      return settings;
    },
    getConnectedPatientSettings: function () {
      return connectedPatientSettings;
    },
    isExternalConfigurator: function () {
      return externalConfigurator;
    },
    getNewSettings: function (callback) {
      registerToCallback(MESSAGES.NEW_SETTINGS, callback);
    },
    getSkeleton: function (callback) {
      registerToCallback(MESSAGES.SKELETON, callback);
    },
    getGameState: function (callback) {
      registerToCallback(MESSAGES.STATE, callback);
    },
    getAppDisplayStatus: function (callback) {
      registerToCallback(MESSAGES.APP_DISPLAY_STATUS, callback);
    },
    getAppIntroductionDone: function (callback) {
      registerToCallback(MESSAGES.GAME_INTRODUCTION_DONE, callback);
    },
    getGenericMessage: function (callback) {
      registerToCallback(MESSAGES.GENERIC_MESSAGE, callback);
    },
    getQuitGame: function (callback) {
      registerToCallback(MESSAGES.QUIT_GAME, callback);
    },
    getRestartGame: function (callback) {
      registerToCallback(MESSAGES.RESTART_GAME, callback);
    },
    getMediaStream: function (callback) {
      registerToCallback(MESSAGES.MEDIA_STREAM, callback);
    },
    getNetworkErrorRecovery: function (callback) {
      registerToCallback(MESSAGES.RECOVERED_NETWORK_FALIURE, callback);
    },
    getGameAudioStatus: function (callback) {
      registerToCallback(MESSAGES.MUTE_GAME_SOUND, callback);
    },
    registerToNotifications: function (initialParameters) {
      listeningToNotifications = true;
      notificationsEmitter.subscribe(initialParameters);
      sendMessageToParent(addTypeToMessage({}, MESSAGES.GET_NOTIFICATIONS));
    },
    updateToleranceSettings: function (tolerance) {
      notificationsEmitter.updateToleranceSettings(tolerance);
    },
    onPause: function (callback) {
      registerToCallback(MESSAGES.PAUSE, callback);
    },
    onResume: function (callback) {
      registerToCallback(MESSAGES.RESUME, callback);
    },
    getShowGameIntructions: function (callback) {
      registerToCallback(MESSAGES.SHOW_GAME_INSTRUCTIONS, callback);
    },
    getSettingsModalOpened: function (callback) {
      registerToCallback(MESSAGES.SETTINGS_MODAL_OPENED, callback);
    },
    getGameReadyToStartMessage: function (callback) {
      registerToCallback(MESSAGES.GAME_READY_TO_START, callback);
    },
    getStartGameMessage: function (callback) {
      registerToCallback(MESSAGES.START_GAME, callback);
    },
    saveSettings: function (msg) {
      // only therapist send this
      msg['peerId'] = therapistPeerId;
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.NEW_SETTINGS));
    },
    saveExternalSettings: function (msg) {
      // only therapist send this
      msg['peerId'] = therapistPeerId;
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.NEW_EXTERNAL_SETTINGS));
    },
    sendGameState: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.STATE));
    },
    sendAppDisplayStatus: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.APP_DISPLAY_STATUS));
    },
    sendAppIntroductionDone: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.GAME_INTRODUCTION_DONE));
    },
    sendAppDisplayGameMessage: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.APP_DISPLAY_GAME_MESSAGE));
    },
    sendMediaStream: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.SEND_MEDIA_STREAM));
    },
    sendGameSummary: function (msg) {
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.SUMMARY));
    },
    sendQuitGame: function () {
      notificationsEmitter.unsubscribe();
      sendMessageToParent(addTypeToMessage({}, MESSAGES.QUIT_GAME));
    },
    sendQuitGameFromTherapist: function () {
      notificationsEmitter.unsubscribe();
      sendMessageToParent(
        addTypeToMessage({ type: 'quit', peerId: therapistPeerId }, MESSAGES.QUIT_GAME_FROM_THERAPIST)
      );
    },
    sendReloadGameFromTherapsit: function () {
      notificationsEmitter.unsubscribe();
      sendMessageToParent(addTypeToMessage({ type: 'restart_game', peerId: therapistPeerId }, MESSAGES.RESTART_GAME));
    },
    sendGenericMessage: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.GENERIC_MESSAGE));
    },
    sendSettingModalOpenStatus: function (msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.SETTINGS_MODAL_OPENED));
    },
    sendQuitMessage: function (callback) {
      registerToCallback(MESSAGES.SEND_QUIT_MESSAGE, callback);
    },
    sendShowEndGameModalMessage: function (msg) {
      msg['peerId'] = userPeerId;
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.SHOW_END_GAME_MODAL));
    },
    sendRestartMessage: function (callback) {
      registerToCallback(MESSAGES.SEND_RESTART_GAME_MESSAGE, callback);
    },
    sendFullScreenMessage: function (msg) {
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.ENTER_FULL_SCREEN_MODE));
    },
    sendGameReadyToStartMessage: function (msg) {
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.GAME_READY_TO_START));
    },
    closeExternalConfigurator: function (msg) {
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.CLOSE_EXTERNAL_CONFIGURATOR));
    },
    setGameAreaBounds: function (topLeft, bottomRight) {
      setGameAreaBoundsByPoints(topLeft, bottomRight);
    },
    setHandImagesPaths: function (leftHandImagePath, rightHandImagePath) {
      setHandImages(leftHandImagePath, rightHandImagePath);
    },
    setJoystickImagePath: function (path) {
      setJoystickImage(path);
    },
    setAvailableHands: function (handsToShow) {
      if (Object.values(AVAILABLE_HANDS).includes(handsToShow) && handsToShow !== availableHands) {
        availableHands = handsToShow;
        areHandsCreated = false;
        notificationsEmitter.updateHandsSettings();
      }
    },
    setJoystickOrgan: function (horizontalMovementOrgan, verticalMovementOrgan) {
      if (
        Object.values(JOYSTICK_HORIZONTAL_MOVEMENT_ORGANS).includes(horizontalMovementOrgan) &&
        horizontalMovementOrgan !== joystickHorizontalOrgan
      ) {
        joystickHorizontalOrgan = horizontalMovementOrgan;
        isJoystickCreated = false;
      }
      if (
        Object.values(JOYSTICK_VERTICAL_MOVEMENT_ORGANS).includes(verticalMovementOrgan) &&
        verticalMovementOrgan !== joystickVerticalOrgan
      ) {
        joystickVerticalOrgan = verticalMovementOrgan;
        isJoystickCreated = false;
      }
    },
    getJoystickMove: function (callback) {
      joystickMoveCallback = callback;
    },
    setHandsHysteresis(status) {
      isHandsHysteresis = status;
    },
    setWalkingSupport(walkingSupport, timeout = 5000, detectionLevel = 180, callback = null) {
      isWalkingSupport = walkingSupport;
      walkingTimeout = timeout;
      walkingHysteresis = detectionLevel;
      walkStatusCallback = callback;
    },
    uploadImage(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.UPLOAD_IMAGE));
    },
    getImageUploaded: function (callback) {
      registerToCallback(MESSAGES.IMAGE_UPLOADED, callback);
    },
    getPlayerDetails() {
      return playerDetails;
    },
    createUserGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.ADD_USER_GAME_DATA));
    },
    updateUserGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.UPDATE_USER_GAME_DATA));
    },
    updateUserGameDataStatus(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.UPDATE_USER_GAME_DATA_STATUS));
    },
    changeDrawer(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.CHANGE_USER_GAME_DATA_DRAWER));
    },
    deleteUserGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.DELETE_USER_GAME_DATA));
    },
    getUserGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.GET_USER_GAME_DATA));
    },
    userGameDataCreated: function (callback) {
      registerToCallback(MESSAGES.USER_GAME_DATA_CREATED, callback);
    },
    userGameData: function (callback) {
      registerToCallback(MESSAGES.USER_GAME_DATA, callback);
    },
    createGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.ADD_GAME_DATA));
    },
    updateGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.UPDATE_GAME_DATA));
    },
    updateGameDataStatus(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.UPDATE_GAME_DATA_STATUS));
    },
    deleteGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.DELETE_GAME_DATA));
    },
    getShortGameData(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.GET_SHORT_GAME_DATA));
    },
    getGameDataByIds(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.GET_GAME_DATA));
    },
    gameDataCreated: function (callback) {
      registerToCallback(MESSAGES.GAME_DATA_CREATED, callback);
    },
    shortGameData: function (callback) {
      registerToCallback(MESSAGES.SHORT_GAME_DATA, callback);
    },
    gameData: function (callback) {
      registerToCallback(MESSAGES.GAME_DATA, callback);
    },
    addUserGameLog(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.ADD_USER_GAME_LOG));
    },
    sendLogToServer(msg) {
      if (therapist) {
        msg['peerId'] = therapistPeerId;
      }
      sendMessageToParent(addTypeToMessage(msg, MESSAGES.SEND_LOG_TO_SERVER));
    },
  };
}
