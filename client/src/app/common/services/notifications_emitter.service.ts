// util functions
const throttle = (func, limit) => {
  let inThrottle
  return function () {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
};
const setBounds = (point, max) => {
  if (point > max - 128) {
    return max - 128;
  }

  return point;
};
const buildCustomEvent = (type, data) => new CustomEvent(type, {
  bubbles: true,
  cancelable: true,
  detail: data
});
const dispatchCustomEvent = (targetElement, eventType, data) =>
  targetElement.dispatchEvent(buildCustomEvent(eventType, data));

// -----------------------------------------------------------------------
// notifications emitter
const CUSTOM_EVENT_TYPES = {
  HANDS_MOVE: 'hands_move',
  RIGHT_HAND_START: 'right_hand_start',
  LEFT_HAND_START: 'left_hand_start',
  RIGHT_HAND_END: 'right_hand_end',
  LEFT_HAND_END: 'left_hand_end',
  RIGHT_HAND_CLICK: 'right_hand_click',
  LEFT_HAND_CLICK: 'left_hand_click'
};
const DISPATCH_ONLY_MOVES = true;

export const notificationsEmitter = (() => {
  let tolerance;   // pixels
  let handStartHoverMS;
  let handClickTimeMS;
  let leftHand, rightHand;

  const notifyHandsMove = (data) => dispatchCustomEvent(document, CUSTOM_EVENT_TYPES.HANDS_MOVE, data);

  const setInitialConfiguration = (tolerancePX = 25, handHoverMS = 250, handClickMS = 2000) => {
    tolerance = tolerancePX;
    handStartHoverMS = handHoverMS;
    handClickTimeMS = handClickMS;
    rightHand = common(true);
    leftHand = common(false);
  };

  const mouseMoveFunction = throttle((e) => {
    const { clientX, clientY } = e;
    const currentHand = e.shiftKey ? leftHand : rightHand;
    notifyHandsMove({
      r_x: !e.shiftKey ? clientX : 0,
      r_y: !e.shiftKey ? clientY : 0,
      l_x: e.shiftKey ? clientX : 0,
      l_y: e.shiftKey ? clientY : 0
    });
    if (DISPATCH_ONLY_MOVES) {
      return;
    }
    currentHand.handleMove(e);
  }, 10);

  const getHandsPixelPointsFromBuffer = (buf) => {
    const skeletonStartIndex = 0;
    const skeletonEndIndex = 60;

    // offsetting everything by half a screen
    const leftX = buf[28];
    const leftY = buf[29];
    const rightX = buf[31];
    const rightY = buf[32];

    const frameWidth = buf[skeletonEndIndex * skeletonStartIndex + skeletonEndIndex - 2];
    const frameHeight = buf[skeletonEndIndex * skeletonStartIndex + skeletonEndIndex - 1];

    if (frameWidth === 0 || frameHeight === 0) {
      return null;
    }

    const delta = 1;
    const w = window.innerWidth * delta;
    const h = window.innerHeight * delta;

    let leftHandCords = {
      clientX: setBounds(leftX, window.innerWidth),
      clientY: setBounds(leftY, window.innerHeight)
    };
    let rightHandCords = {
      clientX: setBounds(rightX, window.innerWidth),
      clientY: setBounds(rightY, window.innerHeight)
    }
    if (leftX === 0 || leftY === 0) {
      leftHandCords = null;
    }
    if (rightX === 0 || rightY === 0) {
      rightHandCords = null;
    }
    return {
      leftHandCords,
      rightHandCords
    };
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
    }
    const initEvents = (isRightHand) => {
      return {
        HAND_START: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_START : CUSTOM_EVENT_TYPES.LEFT_HAND_START,
        HAND_END: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_END : CUSTOM_EVENT_TYPES.LEFT_HAND_END,
        HAND_CLICK: isRightHand ? CUSTOM_EVENT_TYPES.RIGHT_HAND_CLICK : CUSTOM_EVENT_TYPES.LEFT_HAND_CLICK
      }
    }

    initParams();
    customEventType = initEvents(isRightHand);

    const handleMove = ({ clientX, clientY }) => {
      const intersectElement = document.elementFromPoint(clientX, clientY);

      if (!previousElement) {
        previousElement = intersectElement;
        previousCords = {
          x: clientX,
          y: clientY
        };
        startHoverTimout({ clientX, clientY });
        return;
      }
      checkIfInBounds(clientX, clientY);
    }
    // specific events
    const notifySpecificHandEvent = (data, type) => {
      if (!previousElement) {
        return;
      }
      dispatchCustomEvent(previousElement, type, data);
    }
    const startHoverTimout = (data) => {
      hoverTimeoutId = setTimeout(() => {
        handleStartHand(data);
      }, handStartHoverMS);
    }
    const clearHoverTimeout = () => {
      clearTimeout(hoverTimeoutId);
      hoverTimeoutId = null;
    }
    const startClickTimeout = (data) => {
      clickTimeoutId = setTimeout(() => {
        handleClickHand(data);
      }, handClickTimeMS);
    }
    const clearClickTimeout = () => {
      clearTimeout(clickTimeoutId);
      clickTimeoutId = null;
    }
    const checkIfInBounds = (clientX, clientY) => {
      if (!previousCords) {
        return;
      }
      // in bounds
      if (Math.abs(clientX - previousCords.x) <= tolerance
        && Math.abs(clientY - previousCords.y) <= tolerance) {
        return;
      }
      handleOutOfBounds({ clientX, clientY });
    }
    const handleOutOfBounds = (data) => {
      if (isHandStart) {
        handleEndHand(data);
      } else {
        resetToInitialState();
      }
    }
    const handleStartHand = (data) => {
      isHandStart = true;
      notifySpecificHandEvent(data, customEventType.HAND_START);
      startClickTimeout(data);
    }
    const handleEndHand = (data) => {
      if (!isHandStart) {
        return;
      }
      notifySpecificHandEvent(data, customEventType.HAND_END);
      resetToInitialState();
    }
    const handleClickHand = (data) => {
      if (!isHandStart) {
        return;
      }
      notifySpecificHandEvent(data, customEventType.HAND_CLICK);
      resetToInitialState();
    }
    const resetToInitialState = () => {
      initParams();
      clearHoverTimeout();
      clearClickTimeout();
    }

    return {
      handleMove
    }
  }

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
      const handsPixels = getHandsPixelPointsFromBuffer(buf);
      if (!handsPixels) {
        return;
      }

      const { rightHandCords, leftHandCords } = handsPixels;
      if (rightHandCords || leftHandCords) {
        notifyHandsMove({
          r_x: rightHandCords ? rightHandCords.clientX : 0,
          r_y: rightHandCords ? rightHandCords.clientY : 0,
          l_x: leftHandCords ? leftHandCords.clientX : 0,
          l_y: leftHandCords ? leftHandCords.clientY : 0,
        });
      }
      if (DISPATCH_ONLY_MOVES) {
        return;
      }
      if (!rightHandCords && (!isNaN(rightHandCords.clientX) && !isNaN(rightHandCords.clientY))) {
        rightHand.handleMove(rightHandCords);
      }
      if (!leftHandCords && (!isNaN(leftHandCords.clientX) && !isNaN(leftHandCords.clientY))) {
        leftHand.handleMove(leftHandCords);
      }
    }
  }
})();

window['notifEmitter'] = notificationsEmitter;
// -----------------------------------------------------------------------