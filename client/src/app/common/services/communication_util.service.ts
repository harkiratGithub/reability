export const MESSAGES = {
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
  QUIT_GAME_FROM_THERAPIST: 'quit_game_from_therapist',
  STOP_VIDEO_SESSION: 'stop_video_session',
  DEPTH_CAM_CONNECTION: 'depth_cam_connected',
  RESTART_GAME: 'restart_game',
  SETTINGS_MODAL_OPENED: 'settings_modal_opened',
  SHOW_GAME_INSTRUCTIONS: 'show_game_instructions',
  SEND_QUIT_MESSAGE: 'send_quit_message',
  SHOW_END_GAME_MODAL: 'show_end_game_modal',
  SEND_RESTART_GAME_MESSAGE: 'send_restart_game_massage',
  GAME_READY_TO_START: 'game_ready_to_start',
  START_GAME: 'start_game',
  ENTER_FULL_SCREEN_MODE: 'enter_full_screen_mode',
  RECOVERED_NETWORK_FALIURE: 'recovered_network_faliure',
  NEW_EXTERNAL_SETTINGS: 'new_external_settings',
  CLOSE_EXTERNAL_CONFIGURATOR: 'close_external_configurator',
  MUTE_GAME_SOUND: 'mute_game_sound',
  MEDIA_STREAM: 'media_stream',
  SEND_MEDIA_STREAM: 'send_media_stream',
  ENLARGE_VIDEO: 'enlarge_video',
  APP_DISPLAY_STATUS: 'app_display_status',
  GAME_INTRODUCTION_DONE: 'game_introduction_done',
  REQUEST_APP_GAME_DATA: 'request_app_game_data',
  APP_GAME_DATA: 'app_game_data',
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
  REDIRECT_TO_HOME: 'redirect_to_home',
  SESSION_FEEDBACK: 'session_feedback',
  RDP_REQUEST:'rdp_request',
  UPDATE_VIDEO_LAYOUT: 'update_video_layout',
};

export interface IEnlargeVideoMessage {
  peerId: number;
  enlargeVideo: boolean;
}

export const communicationUtil = (() => {
  const doNothing = () => {};
  const initCallbacks = (msgs) => {
    const messageCallbacks = {};
    const messageValues: string[] = Object.values(msgs);
    for (const msg of messageValues) {
      messageCallbacks[msg] = doNothing;
    }
    return messageCallbacks;
  };
  const callbacks = initCallbacks(MESSAGES);
  const bindEvent = (element, eventName, eventHandler) => {
    if (element.addEventListener) {
      element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
      element.attachEvent('on' + eventName, eventHandler);
    }
  };
  const registerToCallback = (key, callback) => {
    callbacks[key] = callback;
  };
  const addTypeToMessage = (msg, type) => {
    const msgToSend = {
      type,
      msg,
    };
    return msgToSend;
  };
  const sendMessageToIframe = (iframe, msg, type) => {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify(addTypeToMessage(msg, type)), '*');
    }
  };
  const sendBlobMessageToIframe = (iframe, msg, type) => {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  };
  const parseMessageData = (raw: any): any => {
    if (raw == null) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  };

  const subscribeToPatientMessage = () => {
    bindEvent(window, 'message', (e) => {
      if (!e.data && e.data !== 0) return;
      if (typeof e.data === 'string' && e.data === 'recaptcha-setup') return;

      try {
        const data = parseMessageData(e.data);
        if (!data) return;
        switch (data.type) {
          case MESSAGES.APP_DISPLAY_STATUS:
            callbacks[MESSAGES.APP_DISPLAY_STATUS](data.msg);
            break;
          case MESSAGES.STATE:
            callbacks[MESSAGES.STATE](data.msg);
            break;
          case MESSAGES.SUMMARY:
            callbacks[MESSAGES.SUMMARY](data.msg);
            break;
          case MESSAGES.QUIT_GAME:
            callbacks[MESSAGES.QUIT_GAME](data.msg);
            break;
          case MESSAGES.REDIRECT_TO_HOME:
            callbacks[MESSAGES.REDIRECT_TO_HOME](data.msg);
            break;
          case MESSAGES.GENERIC_MESSAGE:
            callbacks[MESSAGES.GENERIC_MESSAGE](data.msg);
            break;
          case MESSAGES.GET_NOTIFICATIONS:
            callbacks[MESSAGES.GET_NOTIFICATIONS](data.msg);
            break;
          case MESSAGES.SHOW_GAME_INSTRUCTIONS:
            callbacks[MESSAGES.SHOW_GAME_INSTRUCTIONS](data.msg);
            break;
          case MESSAGES.GET_USER_GAME_DATA:
            callbacks[MESSAGES.GET_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.DELETE_USER_GAME_DATA:
            callbacks[MESSAGES.DELETE_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.UPDATE_USER_GAME_DATA:
            callbacks[MESSAGES.UPDATE_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.SHOW_END_GAME_MODAL:
            callbacks[MESSAGES.SHOW_END_GAME_MODAL](data.msg);
            break;
          case MESSAGES.GAME_READY_TO_START:
            callbacks[MESSAGES.GAME_READY_TO_START](data.msg);
            break;
          case MESSAGES.START_GAME:
            callbacks[MESSAGES.START_GAME](data.msg);
            break;
          case MESSAGES.ENTER_FULL_SCREEN_MODE:
            callbacks[MESSAGES.ENTER_FULL_SCREEN_MODE](data.msg);
            break;
          case MESSAGES.RECOVERED_NETWORK_FALIURE:
            callbacks[MESSAGES.RECOVERED_NETWORK_FALIURE](data.msg);
            break;
          case MESSAGES.MUTE_GAME_SOUND:
            callbacks[MESSAGES.MUTE_GAME_SOUND](data.msg);
            break;
          case MESSAGES.MEDIA_STREAM:
            callbacks[MESSAGES.MEDIA_STREAM](data.msg);
            break;
          case MESSAGES.SEND_MEDIA_STREAM:
            callbacks[MESSAGES.SEND_MEDIA_STREAM](data.msg);
            break;
          case MESSAGES.GAME_INTRODUCTION_DONE:
            callbacks[MESSAGES.GAME_INTRODUCTION_DONE](data.msg);
            break;
          case MESSAGES.APP_DISPLAY_GAME_MESSAGE:
            callbacks[MESSAGES.APP_DISPLAY_GAME_MESSAGE](data.msg);
            break;
          case MESSAGES.UPLOAD_IMAGE:
            callbacks[MESSAGES.UPLOAD_IMAGE](data.msg);
            break;
          case MESSAGES.SEND_LOG_TO_SERVER:
            callbacks[MESSAGES.SEND_LOG_TO_SERVER](data.msg);
            break;
            case MESSAGES.RDP_REQUEST:
              callbacks[MESSAGES.RDP_REQUEST](data.msg);
              break;
          default:
            break;
        }
      } catch (e) {
        // You can read e for more info
        // Let's assume the error is that we already have parsed the payload
        // So just return that
        console.log(e);
      }
    });
  };

  const subscribeToTherapistMessage = () => {
    bindEvent(window, 'message', (e) => {
      if (!e.data && e.data !== 0) return;
      if (typeof e.data === 'string' && e.data === 'recaptcha-setup') return;

      try {
        const data = parseMessageData(e.data);
        if (!data) return;
        switch (data.type) {
          case MESSAGES.APP_DISPLAY_STATUS:
            callbacks[MESSAGES.APP_DISPLAY_STATUS](data.msg);
            break;
          case MESSAGES.STATE:
            callbacks[MESSAGES.STATE](data.msg);
            break;
          case MESSAGES.NEW_SETTINGS:
            callbacks[MESSAGES.NEW_SETTINGS](data.msg);
            break;
          case MESSAGES.GENERIC_MESSAGE:
            callbacks[MESSAGES.GENERIC_MESSAGE](data.msg);
            break;
          case MESSAGES.QUIT_GAME_FROM_THERAPIST:
            callbacks[MESSAGES.QUIT_GAME_FROM_THERAPIST](data.msg);
            break;
          case MESSAGES.REDIRECT_TO_HOME:
            callbacks[MESSAGES.REDIRECT_TO_HOME](data.msg);
            break;
          case MESSAGES.RESTART_GAME:
            callbacks[MESSAGES.RESTART_GAME](data.msg);
            break;
          case MESSAGES.SETTINGS_MODAL_OPENED:
            callbacks[MESSAGES.SETTINGS_MODAL_OPENED](data.msg);
            break;
          case MESSAGES.SHOW_END_GAME_MODAL:
            callbacks[MESSAGES.SHOW_END_GAME_MODAL](data.msg);
            break;
          case MESSAGES.GAME_READY_TO_START:
            callbacks[MESSAGES.GAME_READY_TO_START](data.msg);
            break;
          case MESSAGES.START_GAME:
            callbacks[MESSAGES.START_GAME](data.msg);
            break;
          case MESSAGES.RECOVERED_NETWORK_FALIURE:
            callbacks[MESSAGES.RECOVERED_NETWORK_FALIURE](data.msg);
            break;
          case MESSAGES.NEW_EXTERNAL_SETTINGS:
            callbacks[MESSAGES.NEW_EXTERNAL_SETTINGS](data.msg);
            break;
          case MESSAGES.CLOSE_EXTERNAL_CONFIGURATOR:
            callbacks[MESSAGES.CLOSE_EXTERNAL_CONFIGURATOR](data.msg);
            break;
          case MESSAGES.MEDIA_STREAM:
            callbacks[MESSAGES.MEDIA_STREAM](data.msg);
            break;
          case MESSAGES.SEND_MEDIA_STREAM:
            callbacks[MESSAGES.SEND_MEDIA_STREAM](data.msg);
            break;
          case MESSAGES.GAME_INTRODUCTION_DONE:
            callbacks[MESSAGES.GAME_INTRODUCTION_DONE](data.msg);
            break;
          case MESSAGES.APP_DISPLAY_GAME_MESSAGE:
            callbacks[MESSAGES.APP_DISPLAY_GAME_MESSAGE](data.msg);
            break;
          case MESSAGES.UPLOAD_IMAGE:
            callbacks[MESSAGES.UPLOAD_IMAGE](data.msg);
            break;
          case MESSAGES.ADD_USER_GAME_DATA:
            callbacks[MESSAGES.ADD_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.UPDATE_USER_GAME_DATA:
            callbacks[MESSAGES.UPDATE_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.DELETE_USER_GAME_DATA:
            callbacks[MESSAGES.DELETE_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.UPDATE_USER_GAME_DATA_STATUS:
            callbacks[MESSAGES.UPDATE_USER_GAME_DATA_STATUS](data.msg);
            break;
          case MESSAGES.GET_USER_GAME_DATA:
            callbacks[MESSAGES.GET_USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.USER_GAME_DATA_CREATED:
            callbacks[MESSAGES.USER_GAME_DATA_CREATED](data.msg);
            break;
          case MESSAGES.USER_GAME_DATA:
            callbacks[MESSAGES.USER_GAME_DATA](data.msg);
            break;
          case MESSAGES.ADD_GAME_DATA:
            callbacks[MESSAGES.ADD_GAME_DATA](data.msg);
            break;
          case MESSAGES.UPDATE_GAME_DATA:
            callbacks[MESSAGES.UPDATE_GAME_DATA](data.msg);
            break;
          case MESSAGES.DELETE_GAME_DATA:
            callbacks[MESSAGES.DELETE_GAME_DATA](data.msg);
            break;
          case MESSAGES.UPDATE_GAME_DATA_STATUS:
            callbacks[MESSAGES.UPDATE_GAME_DATA_STATUS](data.msg);
            break;
          case MESSAGES.GAME_DATA_CREATED:
            callbacks[MESSAGES.GAME_DATA_CREATED](data.msg);
            break;
          case MESSAGES.GET_SHORT_GAME_DATA:
            callbacks[MESSAGES.GET_SHORT_GAME_DATA](data.msg);
            break;
          case MESSAGES.SHORT_GAME_DATA:
            callbacks[MESSAGES.SHORT_GAME_DATA](data.msg);
            break;
          case MESSAGES.GET_GAME_DATA:
            callbacks[MESSAGES.GET_GAME_DATA](data.msg);
            break;
          case MESSAGES.GAME_DATA:
            callbacks[MESSAGES.GAME_DATA](data.msg);
            break;
          case MESSAGES.ADD_USER_GAME_LOG:
            callbacks[MESSAGES.ADD_USER_GAME_LOG](data.msg);
            break;
          case MESSAGES.SEND_LOG_TO_SERVER:
            callbacks[MESSAGES.SEND_LOG_TO_SERVER](data.msg);
            break;
          case MESSAGES.RDP_REQUEST:
            callbacks[MESSAGES.RDP_REQUEST](data.msg);
            break;
          default:
            break;
        }
      } catch (e) {
        // You can read e for more info
        // Let's assume the error is that we already have parsed the payload
        // So just return that
        console.log(e);
      }
    });
  };

  const unSubscribeAllCallbacks = () => {
    const messageValues: string[] = Object.values(MESSAGES);
    for (const msg of messageValues) {
      callbacks[msg] = doNothing;
    }
    unbindEvent(window);
  };

  const unbindEvent = (element) => {
    if (element.eventListeners) {
      element.eventListeners().map((event) => {
        if (event.toString().includes('MESSAGES.SHOW_GAME')) {
          if (element.removeEventListener) {
            element.removeEventListener('message', event, false);
          } else if (element.detachEvent) {
            element.detachEvent('on' + 'message', event);
          }
        }
      });
    }
  };

  return {
    initPatientMessages: () => {
      subscribeToPatientMessage();
    },
    initTherapistMessages: () => {
      subscribeToTherapistMessage();
    },
    registerToCallback,
    sendMessageToIframe,
    sendBlobMessageToIframe,
    unSubscribeAllCallbacks,
  };
})();
