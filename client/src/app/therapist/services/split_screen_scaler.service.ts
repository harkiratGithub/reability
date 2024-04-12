import { Injectable } from '@angular/core';

@Injectable()
export class SplitScreenScalerService {
  constructor() {}

  iframeScaler = (
    isFullScreenMode,
    currentUserInFullScreenMode,
    iframeSplitScreen,
    lobbyComponentsInSplitScreen,
    callWaitingForAnswerScreen
  ) => {
    // let iframeEl;
    // iframeSplitScreen.forEach(iframe => {
    //   if (
    //     iframe &&
    //     (this.isFullScreenMode &&
    //       'games-iframe-' + this.currentUserInFullScreenMode.connection.connectionId === iframe.id)
    //   ) {
    //     iframeEl = iframe;
    //   }
    // });
    // if (!iframeEl && iframeSplitScreen.length > 0) {
    //   iframeEl = iframeSplitScreen[0];
    // }
    // if (!iframeEl) {
    //   lobbyComponentsInSplitScreen.forEach(iframe => {
    //     if (
    //       iframe &&
    //       (this.isFullScreenMode &&
    //         'games-iframe-' + this.currentUserInFullScreenMode.connection.connectionId ===
    //         iframe.id)
    //     ) {
    //       iframeEl = iframe;
    //     }
    //   });
    //   if (!iframeEl && lobbyComponentsInSplitScreen.length > 0) {
    //     iframeEl = lobbyComponentsInSplitScreen[0];
    //   }
    //   if (!iframeEl) {
    //     iframeEl = callWaitingForAnswerScreen[0];
    //   }
    // }
    // if (iframeEl) {
    //   let scale = 1;
    //   if (this.isFullScreenMode || (lobbyComponentsInSplitScreen.length + callWaitingForAnswerScreen.length + iframeSplitScreen.length === 1)) {
    //     scale = 0.75;
    //   }
    //   else {
    //     scale = 0.35;
    //   }
    //   if (iframeEl.nodeName === 'IFRAME') {
    //     const wrapWidth = (iframeEl as HTMLElement).parentElement.offsetWidth; // width of the wrapper
    //     const wrapHeight = (iframeEl as HTMLElement).parentElement.offsetHeight;
    //     const childWidth = iframeEl.clientWidth; // width of child iframe
    //     const childHeight = iframeEl.clientHeight; // child height
    //     let wScale = wrapWidth / childWidth;
    //     if (wScale > 1) {
    //       wScale = 1 / wScale;
    //     }
    //     let hScale = wrapHeight / childHeight;
    //     if (hScale > 1) {
    //       hScale = 1 / hScale;
    //     }
    //     scale = Math.min(wScale, hScale); // get the lowest ratio
    //     if (scale < 0.2) {
    //       scale = 0.5;
    //     }
    //   } else {
    //     const wrapWidth = (iframeEl as HTMLElement).parentElement.offsetWidth; // width of the wrapper
    //     const wrapHeight = (iframeEl as HTMLElement).parentElement.offsetHeight;
    //     const childWidth = iframeEl.ownerDocument.body.clientWidth; // width of child iframe
    //     const childHeight = iframeEl.ownerDocument.body.clientHeight; // child height
    //     let wScale = wrapWidth / childWidth;
    //     if (wScale > 1) {
    //       wScale = 1 / wScale;
    //     }
    //     let hScale = wrapHeight / childHeight;
    //     if (hScale > 1) {
    //       hScale = 1 / hScale;
    //     }
    //     scale = Math.min(wScale, hScale); // get the lowest ratio
    //     if (scale < 0.2) {
    //       scale = 0.5;
    //     }
    //   }
    //   iframeSplitScreen.forEach(iframeElement => {
    //     (iframeElement as HTMLElement).style.setProperty('transform', 'scale(' + scale + ')');
    //     (iframeElement as HTMLElement).style.setProperty('transform-origin', 'left top'); // set scale
    //     (iframeElement as HTMLElement).style.setProperty('width', `calc(100% * ${1 / scale})`); // set scale
    //     (iframeElement as HTMLElement).style.setProperty('height', `calc(100% * ${1 / scale})`); // set scale
    //   });
    //   lobbyComponentsInSplitScreen.forEach(iframeElement => {
    //     (iframeElement as HTMLElement).style.transform = 'scale(' + scale + ')';
    //     (iframeElement as HTMLElement).style.transformOrigin = 'left top'; // set scale
    //     (iframeElement as HTMLElement).style.width = `calc(100% * ${1 / scale})`; // set scale
    //     (iframeElement as HTMLElement).style.height = `calc(100% * ${1 / scale})`; // set scale
    //   });
    //   if (
    //     callWaitingForAnswerScreen.length +
    //     lobbyComponentsInSplitScreen.length +
    //     iframeSplitScreen.length >
    //     1
    //   ) {
    //     this.fontSize = 1 / scale - 0.2;
    //   } else {
    //     this.fontSize = 1 / scale + 0.2;
    //     this.lineHeight = this.fontSize;
    //   }
    //   callWaitingForAnswerScreen.forEach(iframeElement => {
    //     (iframeElement as HTMLElement).style.transform = 'scale(' + scale + ')';
    //     (iframeElement as HTMLElement).style.transformOrigin = 'left top'; // set scale
    //     (iframeElement as HTMLElement).style.width = `calc(100% * ${1 / scale})`; // set scale
    //     (iframeElement as HTMLElement).style.height = `calc(100% * ${1 / scale})`; // set scale
    //     (iframeElement as HTMLElement).style.fontSize = `${this.fontSize}rem`; // set scale
    //     (iframeElement as HTMLElement).style.lineHeight = `${this.lineHeight}rem`; // set scale
    //   });
    // }
  };

  setMenuAndIFrameScale = (isFullScreenMode, connectedPatients, isSwappedScreens, isDisabledSkeleton) => {
    let scale = 1;
    if (isSwappedScreens) {
      if (connectedPatients.length > 1) {
        if (isDisabledSkeleton) {
          return {
            transform: 'scale(0.15)',
            transformOrigin: 'right bottom',
            bottom: 0,
            right: 0,
            width: '132%',
            height: '183%',
          };
        } else {
          return {
            transform: 'scale(0.15)',
            transformOrigin: 'right bottom',
            bottom: 0,
            right: 0,
            width: '220%',
            height: '250%',
          };
        }
      }
      return {
        transform: 'scale(0.25)',
        transformOrigin: 'right bottom',
        bottom: 0,
        right: 0,
        width: '80%',
        height: '105%',
      };
    }
    if (isFullScreenMode || connectedPatients.length === 1) {
      scale = 0.81;
    } else {
      scale = 0.35;
    }
    return {
      transform: 'scale(' + scale + ')',
      transformOrigin: 'left top',
      width: `calc(100% * ${1 / scale})`,
      height: `calc(100% * ${1 / scale})`,
    };
  };
}
