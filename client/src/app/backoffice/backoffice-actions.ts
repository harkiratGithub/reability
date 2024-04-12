import { NgRedux } from '@angular-redux/store';
import { Injectable } from '@angular/core';
import { Action } from 'redux';

import { IUserFilters } from '../../types';
import { Tabs } from './backoffice-constants';
import { IBackOfficeState } from './backoffice-schema';

export interface IBackOfficeAction extends Action {
  payload: any;
}

@Injectable()
export class BackOfficeActions {
  static SET_ENTITY_TYPE = 'SET_ENTITY_TYPE';
  static SET_LAST_PATIENT_ID = 'SET_LAST_PATIENT_ID';
  static SET_ENTITY_ID = 'SET_ENTITY_ID';
  static SET_USER_FILTER = 'SET_USER_FILTER';

  constructor(private ngRedux: NgRedux<IBackOfficeState>) {}

  setEntityType = (entityType: Tabs) => {
    this.ngRedux.dispatch({
      type: BackOfficeActions.SET_ENTITY_TYPE,
      payload: entityType,
    });
  };

  setEntityId = (entityId: number) => {
    this.ngRedux.dispatch({
      type: BackOfficeActions.SET_ENTITY_ID,
      payload: entityId,
    });
  };

  setLastPatientId = (lastPatientId: number) => {
    this.ngRedux.dispatch({
      type: BackOfficeActions.SET_LAST_PATIENT_ID,
      payload: lastPatientId,
    });
  };

  setUserFilter = (userFilter: Partial<IUserFilters>) => {
    this.ngRedux.dispatch({
      type: BackOfficeActions.SET_USER_FILTER,
      payload: userFilter,
    });
  };
}
