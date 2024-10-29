import { combineReducers, Reducer, Action } from 'redux';
import { IAppState, INITIAL_STATE_GLOBAL, IGlobalState } from './app.state';
import { AppActions, IAppAction } from './app.actions';
import moment from 'moment';
import { routerReducer } from '@angular-redux/router';
import { MenuOptionsReducer } from './patient/components/menu-options/menu-options.reducer';
import { BackOfficeReducer } from './backoffice/backoffice-reducer';
import { IGame } from '../types';

const appReducer = (lastState: IGlobalState, action: IAppAction) => {
  if (lastState === undefined) {
    return INITIAL_STATE_GLOBAL;
  }

  switch (action.type) {
    case AppActions.INIT_GAME_SETTINGS:
      return {
        ...lastState,
        initGameSettings: action.payload,
      };
    case AppActions.SHOW_PERCENTAGE_SCORE:
      return {
        ...lastState,
        showPercentageScore: action.payload,
      };
    case AppActions.SHOW_END_GAME_MODAL:
      return {
        ...lastState,
        stopTimer: action.payload,
      };
    case AppActions.RESET_GAME_SCORE:
      return {
        ...lastState,
        score: INITIAL_STATE_GLOBAL.score,
      };
    case AppActions.UPDATE_GAME_SCORE:
      return {
        ...lastState,
        score: action.payload,
      };
    case AppActions.SHOW_TIMER:
      return {
        ...lastState,
        showTimer: action.payload,
      };
    case AppActions.NEWSESSION:
      const newSession = {
        playerId: action.payload.playerId,
        sessionTime: moment(),
      };

      return {
        ...lastState,
        sessions: [{ ...lastState.sessions }, newSession],
      };

    case AppActions.TOGGLE_THERAPIST:
      const newTherapist = !lastState.isTherapist;
      return {
        ...lastState,
        isTherapist: newTherapist,
      };

    case AppActions.SET_THERAPIST:
      return {
        ...lastState,
        isTherapist: action.payload,
      };

    case AppActions.SET_LOGGED_IN_USER:
      return {
        ...lastState,
        isUserLoggedIn: action.payload,
      };

    case AppActions.CHANGEFLAG:
      const newFlag = action.payload;
      return {
        ...lastState,
        playerFlag: newFlag,
      };

    case AppActions.SET_CURRENT_GAME:
      const { gameId: id, name, url, bodyTrackRequired, description } = action.payload;
      return {
        ...lastState,
        currentGameUrl: url,
        gameId: id,
        currentGameName: name,
        bodyTrackingRequired: bodyTrackRequired,
        currentGame: { id, name, url, bodyTrackRequired, description } as IGame,
      };
    case AppActions.SET_CURRENT_GAME_FROM_THERAPIST:
      return {
        ...lastState,
        currentGameUrlFromTherapist: action.payload,
      };
    case AppActions.OPEN_CALL_MODAL:
      return {
        ...lastState,
        callModal: {
          ...lastState.callModal,
          open: true,
          data: action.payload.modalData,
          playSound: action.payload.playSound,
        },
      };
    case AppActions.CLOSE_CALL_MODAL:
      return {
        ...lastState,
        callModal: {
          ...lastState.callModal,
          open: false,
          data: {},
        },
      };
    case AppActions.OPEN_DISCONNETION_MODAL:
      return {
        ...lastState,
        disconnectionModal: {
          ...lastState.disconnectionModal,
          open: true,
          data: action.payload,
        },
      };
    case AppActions.CLOSE_DISCONNECTION_CALL_MODAL:
      return {
        ...lastState,
        disconnectionModal: {
          ...lastState.disconnectionModal,
          open: false,
          data: {},
        },
      };
    case AppActions.OPEN_MUTED_MIC_MODAL:
      return {
        ...lastState,
        mutedMicModal: {
          ...lastState.mutedMicModal,
          open: true,
          data: action.payload,
        },
      };
    case AppActions.CLOSE_MUTED_MIC_MODAL:
      return {
        ...lastState,
        mutedMicModal: {
          ...lastState.mutedMicModal,
          open: false,
          data: {},
        },
      };
    case AppActions.OPEN_GENERAL_MODAL:
      return {
        ...lastState,
        generalModal: {
          ...lastState.generalModal,
          open: true,
          data: {
            ...lastState.generalModal.data,
            ...action.payload,
          },
        },
      };
    case AppActions.CLOSE_GENERAL_MODAL:
      return {
        ...lastState,
        generalModal: INITIAL_STATE_GLOBAL.generalModal,
      };

    case AppActions.OPEN_RTM_MODAL:
      return {
        ...lastState,
        rtmModal: {
          ...lastState.rtmModal,
          open: true,
          data: {
            ...lastState.rtmModal.data,
            ...action.payload,
          },
        },
      };
    case AppActions.CLOSE_RTM_MODAL:
      return {
        ...lastState,
        rtmModal: INITIAL_STATE_GLOBAL.rtmModal,
      };
    case AppActions.OPEN_PATIENT_GENERAL_MODAL:
      return {
        ...lastState,
        patientGeneralModal: {
          ...lastState.patientGeneralModal,
          open: true,
          data: action.payload.modalData,
        },
      };
    case AppActions.SET_MESSAGE_GENERAL_MODAL:
      return {
        ...lastState,
        generalModalMsg: action.payload,
      };
    case AppActions.SET_MESSAGE_RTM_MODAL:
      return {
        ...lastState,
        rtmModalMsg: action.payload,
      };
    case AppActions.TOGGLE_BODY_TRACKING:
      return {
        ...lastState,
        bodyTrackingRequired: action.payload,
      };
    case AppActions.SET_BODY_TRACKING_UNAVAILABLE:
      return {
        ...lastState,
        bodyTrackingAvailable: false,
      };

    case AppActions.SET_SEND_MEDIA_TO_IFRAME_REQUEST:
      return {
        ...lastState,
        sendMediaStreamToIFrameRequest: action.payload,
      };

    case AppActions.SET_MEDIA_STREAM_TO_IFRAME_SETTINGS:
      return {
        ...lastState,
        mediaStreamToIframeSettings: action.payload,
      };

    case AppActions.TOGGLE_ENLARGE_VIDEO:
      return {
        ...lastState,
        enlargeVideo: action.payload,
      };

    case AppActions.SET_ORGAN_ANGLES:
      return {
        ...lastState,
        organAngles: action.payload,
      };

    case AppActions.SET_POSENET_LOADING_TIME_PASSED:
      return {
        ...lastState,
        posenetLoadingTimePassed: action.payload,
      };

    case AppActions.SET_CURRENT_GAME_APP_DATA:
      return {
        ...lastState,
        currentGameAppData: { ...lastState.currentGameAppData, ...action.payload },
      };

    default:
      return lastState;
  }
};

export const rootReducer: Reducer<any> = combineReducers({
  global: appReducer,
  backOffice: BackOfficeReducer,
  router: routerReducer,
  menu_options: MenuOptionsReducer,
});
