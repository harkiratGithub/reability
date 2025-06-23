import { Injectable } from '@angular/core';
import { NgRedux } from '@angular-redux/store';
import { Action } from 'redux';

import { IAppState, IGameAppData } from './app.state';
import { GeneralModalData } from './common/general-modal/general-modal.component';
import { IOrganAngle } from '../types';
import { RTMModalData } from './common/rtm-modal/rtm-modal.component';
import { SHOWRTMModalData } from './common/show-rtm-modal/rtm-modal.component';

export interface IAppAction extends Action {
  counter: number;
  payload: any;
}

@Injectable()
export class AppActions {
  static TOGGLE_THERAPIST = 'toggle_therapist';
  static CHANGEFLAG = 'change_flag';
  static NEWSESSION = 'new_session';
  static SET_THERAPIST = 'set_therapist';
  static SET_LOGGED_IN_USER = 'set_logged_in_user';
  static SET_CURRENT_GAME = 'set_current_game';
  static OPEN_CALL_MODAL = 'open_call_modal';
  static CLOSE_CALL_MODAL = 'close_call_modal';
  static SET_CURRENT_GAME_FROM_THERAPIST = 'set_current_game_from_therapist';
  static OPEN_DISCONNETION_MODAL = 'open_disconnection_modal';
  static CLOSE_DISCONNECTION_CALL_MODAL = 'close_disconnection_modal';
  static OPEN_MUTED_MIC_MODAL = 'open_muted_mic_modal';
  static CLOSE_MUTED_MIC_MODAL = 'close_muted_mic_modal';
  static OPEN_GENERAL_MODAL = 'open_general_modal';
  static CLOSE_GENERAL_MODAL = 'close_general_modal';
  static SET_MESSAGE_GENERAL_MODAL = 'SET_MESSAGE_GENERAL_MODAL';
  static OPEN_RTM_MODAL = 'open_rtm_modal';
  static CLOSE_RTM_MODAL = 'close_rtm_modal';
  static SHOW_OPEN_RTM_MODAL = 'show_open_rtm_modal';
  static SHOW_CLOSE_RTM_MODAL = 'show_close_rtm_modal';
  static SET_MESSAGE_RTM_MODAL = 'SET_MESSAGE_RTM_MODAL';
  static SET_MESSAGE_SHOW_RTM_MODAL = 'SET_MESSAGE_SHOW_RTM_MODAL';
  static TOGGLE_BODY_TRACKING = 'TOGGLE_BODY_TRACKING';
  static SET_BODY_TRACKING_UNAVAILABLE = 'SET_BODY_TRACKING_UNAVAILABLE';
  static SET_SEND_MEDIA_TO_IFRAME_REQUEST = 'SET_SEND_MEDIA_TO_IFRAME_REQUEST';
  static SET_MEDIA_STREAM_TO_IFRAME_SETTINGS = 'SET_MEDIA_STREAM_TO_IFRAME_SETTINGS';
  static TOGGLE_ENLARGE_VIDEO = 'TOGGLE_ENLARGE_VIDEO';
  static SET_ORGAN_ANGLES = 'SET_ORGAN_ANGLES';
  static SET_POSENET_LOADING_TIME_PASSED = 'SET_POSENET_LOADING_TIME_PASSED';
  static SHOW_TIMER = 'SHOW_TIMER';
  static UPDATE_GAME_SCORE = 'UPDATE_GAME_SCORE';
  static RESET_GAME_SCORE = 'RESET_GAME_SCORE';
  static SHOW_END_GAME_MODAL = 'SHOW_END_GAME_MODAL';
  static SHOW_PERCENTAGE_SCORE = 'SHOW_PERCENTAGE_SCORE';
  static INIT_GAME_SETTINGS = 'INIT_GAME_SETTINGS';
  static SET_CURRENT_GAME_APP_DATA = 'SET_CURRENT_GAME_APP_DATA';
  static OPEN_PATIENT_GENERAL_MODAL = 'open_patient_general_modal';

  constructor(private ngRedux: NgRedux<IAppState>) { }

  updateInitGameSettings = (data) => {
    this.ngRedux.dispatch({
      type: AppActions.INIT_GAME_SETTINGS,
      payload: data,
    });
  };

  showPercentageScore = (data) => {
    this.ngRedux.dispatch({
      type: AppActions.SHOW_PERCENTAGE_SCORE,
      payload: data,
    });
  };

  stopTimer = (data) => {
    console.log('stopTimer', new Date(), data);
    this.ngRedux.dispatch({
      type: AppActions.SHOW_END_GAME_MODAL,
      payload: data,
    });
  };

  resetGameScore = () => {
    this.ngRedux.dispatch({
      type: AppActions.RESET_GAME_SCORE,
    });
  };

  updateGameScore = (data) => {
    this.ngRedux.dispatch({
      type: AppActions.UPDATE_GAME_SCORE,
      payload: data,
    });
  };

  showTimer = (data) => {
    this.ngRedux.dispatch({
      type: AppActions.SHOW_TIMER,
      payload: data,
    });
  };

  toggleTherapist = () => {
    this.ngRedux.dispatch({
      type: AppActions.TOGGLE_THERAPIST,
    });
  };

  changeFlag = (option) => {
    this.ngRedux.dispatch({
      type: AppActions.CHANGEFLAG,
      payload: option,
    });
  };

  NEW = (playerId: string) => {
    this.ngRedux.dispatch({
      type: AppActions.NEWSESSION,
      payload: { playerId },
    });
  };

  setTherapist = (isTherapist) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_THERAPIST,
      payload: isTherapist,
    });
  };

  setLoggedInUser = (user) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_LOGGED_IN_USER,
      payload: user,
    });
  };

  setCurrentGame = (game) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_CURRENT_GAME,
      payload: game,
    });
  };

  setCurrentGameUrlFromTherapist = (url, peerId) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_CURRENT_GAME_FROM_THERAPIST,
      payload: { url, peerId },
    });
  };

  openCallModal = (modalData, playSound = true) => {
    this.ngRedux.dispatch({
      type: AppActions.OPEN_CALL_MODAL,
      payload: { modalData: modalData, playSound: playSound },
    });
  };

  openVideoSessionDisconnectionModal = (modalData) => {
    this.ngRedux.dispatch({
      type: AppActions.OPEN_DISCONNETION_MODAL,
      payload: modalData,
    });
  };

  closeModal = () => {
    this.ngRedux.dispatch({
      type: AppActions.CLOSE_CALL_MODAL,
    });
  };

  closeDisconnectionModal = () => {
    this.ngRedux.dispatch({
      type: AppActions.CLOSE_DISCONNECTION_CALL_MODAL,
    });
  };

  closeMutedMicModal = () => {
    this.ngRedux.dispatch({
      type: AppActions.CLOSE_MUTED_MIC_MODAL,
    });
  };

  openMutedMicModal = (modalData) => {
    this.ngRedux.dispatch({
      type: AppActions.OPEN_MUTED_MIC_MODAL,
      payload: modalData,
    });
  };

  openGeneralModal = (modalData: GeneralModalData) => {
    this.ngRedux.dispatch({
      type: AppActions.OPEN_GENERAL_MODAL,
      payload: modalData,
    });
  };

  openRTMModal = (modalData: RTMModalData) => {
    this.ngRedux.dispatch({
      type: AppActions.OPEN_RTM_MODAL,
      payload: modalData,
    });
  };

  closeRTMModal = () => {
    this.ngRedux.dispatch({
      type: AppActions.CLOSE_RTM_MODAL,
    });
  };

  showOpenRTMModal = (modalData: SHOWRTMModalData) => {
    this.ngRedux.dispatch({
      type: AppActions.SHOW_OPEN_RTM_MODAL,
      payload: modalData,
    });
  };

  showCloseRTMModal = () => {
    this.ngRedux.dispatch({
      type: AppActions.SHOW_CLOSE_RTM_MODAL,
    });
  };

  setMessageRTMModal = (msg) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_MESSAGE_RTM_MODAL,
      payload: msg,
    });
  };

  setMessageShowRTMModal = (msg) => {
    console.log('setMessageShowRTMModal: ', msg);
    this.ngRedux.dispatch({
      type: AppActions.SET_MESSAGE_SHOW_RTM_MODAL,
      payload: msg,
    });
  };

  openPatientGeneralModal = (modalData) => {
    this.ngRedux.dispatch({
      type: AppActions.OPEN_PATIENT_GENERAL_MODAL,
      payload: { modalData: modalData },
    });
  };

  closeGeneralModal = () => {
    this.ngRedux.dispatch({
      type: AppActions.CLOSE_GENERAL_MODAL,
    });
  };

  setMessageGeneralModal = (msg) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_MESSAGE_GENERAL_MODAL,
      payload: msg,
    });
  };

  toggleBodyTracking = (status) => {
    this.ngRedux.dispatch({
      type: AppActions.TOGGLE_BODY_TRACKING,
      payload: status,
    });
  };

  setBodyTrackingUnavailable = () => {
    this.ngRedux.dispatch({
      type: AppActions.SET_BODY_TRACKING_UNAVAILABLE,
    });
  };

  setSendMediaToIFrameRequest = (options) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_SEND_MEDIA_TO_IFRAME_REQUEST,
      payload: options,
    });
  };

  setMediaStreamToIFrameSettings = (settings) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_MEDIA_STREAM_TO_IFRAME_SETTINGS,
      payload: settings,
    });
  };

  toggleEnlargeVideo = (enlargeVideo: boolean) => {
    this.ngRedux.dispatch({
      type: AppActions.TOGGLE_ENLARGE_VIDEO,
      payload: enlargeVideo,
    });
  };

  setOrganAngles = (organAngles: IOrganAngle[]) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_ORGAN_ANGLES,
      payload: organAngles,
    });
  };

  setPosenetLoadingTimePassed = (posenetLoadingTimePassed) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_POSENET_LOADING_TIME_PASSED,
      payload: posenetLoadingTimePassed,
    });
  };

  setCurrentGameAppData = (data: IGameAppData) => {
    this.ngRedux.dispatch({
      type: AppActions.SET_CURRENT_GAME_APP_DATA,
      payload: data,
    });
  };
}
