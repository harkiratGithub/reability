import * as _ from 'lodash';

import {
  GeneralModalData,
  GENERAL_MODAL_CONTENT,
  GENERAL_MODAL_STYLE,
} from './common/general-modal/general-modal.component';
import { IGame, IOrganAngle, IScore } from '../types';
import { IBackOfficeState, INITIAL_BACK_OFFICE_STATE } from './backoffice/backoffice-schema';
import { ScoreType } from 'src/constants';
import { RTM_MODAL_CONTENT, RTM_MODAL_STYLE, RTMModalData } from './common/rtm-modal/rtm-modal.component';

export interface ISessionState {
  playerId: number;
  sessionTime: any;
}

export interface IGameAppData {
  timeInSeconds?: number;
  score?: IScore;
}
export interface IGlobalState {
  initGameSettings: object;
  showPercentageScore: boolean;
  stopTimer: boolean;
  score: IScore;
  showTimer: boolean;
  sessions: ISessionState[];
  playerFlag: string;
  isTherapist: boolean;
  isUserLoggedIn: boolean;
  callModal: { open: boolean; data: any };
  generalModal: { open: boolean; data?: GeneralModalData };
  rtmModal: { open: boolean; data?: RTMModalData };
  generalModalMsg: string;
  rtmModalMsg: string;
  disconnectionModal: { open: boolean; data: any };
  mutedMicModal: { open: boolean; data: any };
  currentGameUrl: string;
  currentGameUrlFromTherapist: { url: string; peerId: string };
  currentGameName: String;
  gameId: number;
  audioContext: any;
  bodyTrackingRequired: boolean;
  bodyTrackingAvailable: boolean;
  sendMediaStreamToIFrameRequest: any;
  mediaStreamToIframeSettings: any;
  enlargeVideo: boolean;
  organAngles: IOrganAngle[];
  posenetLoadingTimePassed: boolean;
  currentGame: IGame;
  currentGameAppData: IGameAppData;
  patientGeneralModal: { open: boolean; data: any };
}

export const INITIAL_STATE_GLOBAL = {
  initGameSettings: {},
  showPercentageScore: false,
  stopTimer: false,
  score: {
    type: ScoreType.Regular,
    value: 0,
  },
  showTimer: false,
  sessions: [],
  playerFlag: 'single',
  isTherapist: false,
  isUserLoggedIn: false,
  currentGameUrl: 'menu-options',
  currentGameUrlFromTherapist: undefined,
  currentGameName: 'menu-options',
  gameId: undefined,
  callModal: {
    open: false,
    data: {},
  },
  generalModal: {
    open: false,
    data: {
      approveCallback: () => {},
      declineCallback: () => {},
      acceptBtnImg: '../assets/buttons/btn_accept.png',
      acceptBtnImgHover: '../assets/buttons/btn_accept_hover.png',
      declineBtnImg: '../assets/buttons/btn_decline.png',
      declineBtnImgHover: '../assets/buttons/btn_decline_hover.png',
      header: '',
      content: GENERAL_MODAL_CONTENT.NONE,
      isTherapist: false,
      modalStyle: GENERAL_MODAL_STYLE.WHITE,
      patient: null,
    },
  },
  rtmModal: {
    open: false,
    data: {
      approveCallback: () => {},
      declineCallback: () => {},
      acceptBtnImg: '../assets/buttons/btn_accept.png',
      acceptBtnImgHover: '../assets/buttons/btn_accept_hover.png',
      declineBtnImg: '../assets/buttons/btn_decline.png',
      declineBtnImgHover: '../assets/buttons/btn_decline_hover.png',
      header: '',
      content: RTM_MODAL_CONTENT.NONE,
      isTherapist: false,
      modalStyle: RTM_MODAL_STYLE.WHITE,
      patient: null,
    },
  },
  generalModalMsg: '',
  rtmModalMsg: '',
  disconnectionModal: {
    open: false,
    data: {},
  },
  mutedMicModal: {
    open: false,
    data: {},
  },
  audioContext: null,
  bodyTrackingRequired: false,
  bodyTrackingAvailable: true,
  sendMediaStreamToIFrameRequest: null,
  mediaStreamToIframeSettings: null,
  enlargeVideo: false,
  organAngles: [],
  posenetLoadingTimePassed: false,
  currentGame: null,
  currentGameAppData: { timeInSeconds: 0, score: { type: ScoreType.Regular, value: '' } },
  patientGeneralModal: {
    open: false,
    data: {},
  },
};

export interface IMenuOptionsState {
  current_page_index: number;
  validGames: Array<{ name: string; url: string }>;
  isTherapist: boolean;
  skeleton_buffer_from_peer: any;
  is_in_game: boolean;
  inTherapistSession: boolean;
  leaveGameModal: { open: boolean; data: any };
  gameLog: { id: number; drawer: string; worksheetName: string; textLog: string; peerId: string };
}

export const INITIAL_STATE_MENU_OPTIONS = {
  current_page_index: 0,
  validGames: undefined,
  isTherapist: false,
  skeleton_buffer_from_peer: [],
  is_in_game: false,
  inTherapistSession: false,
  leaveGameModal: {
    open: false,
    data: {},
  },
  gameLog: { id: 0, drawer: '', worksheetName: '', textLog: '', peerId: '' },
};

export interface IAppState {
  global: IGlobalState;
  backOffice: IBackOfficeState;
  routes?: any;
  menu_options: IMenuOptionsState;
}

export const INITIAL_STATE: IAppState = {
  global: INITIAL_STATE_GLOBAL,
  backOffice: INITIAL_BACK_OFFICE_STATE,
  menu_options: INITIAL_STATE_MENU_OPTIONS,
};
