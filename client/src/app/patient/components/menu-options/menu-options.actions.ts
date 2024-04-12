import { Injectable } from '@angular/core';
import { NgRedux } from '@angular-redux/store';
import { Action } from 'redux';

import { IMenuOptionsState } from '../../../app.state';

export interface IMenuOptionsAction extends Action {
  payload: any;
}

@Injectable()
export class MenuOptionsAppActions {
  static MOVE_NEXT = 'move_next';
  static MOVE_PREV = 'move_prev';
  static SET_MENU_OPTIONS_STATE = 'set_menu_options_state';
  static SET_SKELETON_BUFFER = 'set_skeleton_buffer';
  static SET_IS_GAME_STATUS = 'set_is_game_status';
  static SET_THERAPIST_STATUS = 'set_therapist_status';
  static SET_VALID_GAMES = 'set_valid_games';
  static SET_THERAPIST_SESSION = 'set_therapist_session';
  static SET_GAME_MESSAGE = 'set_game_message';
  static ADD_USER_GAME_LOG = 'ADD_USER_GAME_LOG';

  constructor(private ngRedux: NgRedux<IMenuOptionsState>) {}

  moveNext = () => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.MOVE_NEXT,
    });
  };

  movePrev = () => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.MOVE_PREV,
    });
  };

  setMenuOptionsState = (menu_state) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.SET_MENU_OPTIONS_STATE,
      payload: menu_state,
    });
  };

  setSkeletonBufferState = (buffer) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.SET_SKELETON_BUFFER,
      payload: buffer,
    });
  };

  setIsInGame = (new_status) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.SET_IS_GAME_STATUS,
      payload: new_status,
    });
  };

  setTherapistStatus = (status) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.SET_THERAPIST_STATUS,
      payload: status,
    });
  };

  setValidGames = (games) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.SET_VALID_GAMES,
      payload: games,
    });
  };

  setOnTherapistSession = (status) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.SET_THERAPIST_SESSION,
      payload: status,
    });
  };

  addUserGameLog = (data) => {
    this.ngRedux.dispatch({
      type: MenuOptionsAppActions.ADD_USER_GAME_LOG,
      payload: data,
    });
  };
}
