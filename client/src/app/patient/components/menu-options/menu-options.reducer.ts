import { INITIAL_STATE_MENU_OPTIONS, IMenuOptionsState } from '../../../app.state';
import { MenuOptionsAppActions, IMenuOptionsAction } from './menu-options.actions';

export const MenuOptionsReducer = (lastState: IMenuOptionsState, action: IMenuOptionsAction) => {
  if (lastState === undefined) {
    return INITIAL_STATE_MENU_OPTIONS;
  }

  switch (action.type) {
    case MenuOptionsAppActions.MOVE_NEXT:
      return {
        ...lastState,
        current_page_index: lastState.current_page_index + 1,
      };

    case MenuOptionsAppActions.MOVE_PREV:
      return {
        ...lastState,
        current_page_index: lastState.current_page_index - 1,
      };

    case MenuOptionsAppActions.SET_MENU_OPTIONS_STATE:
      return {
        ...lastState,
        ...action.payload,
      };

    case MenuOptionsAppActions.SET_SKELETON_BUFFER:
      return {
        ...lastState,
        skeleton_buffer_from_peer: action.payload,
      };

    case MenuOptionsAppActions.SET_IS_GAME_STATUS:
      return {
        ...lastState,
        is_in_game: action.payload,
      };

    case MenuOptionsAppActions.SET_THERAPIST_STATUS:
      return {
        ...lastState,
        isTherapist: action.payload,
      };

    case MenuOptionsAppActions.SET_VALID_GAMES:
      if (lastState.validGames && action.payload && lastState.validGames.length === action.payload.length) {
        return lastState;
      }
      return {
        ...lastState,
        validGames: action.payload,
      };
    case MenuOptionsAppActions.SET_THERAPIST_SESSION:
      return {
        ...lastState,
        inTherapistSession: action.payload,
      };

    case MenuOptionsAppActions.ADD_USER_GAME_LOG:
      return {
        ...lastState,
        gameLog: action.payload,
      };

    default:
      return lastState;
  }
};
